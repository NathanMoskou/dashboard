import "server-only"
import { getGoogleAccessToken } from "@/lib/google"

export type GmailThread = {
  threadId: string
  msgId: string
  fromName: string
  fromEmail: string
  replyTo: string | null
  subject: string
  snippet: string
  body: string
  isForwarded: boolean
  originalSender: string | null
  receivedAt: string
}

type GmailHeader = { name?: string; value?: string }
type GmailPart = {
  partId?: string
  mimeType?: string
  headers?: GmailHeader[]
  body?: { data?: string; size?: number }
  parts?: GmailPart[]
}
type GmailMessage = {
  id: string
  threadId: string
  internalDate?: string
  payload: GmailPart
  snippet?: string
}

const ENDPOINT = "https://gmail.googleapis.com/gmail/v1"

function header(parts: GmailHeader[] | undefined, name: string): string {
  if (!parts) return ""
  return parts.find((h) => h?.name?.toLowerCase() === name.toLowerCase())?.value ?? ""
}

function decodeBase64Url(s: string): string {
  try {
    const norm = s.replace(/-/g, "+").replace(/_/g, "/")
    return Buffer.from(norm, "base64").toString("utf-8")
  } catch {
    return ""
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/(p|div|br|li|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[\t \xA0]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim()
}

/** Recursively walk the payload looking for the most readable body. */
function extractBody(payload: GmailPart): string {
  if (payload.body?.data) return decodeBase64Url(payload.body.data)
  if (payload.parts) {
    for (const p of payload.parts) {
      if (p.mimeType === "text/plain" && p.body?.data) return decodeBase64Url(p.body.data)
    }
    for (const p of payload.parts) {
      if (p.mimeType === "text/html" && p.body?.data) {
        return stripHtml(decodeBase64Url(p.body.data))
      }
    }
    for (const p of payload.parts) {
      const nested = extractBody(p)
      if (nested) return nested
    }
  }
  return ""
}

function parseFrom(raw: string): { name: string; email: string } {
  if (!raw) return { name: "", email: "" }
  const m = raw.match(/^(.*?)\s*<([^>]+)>$/)
  if (m) return { name: m[1].replace(/^"|"$/g, "").trim(), email: m[2].trim() }
  return { name: "", email: raw.trim() }
}

/** Find original sender for a forwarded mail. Heuristic. */
function detectForwarded(subject: string, body: string): string | null {
  if (!/^(fwd|fw):/i.test(subject) && !/begin forwarded message|forwarded message|---{2,}\s*Forwarded/i.test(body)) {
    return null
  }
  const m =
    body.match(/^From:\s*(.+?)(?:\r?\n|$)/im) ||
    body.match(/^Van:\s*(.+?)(?:\r?\n|$)/im) ||
    body.match(/<([^>\s]+@[^>\s]+)>/)
  if (!m) return null
  const v = m[1] ?? m[0]
  const parsed = parseFrom(v)
  return parsed.email || null
}

async function gmail<T>(token: string, path: string): Promise<T | null> {
  try {
    const r = await fetch(`${ENDPOINT}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!r.ok) return null
    return (await r.json()) as T
  } catch {
    return null
  }
}

export async function fetchRecentThreads(hoursBack = 48, maxResults = 25): Promise<GmailThread[]> {
  const token = await getGoogleAccessToken()
  if (!token) return []
  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000)
  const y = since.getUTCFullYear()
  const m = String(since.getUTCMonth() + 1).padStart(2, "0")
  const d = String(since.getUTCDate()).padStart(2, "0")
  const q = encodeURIComponent(
    `after:${y}/${m}/${d} -in:promotions -category:promotions -category:social -category:forums`,
  )
  const list = await gmail<{ threads?: { id: string }[] }>(
    token,
    `/users/me/threads?maxResults=${maxResults}&q=${q}`,
  )
  if (!list?.threads) return []

  const threads: GmailThread[] = []
  // Sequential to respect rate limits (Gmail allows more than Notion but be polite)
  for (const t of list.threads) {
    const full = await gmail<{ id: string; messages: GmailMessage[] }>(
      token,
      `/users/me/threads/${t.id}?format=full`,
    )
    if (!full?.messages?.length) continue
    const msg = full.messages[full.messages.length - 1] // latest message
    const from = parseFrom(header(msg.payload.headers, "From"))
    const replyTo = parseFrom(header(msg.payload.headers, "Reply-To")).email || null
    const subject = header(msg.payload.headers, "Subject")
    const body = extractBody(msg.payload).slice(0, 2000)
    const original = detectForwarded(subject, body)
    threads.push({
      threadId: full.id,
      msgId: msg.id,
      fromName: from.name,
      fromEmail: from.email,
      replyTo,
      subject,
      snippet: (msg.snippet ?? body).slice(0, 280),
      body,
      isForwarded: !!original,
      originalSender: original,
      receivedAt: msg.internalDate
        ? new Date(parseInt(msg.internalDate, 10)).toISOString()
        : new Date().toISOString(),
    })
  }
  return threads
}
