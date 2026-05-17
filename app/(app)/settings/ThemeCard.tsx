"use client"
import { useState, useTransition } from "react"
import { Sun, Moon, Monitor, Clock, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { saveThemePrefs } from "./actions"

type Mode = "light" | "dark" | "system" | "auto-time"

const MODES: { value: Mode; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { value: "light", label: "Licht", icon: Sun },
  { value: "dark", label: "Donker", icon: Moon },
  { value: "system", label: "Systeem", icon: Monitor },
  { value: "auto-time", label: "Op tijd", icon: Clock },
]

export function ThemeCard({
  initialMode,
  initialDarkStart,
  initialDarkEnd,
}: {
  initialMode: Mode
  initialDarkStart: number
  initialDarkEnd: number
}) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [start, setStart] = useState<number>(initialDarkStart)
  const [end, setEnd] = useState<number>(initialDarkEnd)
  const [pending, startTransition] = useTransition()
  const [savedAt, setSavedAt] = useState<number | null>(null)

  function save() {
    const fd = new FormData()
    fd.set("theme", mode)
    fd.set("dark_start_hour", String(start))
    fd.set("dark_end_hour", String(end))
    startTransition(async () => {
      await saveThemePrefs(fd)
      // Persist immediately to localStorage so the inline init script picks
      // it up on the next paint. The ThemeController does this too once the
      // server-rendered prop changes, but doing it here means the user gets
      // instant feedback even before the round-trip lands.
      try {
        localStorage.setItem("theme.mode", mode)
        localStorage.setItem("theme.darkStart", String(start))
        localStorage.setItem("theme.darkEnd", String(end))
      } catch {}
      setSavedAt(Date.now())
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Moon size={15} className="text-muted-fg" />
          Thema
        </CardTitle>
        <CardDescription>
          Licht, donker, of laat het automatisch wisselen tussen jouw eigen
          uren — bv. donker vanaf 21:00 tot 06:00.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-4 gap-2">
          {MODES.map((m) => {
            const Icon = m.icon
            const active = mode === m.value
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => setMode(m.value)}
                className={
                  "flex flex-col items-center gap-1 rounded-xl border p-3 text-xs font-medium transition-all duration-200 ease-[var(--ease-spring)] active:scale-[0.96] " +
                  (active
                    ? "border-fg bg-fg text-bg"
                    : "border-border bg-card hover:bg-muted/60")
                }
              >
                <Icon size={16} />
                {m.label}
              </button>
            )
          })}
        </div>

        {mode === "auto-time" ? (
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11px] uppercase tracking-wider text-muted-fg">Donker vanaf</span>
              <select
                value={start}
                onChange={(e) => setStart(Number(e.target.value))}
                className="mt-1 h-10 w-full rounded-md border border-border bg-card px-2 text-sm"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {String(i).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] uppercase tracking-wider text-muted-fg">Tot</span>
              <select
                value={end}
                onChange={(e) => setEnd(Number(e.target.value))}
                className="mt-1 h-10 w-full rounded-md border border-border bg-card px-2 text-sm"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {String(i).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        <div className="flex items-center gap-3">
          <Button type="button" size="sm" onClick={save} disabled={pending}>
            {pending ? <Loader2 size={14} className="animate-spin" /> : null}
            Bewaar
          </Button>
          {savedAt ? (
            <span className="text-[11px] text-muted-fg">
              Opgeslagen
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
