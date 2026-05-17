"use client"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Command } from "cmdk"
import {
  Home, CheckSquare, Timer, Clock3, Wallet, NotebookPen, Settings,
  Search, Sparkles, Sunrise, Coffee, BookOpen, Receipt, Pencil, Moon, Sun, Download,
} from "lucide-react"

type Action = {
  id: string
  label: string
  hint?: string
  group: "Navigatie" | "Acties" | "Weergave"
  icon: React.ComponentType<{ size?: number; className?: string }>
  shortcut?: string
  run: () => void
}

export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  // Global keyboard shortcut (cmd/ctrl + K). Also listens for a custom
  // window event so the mobile "+" sheet can open the palette without
  // importing this component directly.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((v) => !v)
      } else if (e.key === "Escape") {
        setOpen(false)
      }
    }
    const openHandler = () => setOpen(true)
    document.addEventListener("keydown", onKey)
    window.addEventListener("lifeos:open-command-palette", openHandler)
    return () => {
      document.removeEventListener("keydown", onKey)
      window.removeEventListener("lifeos:open-command-palette", openHandler)
    }
  }, [])

  const go = useCallback(
    (href: string) => () => {
      router.push(href)
      setOpen(false)
    },
    [router],
  )

  const toggleTheme = useCallback(() => {
    const html = document.documentElement
    const next = html.classList.contains("dark") ? "light" : "dark"
    html.classList.toggle("dark", next === "dark")
    try { localStorage.setItem("theme", next) } catch {}
    setOpen(false)
  }, [])

  const actions: Action[] = [
    { id: "go-today",      label: "Vandaag",          group: "Navigatie", icon: Home,        run: go("/today") },
    { id: "go-habits",     label: "Habits",           group: "Navigatie", icon: CheckSquare, run: go("/habits") },
    { id: "go-focus",      label: "Focus",            group: "Navigatie", icon: Timer,       run: go("/focus") },
    { id: "go-work",       label: "Work Timer",       group: "Navigatie", icon: Clock3,      run: go("/work-timer") },
    { id: "go-finance",    label: "Finance",          group: "Navigatie", icon: Wallet,      run: go("/finance") },
    { id: "go-reflection", label: "Reflection",       group: "Navigatie", icon: NotebookPen, run: go("/reflection") },
    { id: "go-settings",   label: "Settings",         group: "Navigatie", icon: Settings,    run: go("/settings") },

    { id: "act-new-habit",  label: "Nieuwe habit",       hint: "Naar Habits beheren", group: "Acties", icon: Pencil,   run: go("/habits/manage") },
    { id: "act-start-focus", label: "Start focus",       hint: "Naar Focus",          group: "Acties", icon: Coffee,   run: go("/focus") },
    { id: "act-journal",    label: "Journaal entry",     hint: "Naar Reflection",     group: "Acties", icon: BookOpen, run: go("/reflection") },
    { id: "act-import",     label: "Transacties import", hint: "CSV upload",          group: "Acties", icon: Receipt,  run: go("/finance/import") },
    { id: "act-heatmap",    label: "Habits heatmap",                                   group: "Acties", icon: Sparkles, run: go("/habits/heatmap") },
    { id: "act-export",     label: "Exporteer al je data",   hint: "Download JSON",   group: "Acties", icon: Download, run: () => { window.location.href = "/api/export" } },
    { id: "act-morning",    label: "Morgenroutines",                                   group: "Acties", icon: Sunrise,  run: go("/today") },

    { id: "view-theme",   label: "Wissel thema (donker / licht)",         group: "Weergave", icon: Moon, run: toggleTheme },
  ]

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[3px] flex items-start justify-center p-4 pt-[12vh]"
          onClick={() => setOpen(false)}
        >
          <Command
            className="w-full max-w-[560px] rounded-2xl bg-card shadow-2xl border border-border overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            label="Snelle acties"
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Search size={16} className="text-muted-fg" />
              <Command.Input
                placeholder="Zoek acties of pagina&apos;s…"
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-fg"
              />
              <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-fg">
                ESC
              </kbd>
            </div>
            <Command.List className="max-h-[60vh] overflow-y-auto p-2">
              <Command.Empty className="py-8 text-center text-sm text-muted-fg">
                Niets gevonden.
              </Command.Empty>
              {(["Navigatie", "Acties", "Weergave"] as const).map((group) => (
                <Command.Group
                  key={group}
                  heading={
                    <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted-fg">
                      {group}
                    </div>
                  }
                >
                  {actions
                    .filter((a) => a.group === group)
                    .map((a) => {
                      const Icon = a.icon
                      return (
                        <Command.Item
                          key={a.id}
                          value={`${a.label} ${a.hint ?? ""}`}
                          onSelect={a.run}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm transition-colors data-[selected=true]:bg-muted/70 hover:bg-muted/50"
                        >
                          <Icon size={15} className="text-muted-fg shrink-0" />
                          <span className="flex-1">{a.label}</span>
                          {a.hint ? (
                            <span className="text-[11px] text-muted-fg">{a.hint}</span>
                          ) : null}
                        </Command.Item>
                      )
                    })}
                </Command.Group>
              ))}
            </Command.List>
            <div className="px-4 py-2 border-t border-border bg-bg-2/40 text-[10px] text-muted-fg flex items-center justify-between">
              <span>Tip: <kbd className="font-medium">{typeof navigator !== "undefined" && navigator.platform.includes("Mac") ? "⌘" : "Ctrl"}+K</kbd> om te openen</span>
              <span className="flex items-center gap-1"><Sun size={10} /> Ook beschikbaar via &ldquo;+&rdquo; op mobiel</span>
            </div>
          </Command>
        </div>
      ) : null}
    </>
  )
}
