"use client"
import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input, Label } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { saveRestConfig } from "./actions"

type Cfg = {
  compound_low_reps_s: number | null
  compound_mid_reps_s: number | null
  compound_high_reps_s: number | null
  isolation_low_reps_s: number | null
  isolation_mid_reps_s: number | null
  isolation_high_reps_s: number | null
  early_rise_threshold: string | null
  deep_work_daily_goal_h: number | null
  billable_weekly_goal_h: number | null
}

export function AdvancedSettings({ cfg }: { cfg: Cfg }) {
  const [open, setOpen] = useState(false)
  return (
    <Card>
      <CardHeader>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between"
        >
          <CardTitle className="flex items-center gap-2">
            {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            Geavanceerd
          </CardTitle>
          <span className="text-xs text-muted-fg">
            doelen + gym rust-tijden + vroeg-opstaan drempel
          </span>
        </button>
      </CardHeader>
      {open ? (
        <CardContent>
          <form action={saveRestConfig} className="grid gap-3 md:grid-cols-3">
            <div>
              <Label>Deep Work dagdoel (uren)</Label>
              <Input
                name="deep_work_daily_goal_h"
                type="number"
                step="0.5"
                defaultValue={cfg.deep_work_daily_goal_h ?? 4}
              />
            </div>
            <div>
              <Label>Billable weekdoel (uren)</Label>
              <Input
                name="billable_weekly_goal_h"
                type="number"
                step="0.5"
                defaultValue={cfg.billable_weekly_goal_h ?? 20}
              />
            </div>
            <div>
              <Label>Vroeg-opstaan drempel</Label>
              <Input
                name="early_rise_threshold"
                type="time"
                defaultValue={cfg.early_rise_threshold ?? "07:30"}
              />
            </div>
            <div className="md:col-span-3 pt-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-fg mb-2">
                Gym rust-tijden (sec)
              </div>
            </div>
            <Field label="Compound · 1–5" name="compound_low_reps_s" v={cfg.compound_low_reps_s ?? 240} />
            <Field label="Compound · 6–10" name="compound_mid_reps_s" v={cfg.compound_mid_reps_s ?? 180} />
            <Field label="Compound · 11+" name="compound_high_reps_s" v={cfg.compound_high_reps_s ?? 120} />
            <Field label="Isolation · 1–5" name="isolation_low_reps_s" v={cfg.isolation_low_reps_s ?? 120} />
            <Field label="Isolation · 6–10" name="isolation_mid_reps_s" v={cfg.isolation_mid_reps_s ?? 90} />
            <Field label="Isolation · 11+" name="isolation_high_reps_s" v={cfg.isolation_high_reps_s ?? 60} />
            <div className="md:col-span-3">
              <Button type="submit">Opslaan</Button>
            </div>
          </form>
        </CardContent>
      ) : null}
    </Card>
  )
}

function Field({ label, name, v }: { label: string; name: string; v: number }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input name={name} type="number" defaultValue={v} />
    </div>
  )
}
