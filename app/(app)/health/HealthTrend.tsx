"use client"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"

export function HealthTrend({
  data,
  dataKey,
  color = "var(--fg)",
  unit = "",
  type = "line",
}: {
  data: { date: string; value: number | null }[]
  dataKey?: string
  color?: string
  unit?: string
  type?: "line" | "area"
}) {
  const key = dataKey ?? "value"
  // Filter null gaps but keep the date axis intact via raw data — recharts skips nulls by default
  if (data.every((d) => d.value == null)) {
    return (
      <div className="flex h-32 items-center justify-center text-xs text-muted-fg">
        Geen data
      </div>
    )
  }

  if (type === "area") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.4} />
              <stop offset="95%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--muted-fg)" />
          <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-fg)" domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              fontSize: 11,
            }}
            formatter={(v) => `${Number(v).toFixed(1)}${unit}`}
          />
          <Area
            type="monotone"
            dataKey={key}
            stroke={color}
            strokeWidth={2}
            fill={`url(#grad-${key})`}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--muted-fg)" />
        <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-fg)" domain={["auto", "auto"]} />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            fontSize: 11,
          }}
          formatter={(v) => `${Number(v).toFixed(1)}${unit}`}
        />
        <Line
          type="monotone"
          dataKey={key}
          stroke={color}
          strokeWidth={2}
          dot={false}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
