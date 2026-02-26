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

      setData({
        currentPrices: pricesData.prices || {},
        difficulty: diffData,
        historicalPrices: {
          BTC: btcData.prices || [],
          LTC: ltcData.prices || [],
          DOGE: dogeData.prices || [],
        },
        loading: false,
        error: null,
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
