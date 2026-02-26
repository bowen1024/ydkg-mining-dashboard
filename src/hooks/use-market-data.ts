'use client'

import { useState, useEffect, useCallback } from 'react'
import type { DifficultyData, DailyPrice } from '@/lib/types'

interface MarketData {
  currentPrices: Record<string, number>
  difficulty: DifficultyData | null
  historicalPrices: Record<string, DailyPrice[]>
  loading: boolean
  error: string | null
}

export function useMarketData(days: number = 31) {
  const [data, setData] = useState<MarketData>({
    currentPrices: {},
    difficulty: null,
    historicalPrices: {},
    loading: true,
    error: null,
  })

  const fetchAll = useCallback(async () => {
    try {
      setData((prev) => ({ ...prev, loading: true }))

      const [pricesRes, diffRes, btcHist, ltcHist, dogeHist] = await Promise.all([
        fetch('/api/prices'),
        fetch('/api/difficulty'),
        fetch(`/api/prices?mode=historical&coin=BTC&days=${days}`),
        fetch(`/api/prices?mode=historical&coin=LTC&days=${days}`),
        fetch(`/api/prices?mode=historical&coin=DOGE&days=${days}`),
      ])

      const [pricesData, diffData, btcData, ltcData, dogeData] = await Promise.all([
        pricesRes.json(),
        diffRes.json(),
        btcHist.json(),
        ltcHist.json(),
        dogeHist.json(),
      ])

      // Validate difficulty data has required fields
      const validDifficulty = (diffData && typeof diffData.btc === 'number')
        ? diffData as DifficultyData
        : null

      setData({
        currentPrices: pricesData.prices || {},
        difficulty: validDifficulty,
        historicalPrices: {
          BTC: Array.isArray(btcData.prices) ? btcData.prices : [],
          LTC: Array.isArray(ltcData.prices) ? ltcData.prices : [],
          DOGE: Array.isArray(dogeData.prices) ? dogeData.prices : [],
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
  }, [days])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  return { ...data, refetch: fetchAll }
}
