import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { CarrierSlice } from '@/features/dashboard/dashboard.service'

const COLORS = [
  'hsl(215 62% 42%)',
  'hsl(160 55% 42%)',
  'hsl(38 90% 50%)',
  'hsl(262 60% 55%)',
  'hsl(199 80% 48%)',
  'hsl(0 70% 52%)',
]

/** Distribuição de recebimentos por transportadora (donut). */
export function CarriersBreakdownChart({ data }: { data: CarrierSlice[] }) {
  if (data.length === 0) return <EmptyChart />
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="carrier"
          innerRadius={55}
          outerRadius={88}
          paddingAngle={2}
          stroke="none"
        >
          {data.map((entry) => (
            <Cell key={entry.carrier} fill={COLORS[data.indexOf(entry) % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

function EmptyChart() {
  return (
    <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
      Sem dados no período.
    </div>
  )
}