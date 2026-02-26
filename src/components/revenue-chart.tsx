'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import type { DailyRevenue } from '@/lib/types'

interface RevenueChartProps {
  data: DailyRevenue[]
}

export function RevenueChart({ data }: RevenueChartProps) {
  const chartData = data.map((d) => ({
    date: d.date.slice(5), // MM-DD
    profit: parseFloat(d.profit.toFixed(2)),
  }))

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
        No data available
      </div>
    )
  }

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="hsl(0, 0%, 88%)"
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: 'hsl(0, 0%, 45%)' }}
            tickLine={false}
            axisLine={{ stroke: 'hsl(0, 0%, 88%)' }}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'hsl(0, 0%, 45%)' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: number) => `$${value}`}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 6,
              border: '1px solid hsl(0, 0%, 88%)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
            formatter={(value: number) => [
              `$${value.toFixed(2)}`,
              'Profit',
            ]}
            labelFormatter={(label: string) => `Date: ${label}`}
          />
          <ReferenceLine y={0} stroke="hsl(0, 0%, 70%)" strokeDasharray="2 2" />
          <Bar
            dataKey="profit"
            fill="hsl(142, 71%, 45%)"
            radius={[2, 2, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
