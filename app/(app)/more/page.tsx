import Link from "next/link"
import { Wallet, NotebookPen, Settings, Clock3 } from "lucide-react"
import { Card } from "@/components/ui/card"

const ITEMS = [
  { href: "/work-timer", label: "Work Timer", icon: Clock3 },
  { href: "/finance", label: "Financiën & Doelen", icon: Wallet },
  { href: "/reflection", label: "Reflectie", icon: NotebookPen },
  { href: "/settings", label: "Instellingen", icon: Settings },
]

export default function MorePage() {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold tracking-tight">Meer</h1>
      <div className="space-y-2">
        {ITEMS.map((it) => {
          const Icon = it.icon
          return (
            <Link key={it.href} href={it.href}>
              <Card className="flex items-center gap-3 p-4 hover:bg-muted">
                <Icon size={18} />
                <span>{it.label}</span>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
