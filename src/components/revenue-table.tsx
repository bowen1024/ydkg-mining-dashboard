'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { DailyRevenue, MinerConfig } from '@/lib/types'

interface RevenueTableProps {
  data: DailyRevenue[]
  miner: MinerConfig
}

function formatUSD(value: number): string {
  return `$${value.toFixed(2)}`
}

function formatCoin(value: number, decimals: number = 6): string {
  if (value === 0) return '0'
  return value.toFixed(decimals)
}

function profitColor(value: number): string {
  if (value > 0) return 'text-green-600'
  if (value < 0) return 'text-red-600'
  return ''
}

export function RevenueTable({ data, miner }: RevenueTableProps) {
  const isScrypt = miner.algorithm === 'scrypt'

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
        No data available
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-xs">日期</TableHead>
          {isScrypt ? (
            <>
              <TableHead className="text-xs text-right">LTC产出</TableHead>
              <TableHead className="text-xs text-right">DOGE产出</TableHead>
            </>
          ) : (
            <TableHead className="text-xs text-right">BTC产出</TableHead>
          )}
          <TableHead className="text-xs text-right">收入</TableHead>
          <TableHead className="text-xs text-right">电费</TableHead>
          <TableHead className="text-xs text-right">净利润</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow key={row.date}>
            <TableCell className="text-xs tabular-nums">{row.date}</TableCell>
            {isScrypt ? (
              <>
                <TableCell className="text-xs text-right tabular-nums">
                  {formatCoin(row.coinOutputs.LTC, 6)}
                </TableCell>
                <TableCell className="text-xs text-right tabular-nums">
                  {formatCoin(row.coinOutputs.DOGE, 2)}
                </TableCell>
              </>
            ) : (
              <TableCell className="text-xs text-right tabular-nums">
                {formatCoin(row.coinOutputs.BTC, 8)}
              </TableCell>
            )}
            <TableCell className="text-xs text-right tabular-nums">
              {formatUSD(row.revenue)}
            </TableCell>
            <TableCell className="text-xs text-right tabular-nums">
              {formatUSD(row.electricityCost)}
            </TableCell>
            <TableCell
              className={`text-xs text-right tabular-nums font-medium ${profitColor(row.profit)}`}
            >
              {formatUSD(row.profit)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
