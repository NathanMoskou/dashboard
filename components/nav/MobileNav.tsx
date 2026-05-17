"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Menu, X, Home, Timer, Clock3,
  CheckSquare, Wallet, NotebookPen, Settings,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/ui/ThemeToggle"

// Single source of truth for all nav items — same labels as desktop sidebar.
const NAV = [
  { href: "/today",      icon: Home,        label: "Today",      color: "#3b82f6" },
  { href: "/focus",      icon: Timer,       label: "Focus",      color: "#f97316" },
  { href: "/work-timer", icon: Clock3,      label: "Work Timer", color: "#f59e0b" },
  { href: "/habits",     icon: CheckSquare, label: "Habits",     color: "#8b5cf6" },
  { href: "/finance",    icon: Wallet,      label: "Finance",    color: "#0ea5e9" },
  { href: "/reflection", icon: NotebookPen, label: "Reflection", color: "#f43f5e" },
  { href: "/settings",   icon: Settings,    label: "Settings",   color: "#94a3b8" },
]

// 7-item tab bar — Today (Home) sits in the center (position 4).
// Left: Habits · Finance · Reflection   |   Center: Today   |   Right: Focus · Work Timer · Settings
const TAB_BAR = [
  { href: "/habits",     icon: CheckSquare, color: "#8b5cf6", label: "Habits"     },
  { href: "/finance",    icon: Wallet,      color: "#0ea5e9", label: "Finance"    },
  { href: "/reflection", icon: NotebookPen, color: "#f43f5e", label: "Reflection" },
  { href: "/today",      icon: Home,        color: "#3b82f6", label: "Today"      }, // center
  { href: "/focus",      icon: Timer,       color: "#f97316", label: "Focus"      },
  { href: "/work-timer", icon: Clock3,      color: "#f59e0b", label: "Work Timer" },
  { href: "/settings",   icon: Settings,    color: "#94a3b8", label: "Settings"   },
]

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const [pillVisible, setPillVisible] = useState(true)
  const pathname = usePathname()
  const current = NAV.find(n => pathname === n.href || pathname.startsWith(n.href + "/"))

  // Hide the glass pill when the user has scrolled to the bottom of the page.
  useEffect(() => {
    const container = document.querySelector("[data-scroll-main]")
    if (!container) return

    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container as HTMLElement
      // Show pill everywhere except the last ~70px of the page.
      // If there's not enough content to scroll (height fits screen), always show.
      const distFromBottom = scrollHeight - scrollTop - clientHeight
      setPillVisible(distFromBottom > 70 || scrollHeight <= clientHeight + 8)
    }

    container.addEventListener("scroll", onScroll, { passive: true })
    // Run once on mount to get the initial state right.
    onScroll()
    return () => container.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <>
      {/* ── Fixed top header bar — mobile only ──────────────────── */}
      {/* mobile-header applies safe-area padding-top so the bar clears the
          iOS status bar in standalone (PWA) mode. */}
      <header
        className="md:hidden fixed top-0 inset-x-0 z-30 mobile-header flex items-end px-4 pb-2 bg-card/90 backdrop-blur-sm border-b border-border"
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
          style={{ color: current?.color ?? "var(--fg)" }}
          aria-live="polite"
          aria-atomic="true"
        >
          {current?.label ?? "Life OS"}
        </span>

        <ThemeToggle compact />
      </header>

      {/* ── Glass bottom tab pill ────────────────────────────────── */}
      {/* glass-pill-pos accounts for env(safe-area-inset-bottom) so the pill
          stays above the iPhone home indicator bar. */}
      <div
        aria-label="Quick navigation"
        role="navigation"
        className={cn(
          "md:hidden fixed left-1/2 z-30 -translate-x-1/2 glass-pill-pos transition-all duration-300",
          pillVisible ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none",
        )}
        style={{ filter: "drop-shadow(0 10px 24px rgba(15,23,42,0.18))" }}
      >
        <div
          className="glass-pill flex items-center gap-0.5 px-1.5 h-[52px] rounded-full"
          style={{
            backdropFilter: "blur(28px) saturate(180%)",
            WebkitBackdropFilter: "blur(28px) saturate(180%)",
          }}
        >
          {TAB_BAR.map(({ href, icon: Icon, color, label }) => {
            const active = pathname === href || pathname.startsWith(href + "/")
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex h-[38px] w-[38px] items-center justify-center rounded-full transition-all duration-150 active:scale-90",
                  active ? "" : "text-muted-fg hover:text-fg",
                )}
                style={active ? { background: color, color: "white" } : undefined}
                aria-label={label}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={16} strokeWidth={active ? 2.5 : 1.75} aria-hidden="true" />
              </Link>
            )
          })}
        </div>
      </div>

      {/* ── Slide-in drawer ──────────────────────────────────────── */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <nav
            id="mobile-drawer"
            role="navigation"
            aria-label="Main navigation"
            className="md:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-card border-r border-border flex flex-col shadow-2xl"
          >
            {/* Drawer top: logo + close — pushed below iOS status bar */}
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

            {/* Nav links */}
            <ul className="flex-1 overflow-y-auto p-3 space-y-0.5" role="list">
              {NAV.map(({ href, icon: Icon, label, color }) => {
                const active = pathname === href || pathname.startsWith(href + "/")
                return (
                  <li key={href} role="listitem">
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

            {/* Drawer footer */}
            <div className="p-3 border-t border-border space-y-0.5 pb-safe">
              <ThemeToggle />
            </div>
          </nav>
        </>
      )}
    </>
  )
}
