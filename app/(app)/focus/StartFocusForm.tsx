"use client"
import { useState, useTransition } from "react"
import { Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input, Label } from "@/components/ui/input"
import { startFocus } from "./actions"
import type { NotionTask } from "@/lib/notion"

export function StartFocusForm({
  clients,
  tasks,
}: {
  clients: { id: string; name: string }[]
  tasks: NotionTask[]
}) {
  const [pending, start] = useTransition()
  const [type, setType] = useState<"deep_work" | "shallow" | "meeting">("deep_work")
  const [isBillable, setIsBillable] = useState(false)
  const [clientId, setClientId] = useState<string>("")
  const [taskDesc, setTaskDesc] = useState<string>("")
  const [notionId, setNotionId] = useState<string>("")

  function go() {
    if (!taskDesc) return
    start(() =>
      startFocus({
        type,
        isBillable,
        clientId: clientId || null,
        task: taskDesc,
        notionTaskId: notionId || null,
      }),
    )
  }

  return (
    <div className="space-y-3">
      {tasks.length > 0 ? (
        <div>
          <Label>Notion-taak</Label>
          <select
            value={notionId}
            onChange={(e) => {
              setNotionId(e.target.value)
              const t = tasks.find((x) => x.id === e.target.value)
              if (t) setTaskDesc(t.title)
            }}
            className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
          >
            <option value="">— vrij invoeren —</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div>
        <Label>Taak</Label>
        <Input
          value={taskDesc}
          onChange={(e) => setTaskDesc(e.target.value)}
          placeholder="bv. Factuur PGS schrijven"
        />
      </div>

      <div>
        <Label>Type</Label>
        <div className="flex gap-2">
          {(["deep_work", "shallow", "meeting"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`rounded-full border px-3 py-1.5 text-xs ${
                type === t ? "border-fg bg-fg text-bg" : "border-border text-muted-fg"
              }`}
            >
              {t.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isBillable}
          onChange={(e) => setIsBillable(e.target.checked)}
        />
        Billable
      </label>

      {isBillable ? (
        <div>
          <Label>Klant</Label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
          >
            <option value="">— kies klant —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <Button onClick={go} disabled={pending || !taskDesc} className="w-full">
        <Play size={16} /> Start sessie
      </Button>
    </div>
  )
}
