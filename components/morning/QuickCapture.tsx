"use client"
import { useState, useTransition } from "react"
import { Plus, Loader2, Check } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input, Label } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { quickCapture } from "@/app/(app)/focus/actions"

const PROJECTS = ["PGS", "TIP", "Het Tuintheater", "VitalScan", "Next-Adventure", "E-Chopperz", "Persoonlijk"]
const WANNEER = ["Vandaag", "Morgen", "Deze week", "Binnenkort"]
const PRIORITIES = ["Prio 1", "Prio 2", "Prio 3"]

export function QuickCapture() {
  const [pending, start] = useTransition()
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-sm font-semibold mb-3">
        <span>⚡</span> Snel toevoegen aan Notion
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          start(async () => {
            const r = await quickCapture(fd)
            if (r?.ok) {
              setDone(true)
              setError(null)
              ;(e.target as HTMLFormElement).reset()
              setTimeout(() => setDone(false), 1500)
            } else {
              setError(r?.error ?? "Onbekende fout")
            }
          })
        }}
        className="space-y-2"
      >
        <Input name="title" placeholder="Wat moet je doen?" required />
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <select name="project" className="h-10 rounded-md border border-border bg-card px-2 text-sm">
            <option value="">— project —</option>
            {PROJECTS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <select name="wanneer" className="h-10 rounded-md border border-border bg-card px-2 text-sm" defaultValue="Vandaag">
            {WANNEER.map((w) => (
              <option key={w}>{w}</option>
            ))}
          </select>
          <select name="priority" className="h-10 rounded-md border border-border bg-card px-2 text-sm">
            <option value="">— prioriteit —</option>
            {PRIORITIES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <Input name="deadline" type="date" />
        </div>
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={pending} className="flex-1">
            {pending ? <Loader2 className="animate-spin" size={16} /> : done ? <Check size={16} /> : <Plus size={16} />}
            {pending ? "Bezig..." : done ? "Toegevoegd" : "Toevoegen"}
          </Button>
          {error ? <span className="text-xs text-bad">{error}</span> : null}
        </div>
      </form>
    </Card>
  )
}
