'use client'

import { Card, CardContent } from '@/components/ui/card'
import type { MinerDailyData } from '@/lib/types'

interface SummaryCardsProps {
  allMinerData: MinerDailyData[]
}

function formatUSD(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

export function SummaryCards({ allMinerData }: SummaryCardsProps) {
  const totalRevenue = allMinerData.reduce((sum, md) => sum + md.totalRevenue, 0)
  const totalElectricity = allMinerData.reduce((sum, md) => sum + md.totalElectricityCost, 0)
  const totalManagementFee = allMinerData.reduce((sum, md) => sum + md.totalManagementFee, 0)
  const netProfit = totalRevenue - totalElectricity - totalManagementFee
  const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

  const metrics = [
    {
      label: '总收入',
      sublabel: 'Total Revenue',
      value: formatUSD(totalRevenue),
      colorClass: '',
    },
    {
      label: '总电费',
      sublabel: 'Electricity',
      value: formatUSD(totalElectricity),
      colorClass: '',
    },
    {
      label: '管理费',
      sublabel: 'Management Fee',
      value: formatUSD(totalManagementFee),
      colorClass: '',
    },
    {
      label: '净利润',
      sublabel: 'Net Profit',
      value: formatUSD(netProfit),
      colorClass: netProfit >= 0 ? 'text-green-600' : 'text-red-600',
    },
    {
      label: '利润率',
      sublabel: 'Margin',
      value: formatPercent(margin),
      colorClass: margin >= 0 ? 'text-green-600' : 'text-red-600',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {metrics.map((metric) => (
        <Card key={metric.sublabel} className="py-4 gap-3">
          <CardContent className="px-5">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground tracking-wide">
                {metric.label}
                <span className="ml-1.5 text-[10px] uppercase tracking-wider opacity-60">
                  {metric.sublabel}
                </span>
              </p>
              <p
                className={`text-2xl font-bold tabular-nums tracking-tight ${metric.colorClass}`}
              >
                {metric.value}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
