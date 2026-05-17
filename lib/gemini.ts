import "server-only"

export type EmailTriage = {
  i: number
  priority: 1 | 2 | 3 | "skip"
  action: string
}

const MODEL = "gemini-2.5-flash"
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

export async function triageEmails(
  emails: { fromEmail: string; subject: string; snippet: string }[],
): Promise<EmailTriage[]> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || emails.length === 0) return []

  const prompt = `Triageer deze inbox voor een freelance content marketeer (klanten: PGS, TIP Drachten, Het Tuintheater, VitalScan, Next-Adventure).

Per email: priority (1=urgent vandaag, 2=deze week, 3=info-only, "skip"=newsletter/auto-rapport/notificatie). Action: korte NL actie max 6 woorden (bv. "Antwoord met offerte", "Lees en archiveer", "Plan meeting in").

Antwoord ALLEEN met een JSON-array, geen tekst eromheen, geen markdown code-blocks:
[{"i":0,"priority":1,"action":"..."},{"i":1,"priority":"skip","action":"..."}]

Emails:
${emails.map((e, i) => `${i}: from=${e.fromEmail} subject="${e.subject.replace(/"/g, "'")}" snippet="${e.snippet.replace(/"/g, "'").slice(0, 400)}"`).join("\n")}`

  try {
    const res = await fetch(`${ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1500,
          responseMimeType: "application/json",
        },
      }),
    })
    if (!res.ok) return []
    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[]
    }
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
    const cleaned = text.replace(/```json\s*|\s*```/g, "").trim()
    const parsed = JSON.parse(cleaned) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((x): x is EmailTriage => {
        if (typeof x !== "object" || !x) return false
        const o = x as Record<string, unknown>
        return typeof o.i === "number" && (typeof o.priority === "number" || o.priority === "skip") && typeof o.action === "string"
      })
      .map((x) => ({ ...x, priority: x.priority === "skip" ? "skip" : (Math.max(1, Math.min(3, Number(x.priority))) as 1 | 2 | 3) }))
  } catch {
    return []
  }
}
