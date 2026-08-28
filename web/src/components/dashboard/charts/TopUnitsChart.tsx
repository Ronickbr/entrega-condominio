import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { TopUnitSlice } from '@/features/dashboard/dashboard.service'

/** Unidades com mais recebimentos (barra horizontal). */
export function TopUnitsChart({ data }: { data: TopUnitSlice[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
        Sem dados no período.
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="unit" width={72} tick={{ fontSize: 10 }} />
        <Tooltip />
        <Bar dataKey="count" name="Encomendas" fill="hsl(215 62% 42%)" radius={[0, 3, 3, 0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  )
}