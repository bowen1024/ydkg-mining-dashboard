'use client'

import { useState, useEffect, useCallback } from 'react'
import type { DifficultyData, DailyPrice, DailyDifficultyPoint, DateRange } from '@/lib/types'

interface PricesResponse {
  prices?: Record<string, number>
  cached?: boolean
  stale?: boolean
  error?: string
}

interface HistoricalResponse {
  coin?: string
  prices?: DailyPrice[]
  error?: string
}

interface MarketData {
  currentPrices: Record<string, number>
  difficulty: DifficultyData | null
  historicalPrices: Record<string, DailyPrice[]>
  historicalDifficulty: Record<string, DailyDifficultyPoint[]>
  loading: boolean
  error: string | null
}

export function useMarketData(dateRange: DateRange) {
  const [data, setData] = useState<MarketData>({
    currentPrices: {},
    difficulty: null,
    historicalPrices: {},
    historicalDifficulty: {},
    loading: true,
    error: null,
  })

  const fetchAll = useCallback(async () => {
    const start = dateRange.from.toISOString().split('T')[0]
    const end = dateRange.to.toISOString().split('T')[0]
    // Price APIs use a "days back from today" count; add buffer to cover the full range
    const priceDays = Math.max(
      Math.ceil((Date.now() - dateRange.from.getTime()) / 86400000) + 2,
      31
    )

    try {
      setData((prev) => ({ ...prev, loading: true }))

      const [pricesRes, diffRes, btcHist, ltcHist, dogeHist, diffHistRes] = await Promise.all([
        fetch('/api/prices'),
        fetch('/api/difficulty'),
        fetch(`/api/prices?mode=historical&coin=BTC&days=${priceDays}`),
        fetch(`/api/prices?mode=historical&coin=LTC&days=${priceDays}`),
        fetch(`/api/prices?mode=historical&coin=DOGE&days=${priceDays}`),
        fetch(`/api/difficulty-history?start=${start}&end=${end}`),
      ])

      const pricesData = (await pricesRes.json()) as PricesResponse
      const diffData = (await diffRes.json()) as Record<string, unknown>
      const btcData = (await btcHist.json()) as HistoricalResponse
      const ltcData = (await ltcHist.json()) as HistoricalResponse
      const dogeData = (await dogeHist.json()) as HistoricalResponse
      const diffHistData = (await diffHistRes.json()) as Record<string, DailyDifficultyPoint[]>

      // Validate difficulty data has required fields
      const validDifficulty = (diffData && typeof diffData.btc === 'number')
        ? diffData as unknown as DifficultyData
        : null

      setData({
        currentPrices: pricesData.prices || {},
        difficulty: validDifficulty,
        historicalPrices: {
          BTC: Array.isArray(btcData.prices) ? btcData.prices : [],
          LTC: Array.isArray(ltcData.prices) ? ltcData.prices : [],
          DOGE: Array.isArray(dogeData.prices) ? dogeData.prices : [],
        },
        historicalDifficulty: {
          BTC: Array.isArray(diffHistData.BTC) ? diffHistData.BTC : [],
          LTC: Array.isArray(diffHistData.LTC) ? diffHistData.LTC : [],
          DOGE: Array.isArray(diffHistData.DOGE) ? diffHistData.DOGE : [],
        },
        loading: false,
        error: validDifficulty ? null : 'API data unavailable — showing empty state',
      })
    } catch (err) {
      setData((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch market data',
      }))
    }
  }, [dateRange.from, dateRange.to]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  return { ...data, refetch: fetchAll }
}
