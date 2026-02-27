'use client'

import { useState, useMemo, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DateSelector } from '@/components/date-selector'
import { SummaryCards } from '@/components/summary-cards'
import { SummaryTab } from '@/components/summary-tab'
import { MinerTabContent } from '@/components/miner-tab-content'
import { useMiners } from '@/hooks/use-miners'
import { useMarketData } from '@/hooks/use-market-data'
import { computeMinerDailyData } from '@/lib/compute-daily-data'
import { exportToExcel } from '@/lib/export-excel'
import { getPresetRange } from '@/lib/date-utils'
import type { DateRange } from '@/lib/types'
import { Download } from 'lucide-react'

export default function Home() {
  const [dateRange, setDateRange] = useState<DateRange>(getPresetRange('this-month'))

  const { miners, loading: minersLoading, updateMinerElectricityRate } = useMiners()
  const {
    currentPrices,
    difficulty,
    historicalPrices,
    historicalDifficulty,
    loading: marketLoading,
    error: marketError,
  } = useMarketData(dateRange)

  const allMinerData = useMemo(() => {
    if (!difficulty || !miners.length) return []
    return miners.map((miner) =>
      computeMinerDailyData(
        miner,
        dateRange,
        difficulty,
        historicalPrices,
        historicalDifficulty,
        currentPrices,
      )
    )
  }, [miners, dateRange, difficulty, historicalPrices, historicalDifficulty, currentPrices])

  const [downloading, setDownloading] = useState(false)
  const handleDownload = useCallback(async () => {
    if (allMinerData.length === 0 || downloading) return
    setDownloading(true)
    try {
      await exportToExcel(allMinerData, dateRange)
    } finally {
      setDownloading(false)
    }
  }, [allMinerData, dateRange, downloading])

  const isLoading = minersLoading || marketLoading

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <DateSelector dateRange={dateRange} onDateRangeChange={setDateRange} />
        </div>
        {allMinerData.length > 0 && (
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 h-8 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title="Download Excel"
          >
            {downloading
              ? <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              : <Download className="h-3.5 w-3.5" />
            }
            <span className="hidden sm:inline">{downloading ? 'Building…' : 'Excel'}</span>
          </button>
        )}
      </div>

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
            <Tabs defaultValue="summary" className="mt-6">
              <TabsList className="h-auto flex-wrap gap-1 bg-transparent p-0 border-b rounded-none pb-2">
                <TabsTrigger
                  value="summary"
                  className="text-xs data-[state=active]:bg-foreground data-[state=active]:text-background rounded-sm px-3 h-7"
                >
                  总览
                </TabsTrigger>
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

              <TabsContent value="summary" className="mt-4">
                <SummaryTab allMinerData={allMinerData} />
              </TabsContent>

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
