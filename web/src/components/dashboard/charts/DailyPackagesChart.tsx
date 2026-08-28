import {
  Bar,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DailyPoint } from '@/features/dashboard/dashboard.service'

/** Série diária de recebimentos (barra) e retiradas (linha) — 30 dias. */
export function DailyPackagesChart({ data }: { data: DailyPoint[] }) {
  const chartData = data.map((d) => ({ ...d, label: d.date.slice(5) }))

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={4} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={40} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="received" name="Recebidas" fill="hsl(215 62% 42%)" radius={[3, 3, 0, 0]} />
        <Line
          type="monotone"
          dataKey="collected"
          name="Retiradas"
          stroke="hsl(160 55% 42%)"
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}