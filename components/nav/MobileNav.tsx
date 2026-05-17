"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Menu, X, Home, Timer, Clock3, CheckSquare, Wallet, NotebookPen, Settings,
  Plus, Pencil, Coffee, BookOpen, Search, type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/ui/ThemeToggle"

// Single source of truth for the slide-out drawer.
const NAV = [
  { href: "/today",      icon: Home,        label: "Today",      color: "#3b82f6" },
  { href: "/focus",      icon: Timer,       label: "Focus",      color: "#f97316" },
  { href: "/work-timer", icon: Clock3,      label: "Work Timer", color: "#f59e0b" },
  { href: "/habits",     icon: CheckSquare, label: "Habits",     color: "#8b5cf6" },
  { href: "/finance",    icon: Wallet,      label: "Finance",    color: "#0ea5e9" },
  { href: "/reflection", icon: NotebookPen, label: "Reflection", color: "#f43f5e" },
  { href: "/settings",   icon: Settings,    label: "Settings",   color: "#94a3b8" },
]

// Bevel-style 5-tab bottom bar — Home / Habits / [+] / Focus / Settings
const TAB_BAR_LEFT = [
  { href: "/today",  icon: Home,        label: "Today"  },
  { href: "/habits", icon: CheckSquare, label: "Habits" },
]
const TAB_BAR_RIGHT = [
  { href: "/focus",    icon: Timer,    label: "Focus"    },
  { href: "/settings", icon: Settings, label: "Settings" },
]

