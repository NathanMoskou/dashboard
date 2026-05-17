"use client"
import { useState, useTransition } from "react"
import { RefreshCw, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { retryNotionSync } from "./actions"

export function SyncRetryButton({ id }: { id: string }) {
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const router = useRouter()

  return (
    <span className="inline-flex items-center gap-1">
      <button
        onClick={() => {
          setErr(null)
          start(async () => {
            const r = await retryNotionSync(id)
            if (r.ok) router.refresh()
            else setErr(r.error ?? "mislukt")
          })
        }}
        disabled={pending}
        className="inline-flex items-center gap-0.5 rounded-full bg-accent-soft px-2 py-0.5 text-[9px] font-medium text-accent hover:opacity-80 transition-opacity"
        title="Opnieuw synchroniseren naar Notion"
      >
        {pending ? <Loader2 className="animate-spin" size={9} /> : <RefreshCw size={9} />}
        Sync opnieuw
      </button>
      {err ? <span className="text-[9px] text-bad">{err}</span> : null}
    </span>
  )
}
