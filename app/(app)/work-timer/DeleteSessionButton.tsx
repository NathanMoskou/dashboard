"use client"
import { useTransition } from "react"
import { Trash2, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { deleteWorkSession } from "./actions"

export function DeleteSessionButton({ id }: { id: string }) {
  const [pending, start] = useTransition()
  const router = useRouter()
  return (
    <button
      onClick={() => {
        if (!confirm("Verwijder deze sessie? (alleen lokaal — Notion entry blijft staan)")) return
        start(async () => {
          await deleteWorkSession(id)
          router.refresh()
        })
      }}
      disabled={pending}
      className="p-1 text-muted-fg opacity-0 group-hover:opacity-100 hover:text-bad transition-opacity"
      title="Verwijder"
    >
      {pending ? <Loader2 className="animate-spin" size={13} /> : <Trash2 size={13} />}
    </button>
  )
}
