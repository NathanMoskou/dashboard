"use client"
import { useState, useTransition } from "react"
import { Loader2, Check, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Input, Label } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { saveHealthEntry } from "./actions"

export function ManualEntryForm({ today }: { today: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Plus size={14} /> Handmatige entry
      </Button>
    )
  }

  return (
    <Card className="p-3 mb-4">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setMsg(null)
          const fd = new FormData(e.currentTarget)
          const num = (k: string) => {
            const v = fd.get(k)
            const n = v == null || v === "" ? null : Number(v)
            return Number.isFinite(n) ? n : null
          }
          start(async () => {
            const r = await saveHealthEntry({
              date: String(fd.get("date")),
              weight_kg: num("weight_kg"),
              sleep_duration_min: num("sleep_hours") != null ? num("sleep_hours")! * 60 : null,
              sleep_score: num("sleep_score"),
              hrv_ms: num("hrv_ms"),
              resting_heart_rate: num("resting_heart_rate"),
              steps: num("steps"),
              active_calories_kcal: num("active_calories_kcal"),
              vo2_max: num("vo2_max"),
              body_fat_pct: num("body_fat_pct"),
              systolic_bp: num("systolic_bp"),
              diastolic_bp: num("diastolic_bp"),
              mood: num("mood"),
            })
            if (r.ok) {
              setMsg(`Bewaard. Readiness: ${r.readiness_score}/100`)
              ;(e.target as HTMLFormElement).reset()
              router.refresh()
            } else {
              setMsg(`Fout: ${r.error}`)
            }
          })
        }}
        className="space-y-2"
      >
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Field label="Datum" name="date" type="date" defaultValue={today} required />
          <Field label="Gewicht (kg)" name="weight_kg" type="number" step="0.1" />
          <Field label="Slaap (uur)" name="sleep_hours" type="number" step="0.1" />
          <Field label="Sleep score" name="sleep_score" type="number" min="0" max="100" />
          <Field label="HRV (ms)" name="hrv_ms" type="number" step="0.1" />
          <Field label="Rusthartslag" name="resting_heart_rate" type="number" />
          <Field label="Stappen" name="steps" type="number" />
          <Field label="Active kcal" name="active_calories_kcal" type="number" />
          <Field label="VO2 max" name="vo2_max" type="number" step="0.1" />
          <Field label="Vetpercentage" name="body_fat_pct" type="number" step="0.1" />
          <Field label="Systolisch" name="systolic_bp" type="number" />
          <Field label="Diastolisch" name="diastolic_bp" type="number" />
          <div>
            <Label className="text-xs">Stemming (1-5)</Label>
            <select
              name="mood"
              className="h-10 w-full rounded-md border border-border bg-card px-2 text-sm"
              defaultValue=""
            >
              <option value="">—</option>
              <option value="1">1 — slecht</option>
              <option value="2">2</option>
              <option value="3">3 — neutraal</option>
              <option value="4">4</option>
              <option value="5">5 — top</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
            Bewaar
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
            Sluit
          </Button>
          {msg ? <p className="text-xs self-center text-muted-fg">{msg}</p> : null}
        </div>
        <p className="text-[11px] text-muted-fg">
          Lege velden blijven onveranderd; alleen meegestuurde waardes worden bijgewerkt.
        </p>
      </form>
    </Card>
  )
}

function Field({
  label,
  name,
  type,
  step,
  min,
  max,
  defaultValue,
  required,
}: {
  label: string
  name: string
  type: string
  step?: string
  min?: string
  max?: string
  defaultValue?: string
  required?: boolean
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        name={name}
        type={type}
        step={step}
        min={min}
        max={max}
        defaultValue={defaultValue}
        required={required}
      />
    </div>
  )
}
