'use client'

import { useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
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

function formatPrice(coin: string, price: number): string {
  if (coin === 'DOGE') return `$${price.toFixed(4)}`
  if (coin === 'LTC') return `$${price.toFixed(2)}`
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatDifficulty(value: number): string {
  if (value === 0) return '-'
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}G`
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`
  return value.toFixed(2)
}

function profitColor(value: number): string {
  if (value > 0) return 'text-green-600'
  if (value < 0) return 'text-red-600'
  return ''
}

export function RevenueTable({ data, miner }: RevenueTableProps) {
  const isScrypt = miner.algorithm === 'scrypt'

  const summary = useMemo(() => {
    if (data.length === 0) return null
    const n = data.length

    const totals = data.reduce(
      (acc, row) => {
        acc.revenue += row.revenue
        acc.electricityCost += row.electricityCost
        acc.profit += row.profit
        if (isScrypt) {
          acc.ltcPrice += row.prices.LTC || 0
          acc.dogePrice += row.prices.DOGE || 0
          acc.ltcDiff += row.difficulties?.LTC || 0
          acc.dogeDiff += row.difficulties?.DOGE || 0
          acc.ltcOutput += row.coinOutputs.LTC
          acc.dogeOutput += row.coinOutputs.DOGE
        } else {
          acc.btcPrice += row.prices.BTC || 0
          acc.btcDiff += row.difficulties?.BTC || 0
          acc.btcOutput += row.coinOutputs.BTC
        }
        return acc
      },
      {
        revenue: 0, electricityCost: 0, profit: 0,
        btcPrice: 0, btcDiff: 0, btcOutput: 0,
        ltcPrice: 0, dogePrice: 0,
        ltcDiff: 0, dogeDiff: 0,
        ltcOutput: 0, dogeOutput: 0,
      }
    )

    return {
      revenue: totals.revenue,
      electricityCost: totals.electricityCost,
      profit: totals.profit,
      avgBtcPrice: totals.btcPrice / n,
      avgBtcDiff: totals.btcDiff / n,
      totalBtcOutput: totals.btcOutput,
      avgLtcPrice: totals.ltcPrice / n,
      avgDogePrice: totals.dogePrice / n,
      avgLtcDiff: totals.ltcDiff / n,
      avgDogeDiff: totals.dogeDiff / n,
      totalLtcOutput: totals.ltcOutput,
      totalDogeOutput: totals.dogeOutput,
    }
  }, [data, isScrypt])

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
              <TableHead className="text-xs text-right">LTC价格</TableHead>
              <TableHead className="text-xs text-right">DOGE价格</TableHead>
              <TableHead className="text-xs text-right">LTC难度</TableHead>
              <TableHead className="text-xs text-right">DOGE难度</TableHead>
              <TableHead className="text-xs text-right">LTC产出</TableHead>
              <TableHead className="text-xs text-right">DOGE产出</TableHead>
            </>
          ) : (
            <>
              <TableHead className="text-xs text-right">BTC价格</TableHead>
              <TableHead className="text-xs text-right">BTC难度</TableHead>
              <TableHead className="text-xs text-right">BTC产出</TableHead>
            </>
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
                <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                  {formatPrice('LTC', row.prices.LTC || 0)}
                </TableCell>
                <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                  {formatPrice('DOGE', row.prices.DOGE || 0)}
                </TableCell>
                <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                  {formatDifficulty(row.difficulties?.LTC || 0)}
                </TableCell>
                <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                  {formatDifficulty(row.difficulties?.DOGE || 0)}
                </TableCell>
                <TableCell className="text-xs text-right tabular-nums">
                  {formatCoin(row.coinOutputs.LTC, 6)}
                </TableCell>
                <TableCell className="text-xs text-right tabular-nums">
                  {formatCoin(row.coinOutputs.DOGE, 2)}
                </TableCell>
              </>
            ) : (
              <>
                <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                  {formatPrice('BTC', row.prices.BTC || 0)}
                </TableCell>
                <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                  {formatDifficulty(row.difficulties?.BTC || 0)}
                </TableCell>
                <TableCell className="text-xs text-right tabular-nums">
                  {formatCoin(row.coinOutputs.BTC, 8)}
                </TableCell>
              </>
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
      {summary && (
        <TableFooter>
          <TableRow className="font-semibold">
            <TableCell className="text-xs">汇总</TableCell>
            {isScrypt ? (
              <>
                <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                  {formatPrice('LTC', summary.avgLtcPrice)}
                </TableCell>
                <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                  {formatPrice('DOGE', summary.avgDogePrice)}
                </TableCell>
                <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                  {formatDifficulty(summary.avgLtcDiff)}
                </TableCell>
                <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                  {formatDifficulty(summary.avgDogeDiff)}
                </TableCell>
                <TableCell className="text-xs text-right tabular-nums">
                  {formatCoin(summary.totalLtcOutput, 6)}
                </TableCell>
                <TableCell className="text-xs text-right tabular-nums">
                  {formatCoin(summary.totalDogeOutput, 2)}
                </TableCell>
              </>
            ) : (
              <>
                <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                  {formatPrice('BTC', summary.avgBtcPrice)}
                </TableCell>
                <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                  {formatDifficulty(summary.avgBtcDiff)}
                </TableCell>
                <TableCell className="text-xs text-right tabular-nums">
                  {formatCoin(summary.totalBtcOutput, 8)}
                </TableCell>
              </>
            )}
            <TableCell className="text-xs text-right tabular-nums">
              {formatUSD(summary.revenue)}
            </TableCell>
            <TableCell className="text-xs text-right tabular-nums">
              {formatUSD(summary.electricityCost)}
            </TableCell>
            <TableCell
              className={`text-xs text-right tabular-nums font-semibold ${profitColor(summary.profit)}`}
            >
              {formatUSD(summary.profit)}
            </TableCell>
          </TableRow>
        </TableFooter>
      )}
    </Table>
  )
}
