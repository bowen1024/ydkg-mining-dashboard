'use client'

import { useState, useMemo } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DateSelector } from '@/components/date-selector'
import { SummaryCards } from '@/components/summary-cards'
import { MinerTabContent } from '@/components/miner-tab-content'
import { useMiners } from '@/hooks/use-miners'
import { useMarketData } from '@/hooks/use-market-data'
import { computeMinerDailyData } from '@/lib/compute-daily-data'
import { getPresetRange } from '@/lib/date-utils'
import type { DateRange } from '@/lib/types'
import { differenceInDays } from 'date-fns'

export default function Home() {
  const [dateRange, setDateRange] = useState<DateRange>(getPresetRange('this-month'))
  const days = differenceInDays(dateRange.to, dateRange.from) + 1

  const { miners, loading: minersLoading, updateMinerElectricityRate } = useMiners()
  const {
    currentPrices,
    difficulty,
    historicalPrices,
    loading: marketLoading,
    error: marketError,
  } = useMarketData(Math.max(days, 31))

  const allMinerData = useMemo(() => {
    if (!difficulty || !miners.length) return []
    return miners.map((miner) =>
      computeMinerDailyData(miner, dateRange, difficulty, historicalPrices, currentPrices)
    )
  }, [miners, dateRange, difficulty, historicalPrices, currentPrices])

  const isLoading = minersLoading || marketLoading

  return (
    <div className="space-y-6">
      <DateSelector dateRange={dateRange} onDateRangeChange={setDateRange} />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-muted-foreground animate-pulse">
            Loading market data...
          </p>
        </div>
      ) : marketError && allMinerData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          <p className="text-sm text-muted-foreground">
            {marketError}
          </p>
          <p className="text-xs text-muted-foreground/60">
            请在 .env.local 中配置 COINGECKO_API_KEY 以获取实时数据
          </p>
        </div>
      ) : (
        <>
          <SummaryCards allMinerData={allMinerData} />

          {allMinerData.length > 0 && (
            <Tabs defaultValue={allMinerData[0].miner.id} className="mt-6">
              <TabsList className="h-auto flex-wrap gap-1 bg-transparent p-0 border-b rounded-none pb-2">
                {allMinerData.map((md) => (
                  <TabsTrigger
                    key={md.miner.id}
                    value={md.miner.id}
                    className="text-xs data-[state=active]:bg-foreground data-[state=active]:text-background rounded-sm px-3 h-7"
                  >
                    {md.miner.name}
                  </TabsTrigger>
                ))}
              </TabsList>

              {allMinerData.map((md) => (
                <TabsContent key={md.miner.id} value={md.miner.id} className="mt-4">
                  <MinerTabContent
                    minerData={md}
                    onElectricityRateChange={updateMinerElectricityRate}
                  />
                </TabsContent>
              ))}
            </Tabs>
          )}
        </>
      )}
    </div>
  )
}
