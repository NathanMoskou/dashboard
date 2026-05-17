"use client"
import { useState, useTransition } from "react"
import { Plus, Loader2, Pencil, Trash2, Check, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input, Label } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { createClientRow, updateClientRow, deleteClientRow } from "./actions"
import type { WorkClientRow } from "@/lib/work-timer"

const NOTION_OPTIONS = [
  "VitalScan Nutrition",
  "Triadum Zorggroep",
  "E-Chopperz/Next-Adventure",
  "Platform Gastvrij Smallingerland",
  "TIP Drachten",
  "Het Tuintheater",
]

export function ClientManager({ clients }: { clients: WorkClientRow[] }) {
  const [adding, setAdding] = useState(false)
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Klanten</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setAdding((a) => !a)}>
          <Plus size={14} /> Nieuwe klant
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {adding ? <NewClientForm onClose={() => setAdding(false)} /> : null}
        {clients.length === 0 ? (
          <p className="text-sm text-muted-fg">
            Nog geen klanten. Klik &quot;Nieuwe klant&quot;.
          </p>
        ) : (
          clients.map((c) => <ClientRow key={c.id} client={c} />)
        )}
      </CardContent>
    </Card>
  )
}

function NewClientForm({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        setError(null)
        const fd = new FormData(e.currentTarget)
        start(async () => {
          const r = await createClientRow(fd)
          if (r.ok) {
            onClose()
            router.refresh()
          } else setError(r.error ?? "Onbekende fout")
        })
      }}
      className="rounded-md border border-border bg-muted/40 p-3 space-y-2"
    >
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        <div className="md:col-span-1">
          <Label>Naam</Label>
          <Input name="name" required placeholder="bv. Acme BV" />
        </div>
        <div>
          <Label>Uurtarief €</Label>
          <Input
            name="hourly_rate_eur"
            type="number"
            step="0.01"
            defaultValue="45"
            required
          />
        </div>
        <div>
          <Label>Notion client</Label>
          <input
            list="notion-clients"
            name="notion_client_name"
            placeholder="leeg = niet-billable"
            className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
          />
          <datalist id="notion-clients">
            {NOTION_OPTIONS.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
          Toevoegen
        </Button>
        <Button size="sm" variant="ghost" type="button" onClick={onClose}>
          Annuleer
        </Button>
        {error ? <p className="text-xs text-bad self-center">{error}</p> : null}
      </div>
    </form>
  )
}

function ClientRow({ client }: { client: WorkClientRow }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function del() {
    if (!confirm(`Verwijder klant "${client.name}"? (afgeronde sessies blijven staan)`)) return
    start(async () => {
      await deleteClientRow(client.id)
      router.refresh()
    })
  }

  if (editing) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setError(null)
          const fd = new FormData(e.currentTarget)
          start(async () => {
            const r = await updateClientRow(client.id, fd)
            if (r.ok) {
              setEditing(false)
              router.refresh()
            } else setError(r.error ?? "Onbekende fout")
          })
        }}
        className="rounded-md border border-border bg-muted/40 p-3 space-y-2"
      >
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <div>
            <Label>Naam</Label>
            <Input name="name" defaultValue={client.name} required />
          </div>
          <div>
            <Label>Uurtarief €</Label>
            <Input
              name="hourly_rate_eur"
              type="number"
              step="0.01"
              defaultValue={client.hourly_rate_eur}
              required
            />
          </div>
          <div className="md:col-span-2">
            <Label>Notion client</Label>
            <input
              list="notion-clients-edit"
              name="notion_client_name"
              defaultValue={client.notion_client_name ?? ""}
              placeholder="leeg = niet-billable"
              className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
            />
            <datalist id="notion-clients-edit">
              {NOTION_OPTIONS.map((o) => (
                <option key={o} value={o} />
              ))}
            </datalist>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_active" defaultChecked={client.is_active} />
          Actief
        </label>
        <div className="flex gap-2">
          <Button size="sm" type="submit" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
            Opslaan
          </Button>
          <Button size="sm" variant="ghost" type="button" onClick={() => setEditing(false)}>
            <X size={14} /> Annuleer
          </Button>
          {error ? <p className="text-xs text-bad self-center">{error}</p> : null}
        </div>
      </form>
    )
  }

  return (
    <div className="flex items-center justify-between rounded-md border border-border p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{client.name}</span>
          {!client.is_active ? <Badge variant="outline">inactief</Badge> : null}
          {!client.notion_client_name ? (
            <Badge variant="outline">geen Notion-mapping</Badge>
          ) : null}
        </div>
        <div className="text-xs text-muted-fg mt-0.5">
          €{client.hourly_rate_eur}/u
          {client.notion_client_name ? (
            <> · Notion: {client.notion_client_name}</>
          ) : null}
        </div>
      </div>
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)} disabled={pending}>
          <Pencil size={13} />
        </Button>
        <Button size="sm" variant="ghost" onClick={del} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" size={13} /> : <Trash2 size={13} />}
        </Button>
      </div>
    </div>
  )
}
