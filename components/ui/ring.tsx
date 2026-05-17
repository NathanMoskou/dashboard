/**
 * Donut progress ring for KPI cards.
 * Pass `value` 0-100, optional gradient (default = primary fill).
 */
export function Ring({
  value,
  size = 64,
  stroke = 7,
  color = "var(--primary)",
  trackColor = "var(--muted)",
  children,
}: {
  value: number
  size?: number
  stroke?: number
  color?: string
  trackColor?: string
  children?: React.ReactNode
}) {
  const v = Math.max(0, Math.min(100, value))
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (v / 100) * c
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      {children ? (
        <div className="absolute inset-0 flex items-center justify-center text-xs font-medium">
          {children}
        </div>
      ) : null}
    </div>
  )
}
