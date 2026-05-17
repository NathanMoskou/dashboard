"use client"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"

export function SpendChart({
  data,
  avgPerDay,
}: {
  data: { day: string; cumulative: number }[]
  avgPerDay: number
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="spend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--bad)" stopOpacity={0.4} />
            <stop offset="95%" stopColor="var(--bad)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="var(--muted-fg)" />
        <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-fg)" tickFormatter={(v) => `€${v}`} />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            fontSize: 11,
          }}
          formatter={(v) => `€${Number(v).toFixed(2)}`}
        />
        <ReferenceLine
          y={avgPerDay}
          stroke="var(--muted-fg)"
          strokeDasharray="3 3"
          label={{
            value: `pace €${avgPerDay.toFixed(0)}/d`,
            fontSize: 10,
            fill: "var(--muted-fg)",
            position: "right",
          }}
        />
        <Area
          type="monotone"
          dataKey="cumulative"
          stroke="var(--bad)"
          strokeWidth={2}
          fill="url(#spend)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
