'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { RevenueChart } from '@/components/revenue-chart'
import { RevenueTable } from '@/components/revenue-table'
import type { MinerDailyData } from '@/lib/types'

interface MinerTabContentProps {
  minerData: MinerDailyData
  onElectricityRateChange: (minerId: string, rate: number) => void
}

function formatUSD(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function profitColor(value: number): string {
  if (value > 0) return 'text-green-600'
  if (value < 0) return 'text-red-600'
  return ''
}

export function MinerTabContent({ minerData, onElectricityRateChange }: MinerTabContentProps) {
  const { miner, dailyRevenues, totalRevenue, totalElectricityCost, totalProfit } = minerData
  const [editingRate, setEditingRate] = useState(false)
  const [rateValue, setRateValue] = useState(miner.electricityRate.toString())

  function handleRateBlur() {
    setEditingRate(false)
    const parsed = parseFloat(rateValue)
    if (!isNaN(parsed) && parsed >= 0 && parsed !== miner.electricityRate) {
      onElectricityRateChange(miner.id, parsed)
    } else {
      setRateValue(miner.electricityRate.toString())
    }
  }

  function handleRateKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      handleRateBlur()
    }
    if (e.key === 'Escape') {
      setEditingRate(false)
      setRateValue(miner.electricityRate.toString())
    }
  }

  return (
    <div className="space-y-6">
      {/* Miner info bar */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{miner.name}</span>
          <Badge variant="secondary" className="text-[10px] h-5">
            x{miner.quantity}
          </Badge>
        </div>

        <Separator orientation="vertical" className="h-4" />

        <div className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{miner.hashrate}</span>{' '}
          {miner.hashrateUnit}
        </div>

        <div className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{miner.power}</span>W
        </div>

        <Separator orientation="vertical" className="h-4" />

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>电价:</span>
          {editingRate ? (
            <Input
              type="number"
              step="0.001"
              min="0"
              value={rateValue}
              onChange={(e) => setRateValue(e.target.value)}
              onBlur={handleRateBlur}
              onKeyDown={handleRateKeyDown}
              className="w-20 h-6 text-xs px-1.5"
              autoFocus
            />
          ) : (
            <button
              onClick={() => {
                setRateValue(miner.electricityRate.toString())
                setEditingRate(true)
              }}
              className="font-medium text-foreground hover:underline cursor-pointer tabular-nums"
            >
              ${miner.electricityRate}/kWh
            </button>
          )}
        </div>
      </div>

      {/* Period summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Revenue
          </p>
          <p className="text-lg font-bold tabular-nums">{formatUSD(totalRevenue)}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Electricity
          </p>
          <p className="text-lg font-bold tabular-nums">{formatUSD(totalElectricityCost)}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Net Profit
          </p>
          <p className={`text-lg font-bold tabular-nums ${profitColor(totalProfit)}`}>
            {formatUSD(totalProfit)}
          </p>
        </div>
      </div>

      {/* Chart */}
      <RevenueChart data={dailyRevenues} />

      {/* Table */}
      <RevenueTable data={dailyRevenues} miner={miner} />
    </div>
  )
}
