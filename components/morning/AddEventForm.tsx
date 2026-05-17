"use client"
import { useState, useTransition } from "react"
import { Plus, Loader2, Check } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input, Label } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { addManualEvent } from "@/app/(app)/focus/actions"
import { useRouter } from "next/navigation"

export function AddEventForm({ defaultOffset }: { defaultOffset: 0 | 1 }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Plus size={14} /> Afspraak
      </Button>
    )
  }

  const today = new Date()
  today.setDate(today.getDate() + defaultOffset)
  const defaultDate = today.toISOString().split("T")[0]

  return (
    <Card className="p-3 mt-2 max-w-md">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          start(async () => {
            const r = await addManualEvent({
              summary: String(fd.get("summary")),
              date: String(fd.get("date")),
              startTime: String(fd.get("startTime")),
              endTime: String(fd.get("endTime")),
            })
            if (r.ok) {
              setOpen(false)
              router.refresh()
            }
          })
        }}
        className="space-y-2"
      >
        <Input name="summary" placeholder="Titel" required />
        <div className="grid grid-cols-3 gap-2">
          <Input name="date" type="date" defaultValue={defaultDate} required />
          <Input name="startTime" type="time" required defaultValue="10:00" />
          <Input name="endTime" type="time" required defaultValue="11:00" />
        </div>
        <div className="flex gap-2">
          <Button size="sm" type="submit" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
            Toevoegen
          </Button>
          <Button size="sm" type="button" variant="ghost" onClick={() => setOpen(false)}>
            Annuleer
          </Button>
        </div>
      </form>
    </Card>
  )
}
