"use client"
import { useState, useTransition } from "react"
import {
  Inbox,
  Forward as ForwardIcon,
  ExternalLink,
  Clock,
  Loader2,
  Trash2,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  taskFromEmail,
  snoozeEmail,
  skipEmail,
  skipEmails,
} from "@/app/(app)/focus/actions"

export type TriagedEmail = {
  threadId: string
  fromName: string
  fromEmail: string
  replyTo: string | null
  subject: string
  snippet: string
  isForwarded: boolean
  originalSender: string | null
  receivedAt: string
  priority: 1 | 2 | 3 | "skip"
  action: string
  inferredProject: string
}

const BUTTONS = [
  { ui: "Vandaag", label: "Vandaag" },
  { ui: "Morgen", label: "Morgen" },
  { ui: "Deze week", label: "Deze week" },
  { ui: "Binnenkort", label: "Binnenkort" },
] as const

export function InboxTriage({ emails: initialEmails }: { emails: TriagedEmail[] }) {
  const [emails, setEmails] = useState(initialEmails)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [pending, start] = useTransition()

  // sort: P1 > P2 > P3 > SKIP
  const order = (p: TriagedEmail["priority"]) =>
    p === 1 ? 0 : p === 2 ? 1 : p === 3 ? 2 : 3
  const sorted = [...emails].sort((a, b) => order(a.priority) - order(b.priority))

  function removeFromList(ids: string[]) {
    setEmails((prev) => prev.filter((e) => !ids.includes(e.threadId)))
    setSelected((prev) => {
      const next = new Set(prev)
      for (const id of ids) next.delete(id)
      return next
    })
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    if (selected.size === sorted.length) setSelected(new Set())
    else setSelected(new Set(sorted.map((e) => e.threadId)))
  }

  function batchHide() {
    const ids = [...selected]
    if (!ids.length) return
    removeFromList(ids)
    start(async () => {
      await skipEmails(ids)
    })
  }

  if (!emails.length) {
    return (
      <section>
        <div className="flex items-center gap-2 text-sm font-semibold mb-2">
          <Inbox size={16} /> Inbox triage
        </div>
        <Card className="p-4 text-sm text-muted-fg">
          Inbox leeg.
        </Card>
      </section>
    )
  }

  return (
    <section>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Inbox size={16} /> Inbox triage
          <span className="text-xs font-normal text-muted-fg">
            · {emails.length} threads
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={selectAll}
            className="text-[11px] text-muted-fg hover:text-fg underline-offset-4 hover:underline"
          >
            {selected.size === sorted.length ? "Selectie wissen" : "Selecteer alle"}
          </button>
          {selected.size > 0 ? (
            <Button size="sm" variant="destructive" onClick={batchHide} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" size={13} /> : <Trash2 size={13} />}
              Verberg ({selected.size})
            </Button>
          ) : null}
        </div>
      </div>
      <div className="space-y-2">
        {sorted.map((e) => (
          <EmailRow
            key={e.threadId}
            email={e}
            checked={selected.has(e.threadId)}
            onToggleSelect={() => toggleSelect(e.threadId)}
            onRemove={() => removeFromList([e.threadId])}
          />
        ))}
      </div>
    </section>
  )
}

function EmailRow({
  email,
  checked,
  onToggleSelect,
  onRemove,
}: {
  email: TriagedEmail
  checked: boolean
  onToggleSelect: () => void
  onRemove: () => void
}) {
  const [pending, start] = useTransition()

  const prioBadge =
    email.priority === 1 ? <Badge variant="bad">P1</Badge>
    : email.priority === 2 ? <Badge variant="warn">P2</Badge>
    : email.priority === 3 ? <Badge variant="good">P3</Badge>
    : <Badge variant="outline">SKIP</Badge>

  function toBucket(bucket: string) {
    onRemove()
    start(async () => {
      await taskFromEmail({
        threadId: email.threadId,
        subject: email.subject,
        bucket,
        project: email.inferredProject,
        priority:
          email.priority === 1 ? "Prio 1"
          : email.priority === 2 ? "Prio 2"
          : email.priority === 3 ? "Prio 3"
          : null,
        body: email.snippet || null,
      })
    })
  }

  function snooze() {
    onRemove()
    start(async () => {
      await snoozeEmail(email.threadId)
    })
  }

  function skip() {
    onRemove()
    start(async () => {
      await skipEmail(email.threadId)
    })
  }

  return (
    <Card className={`p-3 ${email.priority === "skip" ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggleSelect}
          className="mt-1 shrink-0 accent-fg"
          aria-label="Selecteer"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-muted-fg mb-1 flex-wrap">
            {prioBadge}
            <span className="truncate min-w-0">
              <span className="text-fg font-medium">
                {email.fromName || email.fromEmail}
              </span>
              {email.fromName ? <span> &lt;{email.fromEmail}&gt;</span> : null}
            </span>
            {email.isForwarded ? (
              <Badge variant="outline" className="text-[9px]">
                <ForwardIcon size={9} />FWD
              </Badge>
            ) : null}
          </div>
          <div className="text-sm font-medium leading-tight truncate">
            {email.subject}
          </div>
          {email.isForwarded && email.originalSender ? (
            <div className="text-[10px] text-muted-fg mt-0.5">
              via {email.originalSender}
            </div>
          ) : null}
          <p className="mt-1.5 text-xs text-muted-fg line-clamp-2">{email.snippet}</p>
          {email.priority !== "skip" ? (
            <p className="mt-1 text-[11px] italic text-fg/80">→ {email.action}</p>
          ) : null}
        </div>
        <a
          href={`https://mail.google.com/mail/u/0/#inbox/${email.threadId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 p-1 text-muted-fg hover:text-fg"
          title="Open in Gmail"
        >
          <ExternalLink size={14} />
        </a>
      </div>
      <div className="mt-2 flex flex-wrap gap-1 pl-6">
        {BUTTONS.map((b) => (
          <button
            key={b.ui}
            disabled={pending}
            onClick={() => toBucket(b.ui)}
            className="rounded-full border border-border px-2.5 py-0.5 text-[10px] hover:bg-muted disabled:opacity-50"
          >
            {b.label}
          </button>
        ))}
        <button
          disabled={pending}
          onClick={snooze}
          className="rounded-full border border-border px-2.5 py-0.5 text-[10px] hover:bg-muted disabled:opacity-50 inline-flex items-center gap-1"
          title="Morgen 06:00 weer tonen"
        >
          <Clock size={10} /> Snooze
        </button>
        <button
          disabled={pending}
          onClick={skip}
          className="rounded-full border border-border px-2.5 py-0.5 text-[10px] hover:bg-muted disabled:opacity-50"
          title="Verberg permanent"
        >
          ✕ Verberg
        </button>
        {pending ? <Loader2 className="animate-spin self-center" size={12} /> : null}
      </div>
    </Card>
  )
}