// Quick actions in the central "+" sheet. 6 items in a 3×2 grid so every
// page in the app is reachable in one tap from anywhere — Work Timer and
// Finance aren't in the bottom tab bar, so they live here.
// "Zoek alles" dispatches a custom event that CommandPalette listens for
// so mobile gets parity with the desktop ⌘K shortcut.
const QUICK_ACTIONS: { href?: string; icon: LucideIcon; label: string; emit?: string }[] = [
  { href: "/habits/manage",  icon: Pencil,   label: "Nieuwe habit" },
  { href: "/focus",          icon: Coffee,   label: "Start focus" },
  { href: "/work-timer",     icon: Clock3,   label: "Work Timer" },
  { href: "/reflection",     icon: BookOpen, label: "Journaal" },
  { href: "/finance",        icon: Wallet,   label: "Finance" },
  { icon: Search,            label: "Zoek alles", emit: "lifeos:open-command-palette" },
]

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const [actionSheet, setActionSheet] = useState(false)
  const [pillVisible, setPillVisible] = useState(true)
  const pathname = usePathname()
  const current = NAV.find(n => pathname === n.href || pathname.startsWith(n.href + "/"))

  // Hide the bottom bar near page-bottom (gives ~70px clearance for footer content)
  useEffect(() => {
    const container = document.querySelector("[data-scroll-main]")
    if (!container) return
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container as HTMLElement
      const distFromBottom = scrollHeight - scrollTop - clientHeight
      setPillVisible(distFromBottom > 70 || scrollHeight <= clientHeight + 8)
    }
    container.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => container.removeEventListener("scroll", onScroll)
  }, [])

  // Close sheet on route change
  useEffect(() => {
    setActionSheet(false)
    setOpen(false)
  }, [pathname])

  return (
    <>
      {/* ── Fixed top header bar — mobile only ──────────────────── */}
      <header
        className="md:hidden fixed top-0 inset-x-0 z-30 mobile-header flex items-end px-4 pb-2 bg-card/85 backdrop-blur-md border-b border-border/70"
        role="banner"
      >
        <button
          onClick={() => setOpen(true)}
          className="p-2 -ml-1 rounded-xl text-muted-fg hover:text-fg hover:bg-muted/30 transition-colors"
          aria-label="Open navigation menu"
          aria-expanded={open}
          aria-controls="mobile-drawer"
        >
          <Menu size={22} aria-hidden="true" />
        </button>

        <span
          className="flex-1 text-center text-sm font-bold tracking-tight"
          aria-live="polite"
          aria-atomic="true"
        >
          {current?.label ?? "Life OS"}
        </span>

        <ThemeToggle compact />
      </header>

      {/* ── Bevel-style 5-tab bottom bar with central "+" ───────── */}
      <nav
        aria-label="Quick navigation"
        role="navigation"
        className={cn(
          "md:hidden fixed left-1/2 z-30 -translate-x-1/2 glass-pill-pos transition-all duration-300 ease-[var(--ease-out)]",
          pillVisible ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none",
        )}
      >
        <div
          className="glass-pill flex items-center gap-1 px-2 h-[56px] rounded-full"
          style={{
            backdropFilter: "blur(28px) saturate(180%)",
            WebkitBackdropFilter: "blur(28px) saturate(180%)",
          }}
        >
          {TAB_BAR_LEFT.map(({ href, icon: Icon, label }) => (
            <TabLink key={href} href={href} Icon={Icon} label={label} pathname={pathname} />
          ))}

          {/* Central "+" — opens quick-action sheet */}
          <button
            type="button"
            onClick={() => setActionSheet(true)}
            aria-label="Snelle acties"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-fg text-bg shadow-[var(--shadow-pill)] mx-0.5 transition-all duration-200 ease-[var(--ease-spring)] active:scale-90 hover:opacity-90"
          >
            <Plus size={22} strokeWidth={2.5} />
          </button>

          {TAB_BAR_RIGHT.map(({ href, icon: Icon, label }) => (
            <TabLink key={href} href={href} Icon={Icon} label={label} pathname={pathname} />
          ))}
        </div>
      </nav>

      {/* ── Quick-action sheet ──────────────────────────────────── */}
      {actionSheet ? (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-[3px]"
            onClick={() => setActionSheet(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Snelle acties"
            className="md:hidden fixed inset-x-3 z-50 rounded-3xl bg-card shadow-2xl pb-safe overflow-hidden pop-in"
            style={{ bottom: "calc(5rem + env(safe-area-inset-bottom, 0px))" }}
          >
            <div className="grid grid-cols-3 gap-2 p-5">
              {QUICK_ACTIONS.map(({ href, icon: Icon, label, emit }) => {
                const inner = (
                  <>
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      <Icon size={20} />
                    </span>
                    <span className="text-[12px] font-medium text-muted-fg text-center px-1">
                      {label}
                    </span>
                  </>
                )
                if (emit) {
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        setActionSheet(false)
                        window.dispatchEvent(new CustomEvent(emit))
                      }}
                      className="flex flex-col items-center gap-2 rounded-2xl py-4 hover:bg-muted/60 transition-colors active:scale-[0.97]"
                    >
                      {inner}
                    </button>
                  )
                }
                return (
                  <Link
                    key={href}
                    href={href!}
                    className="flex flex-col items-center gap-2 rounded-2xl py-4 hover:bg-muted/60 transition-colors active:scale-[0.97]"
                    onClick={() => setActionSheet(false)}
                  >
                    {inner}
                  </Link>
                )
              })}
            </div>
            <button
              type="button"
              onClick={() => setActionSheet(false)}
              className="block w-full border-t border-border py-3 text-sm font-medium text-muted-fg hover:bg-muted/40 transition-colors"
            >
              Sluiten
            </button>
          </div>
        </>
      ) : null}

      {/* ── Slide-in drawer (full nav) ──────────────────────────── */}
      {open ? (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <nav
            id="mobile-drawer"
            role="navigation"
            aria-label="Main navigation"
            className="md:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-card flex flex-col shadow-2xl"
          >
            <div className="drawer-safe-top flex items-end justify-between px-5 py-5 border-b border-border">
              <div className="flex items-center gap-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.svg" alt="" width={28} height={28} className="shrink-0" aria-hidden="true" />
                <div>
                  <span className="text-base font-black tracking-tight text-fg">Life OS</span>
                  <div className="text-[9px] text-muted-fg font-semibold uppercase tracking-[0.08em]">
                    Dashboard
                  </div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-muted-fg hover:text-fg transition-colors"
                aria-label="Close navigation menu"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <ul className="flex-1 overflow-y-auto p-3 space-y-0.5" role="list">
              {NAV.map(({ href, icon: Icon, label, color }) => {
                const active = pathname === href || pathname.startsWith(href + "/")
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors",
                        active ? "font-semibold" : "text-muted-fg font-medium hover:text-fg hover:bg-muted/40",
                      )}
                      style={active ? { background: `${color}18`, color } : undefined}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon size={17} strokeWidth={active ? 2.5 : 1.75} aria-hidden="true" />
                      {label}
                    </Link>
                  </li>
                )
              })}
            </ul>

            <div className="p-3 border-t border-border space-y-0.5 pb-safe">
              <ThemeToggle />
            </div>
          </nav>
        </>
      ) : null}
    </>
  )
}

function TabLink({
  href,
  Icon,
  label,
  pathname,
}: {
  href: string
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>
  label: string
  pathname: string
}) {
  const active = pathname === href || pathname.startsWith(href + "/")
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 ease-[var(--ease-spring)] active:scale-90",
        active ? "bg-fg/8 text-fg" : "text-muted-fg hover:text-fg",
      )}
    >
      <Icon size={18} strokeWidth={active ? 2.4 : 1.8} />
    </Link>
  )
}
