"use client"
import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
  className,
}: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
  className?: string
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className={cn("space-y-2", className)}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 md:cursor-default"
        aria-expanded={open}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-fg">{title}</h2>
        <ChevronDown
          size={14}
          className={cn(
            "text-muted-fg transition-transform duration-200 md:hidden",
            open ? "rotate-0" : "-rotate-90",
          )}
        />
      </button>
      {open ? <div className="space-y-2">{children}</div> : null}
    </section>
  )
}
