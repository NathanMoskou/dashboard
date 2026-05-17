"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home, HeartPulse, Timer, Clock3,
  CheckSquare, Wallet, NotebookPen, Settings,
} from "lucide-react"
import { cn } from "@/lib/utils"

// 3 links van Today, 4 rechts — Settings helemaal rechts
const LEFT = [
  { href: "/health",     icon: HeartPulse,  label: "Health",   color: "var(--good)"    },
  { href: "/focus",      icon: Timer,       label: "Focus",    color: "var(--accent)"  },
  { href: "/work-timer", icon: Clock3,      label: "Work",     color: "var(--warn)"    },
]
const RIGHT = [
  { href: "/habits",     icon: CheckSquare, label: "Habits",   color: "var(--primary)" },
  { href: "/finance",    icon: Wallet,      label: "Finance",  color: "var(--good)"    },
  { href: "/reflection", icon: NotebookPen, label: "Reflect",  color: "var(--bad)"     },
  { href: "/settings",   icon: Settings,    label: "Settings", color: "var(--muted-fg)"},
]

export function BottomTabs() {
  const pathname = usePathname()
  const isToday = pathname === "/today" || pathname.startsWith("/today/")

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 pb-safe">
      <div className="bg-card border-t border-border overflow-visible">
        <div className="flex h-14 items-center">

          {LEFT.map((t) => (
            <Tab key={t.href} {...t} pathname={pathname} />
          ))}

          {/* Today — verhoogd in het midden */}
          <Link href="/today" className="flex-none flex flex-col items-center px-1">
            <div
              className={cn(
                "flex flex-col items-center justify-center gap-0.5",
                "w-12 h-12 rounded-2xl -translate-y-3 transition-all duration-200",
                isToday
                  ? "bg-primary text-primary-fg shadow-[0_-4px_20px_rgba(109,92,240,0.45)]"
                  : "bg-card text-primary shadow-[0_-3px_14px_rgba(0,0,0,0.13)] ring-1 ring-primary/20",
              )}
            >
              <Home size={18} />
              <span className="text-[8px] font-bold leading-none tracking-wide">Today</span>
            </div>
          </Link>

          {RIGHT.map((t) => (
            <Tab key={t.href} {...t} pathname={pathname} />
          ))}

        </div>
      </div>
    </nav>
  )
}

function Tab({
  href,
  icon: Icon,
  label,
  pathname,
  color,
}: {
  href: string
  icon: React.ComponentType<{ size?: number }>
  label: string
  pathname: string
  color: string
}) {
  const active = pathname === href || pathname.startsWith(href + "/")
  return (
    <Link
      href={href}
      className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1 text-[9px] font-medium transition-colors"
      style={{ color: active ? color : "var(--muted-fg)" }}
    >
      <Icon size={16} />
      <span>{label}</span>
    </Link>
  )
}
