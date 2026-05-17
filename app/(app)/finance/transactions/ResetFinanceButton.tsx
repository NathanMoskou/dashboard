"use client"
import { useState, useTransition } from "react"
import { Trash2, Loader2, AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"
import { deleteAllTransactions } from "../actions"

export function ResetFinanceButton() {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function wipe() {
    setError(null)
    start(async () => {
      const r = await deleteAllTransactions()
      if (!r.ok) setError(r.error ?? "Onbekende fout")
      else {
        setConfirm(false)
        router.refresh()
      }
    })
  }

  if (confirm) {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-2 rounded-xl bg-bad/10 px-3 py-2.5 text-sm text-bad">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>
            Je staat op het punt <strong>alle</strong> transacties permanent te verwijderen.
            Dit kan niet ongedaan worden.
          </span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={wipe}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-full bg-bad text-white px-4 py-1.5 text-sm font-semibold transition-all duration-200 ease-[var(--ease-spring)] active:scale-[0.96] hover:opacity-90 disabled:opacity-60"
          >
            {pending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            Ja, verwijder alles
          </button>
          <button
            type="button"
            onClick={() => setConfirm(false)}
            disabled={pending}
            className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-muted-fg transition-all duration-200 ease-[var(--ease-spring)] hover:text-fg hover:bg-muted active:scale-[0.96]"
          >
            Annuleer
          </button>
        </div>
        {error ? <p className="text-xs text-bad">{error}</p> : null}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setConfirm(true)}
      className="inline-flex items-center gap-1.5 rounded-full border border-bad/40 text-bad px-4 py-1.5 text-sm font-medium transition-all duration-200 ease-[var(--ease-spring)] active:scale-[0.96] hover:bg-bad/10"
    >
      <Trash2 size={13} />
      Verwijder alle transacties
    </button>
  )
}
