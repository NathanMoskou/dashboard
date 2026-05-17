/**
 * Bevel-style donut metric. Big tabular numeral centered in a colored ring,
 * label underneath. Used in trios on dashboard pages.
 *
 * Color resolves automatically from `zone` — pass the data and the ring
 * picks green / amber / rose. Or override with explicit `color`.
 */

import { cn } from "@/lib/utils"

export type MetricRingProps = {
  value: number              // 0–100 ring fill
  label: string              // e.g. "Habits"
  display?: string           // override the centered text (default: value%)
  size?: number              // px, default 96
  stroke?: number            // ring thickness, default 9
  color?: string             // hex / css var override
  zone?: "good" | "warn" | "bad" | "muted"
  className?: string
}

export function MetricRing({
  value,
  label,
  display,
  size = 96,
  stroke = 9,
  color,
  zone,
  className,
}: MetricRingProps) {
  const v = Math.max(0, Math.min(100, value))
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (v / 100) * c
  const resolved =
    color ??
    (zone === "good" ? "var(--good)"
      : zone === "warn" ? "var(--warn)"
      : zone === "bad" ? "var(--bad)"
      : zone === "muted" ? "var(--muted-fg)"
      : "var(--primary)")

  return (
    <div className={cn("flex flex-col items-center gap-1.5", className)}>
      <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="rotate-[-90deg]">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--muted)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={resolved}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.9s var(--ease-out)" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-extrabold tabular-nums tracking-tight">
            {display ?? `${Math.round(v)}`}
          </span>
        </div>
      </div>
      <span className="text-[11px] uppercase tracking-wider font-medium text-muted-fg">{label}</span>
    </div>
  )
}
