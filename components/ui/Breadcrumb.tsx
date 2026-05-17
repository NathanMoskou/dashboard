import Link from "next/link"
import { ChevronRight } from "lucide-react"

type Crumb = { label: string; href?: string }

export function Breadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-1 text-xs text-muted-fg mb-4">
        {crumbs.map((c, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight size={12} className="shrink-0" />}
            {c.href ? (
              <Link href={c.href} className="hover:text-fg transition-colors">
                {c.label}
              </Link>
            ) : (
              <span className="text-fg font-medium">{c.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
