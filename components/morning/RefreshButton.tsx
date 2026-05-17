"use client"
import { useTransition } from "react"
import { RefreshCw, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

export function RefreshButton() {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <button
      onClick={() => start(() => router.refresh())}
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-muted-fg hover:bg-muted hover:text-fg disabled:opacity-60"
      title="Notion + Gmail + Agenda opnieuw ophalen"
    >
      {pending ? (
        <Loader2 className="animate-spin" size={12} />
      ) : (
        <RefreshCw size={12} />
      )}
      Vernieuw
    </button>
  )
}
