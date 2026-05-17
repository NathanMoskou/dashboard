"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Timer,
  Clock3,
  CheckSquare,
  Wallet,
  NotebookPen,
  Settings,
  LogOut,
  HeartPulse,
  RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { logout } from "@/app/login/actions"
import { ThemeToggle } from "@/components/ui/ThemeToggle"

const NAV = [
  { href: "/today",      icon: LayoutDashboard, label: "Today",      color: "#3b82f6" },
  { href: "/health",     icon: HeartPulse,      label: "Health",     color: "#10b981" },
  { href: "/focus",      icon: Timer,           label: "Focus",      color: "#f97316" },
  { href: "/work-timer", icon: Clock3,          label: "Work Timer", color: "#f59e0b" },
  { href: "/habits",     icon: CheckSquare,     label: "Habits",     color: "#8b5cf6" },
  { href: "/finance",    icon: Wallet,          label: "Finance",    color: "#0ea5e9" },
  { href: "/reflection", icon: NotebookPen,     label: "Reflection", color: "#f43f5e" },
  { href: "/settings",   icon: Settings,        label: "Settings",   color: "#94a3b8" },
]

export function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="hidden md:flex md:w-52 md:flex-col border-r border-border/40 bg-bg">
      {/* Logo */}
      <div className="px-4 pt-6 pb-3">
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Life OS" width={30} height={30} className="shrink-0" />
          <div>
            <div className="text-[15px] font-black tracking-tight leading-none text-fg">
              Life OS
            </div>
            <div className="text-[9px] text-muted-fg leading-tight mt-0.5 font-semibold uppercase tracking-[0.08em]">
              Dashboard
            </div>
          </div>
        </div>
      </div>

      <div className="mx-4 mb-2 h-px bg-border/60" />

      <nav className="flex flex-col gap-0.5 px-2">
        {NAV.map((n) => {
          const active = pathname === n.href || pathname.startsWith(n.href + "/")
          const Icon = n.icon
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-all duration-150",
                active
                  ? "font-semibold"
                  : "text-muted-fg font-medium hover:text-fg hover:bg-muted/60",
              )}
              style={
                active
                  ? { background: `${n.color}18`, color: n.color }
                  : undefined
              }
            >
              <Icon size={15} strokeWidth={active ? 2.5 : 1.75} />
              {n.label}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto px-2 pb-4 space-y-0.5">
        <div className="mx-2 mb-2 h-px bg-border/60" />
        <ThemeToggle />
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-muted-fg hover:bg-muted/60 hover:text-fg transition-colors"
        >
          <RefreshCw size={15} /> Vernieuwen
        </button>
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-muted-fg hover:bg-muted/60 hover:text-fg transition-colors"
          >
            <LogOut size={15} /> Log out
          </button>
        </form>
      </div>
    </aside>
  )
}
