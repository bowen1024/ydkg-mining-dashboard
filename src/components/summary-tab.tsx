'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { MinerDailyData } from '@/lib/types'

interface SummaryTabProps {
  allMinerData: MinerDailyData[]
}

function profitColor(value: number): string {
  if (value > 0) return 'text-green-600'
  if (value < 0) return 'text-red-600'
  return ''
}

function formatUSD(value: number): string {
  return `$${value.toFixed(2)}`
}

export function SummaryTab({ allMinerData }: SummaryTabProps) {
  if (allMinerData.length === 0) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
        No data available
      </div>
    )
  }

  // Collect all unique dates across all miners
  const allDates = Array.from(
    new Set(allMinerData.flatMap((md) => md.dailyRevenues.map((d) => d.date)))
  ).sort()

  // Build a profit lookup: minerIndex -> date -> profit
  const profitByMinerAndDate: Map<string, Map<string, number>> = new Map()
  for (const md of allMinerData) {
    const map = new Map<string, number>()
    for (const d of md.dailyRevenues) {
      map.set(d.date, d.profit)
    }
    profitByMinerAndDate.set(md.miner.id, map)
  }

  const grandTotal = allMinerData.reduce((s, md) => s + md.totalProfit, 0)

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs sticky left-0 bg-background">日期</TableHead>
            {allMinerData.map((md) => (
              <TableHead key={md.miner.id} className="text-xs text-right whitespace-nowrap">
                {md.miner.name}
              </TableHead>
            ))}
            <TableHead className="text-xs text-right">总计</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allDates.map((date) => {
            const rowTotal = allMinerData.reduce((s, md) => {
              return s + (profitByMinerAndDate.get(md.miner.id)?.get(date) ?? 0)
            }, 0)
            return (
              <TableRow key={date}>
                <TableCell className="text-xs tabular-nums sticky left-0 bg-background">
                  {date}
                </TableCell>
                {allMinerData.map((md) => {
                  const profit = profitByMinerAndDate.get(md.miner.id)?.get(date) ?? 0
                  return (
                    <TableCell
                      key={md.miner.id}
                      className={`text-xs text-right tabular-nums ${profitColor(profit)}`}
                    >
                      {formatUSD(profit)}
                    </TableCell>
                  )
                })}
                <TableCell className={`text-xs text-right tabular-nums font-medium ${profitColor(rowTotal)}`}>
                  {formatUSD(rowTotal)}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
        <TableFooter>
          <TableRow className="bg-muted/50 font-medium">
            <TableCell className="text-xs sticky left-0 bg-muted/50">汇总</TableCell>
            {allMinerData.map((md) => (
              <TableCell
                key={md.miner.id}
                className={`text-xs text-right tabular-nums ${profitColor(md.totalProfit)}`}
              >
                {formatUSD(md.totalProfit)}
              </TableCell>
            ))}
            <TableCell className={`text-xs text-right tabular-nums ${profitColor(grandTotal)}`}>
              {formatUSD(grandTotal)}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  )
}
