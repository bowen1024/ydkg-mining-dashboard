import { NextRequest, NextResponse } from 'next/server'
import { getCurrentPrices, getHistoricalPrices } from '@/lib/coingecko'

let priceCache: { data: Record<string, number>; fetchedAt: number } | null = null
const CACHE_TTL = 5 * 60 * 1000

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('mode') || 'current'
  const coin = searchParams.get('coin')
  const days = parseInt(searchParams.get('days') || '31', 10)

  try {
    if (mode === 'historical' && coin) {
      const validCoins = ['BTC', 'LTC', 'DOGE'] as const
      if (!validCoins.includes(coin as any)) {
        return NextResponse.json({ error: 'Invalid coin' }, { status: 400 })
      }
      const prices = await getHistoricalPrices(coin as 'BTC' | 'LTC' | 'DOGE', days)
      return NextResponse.json({ coin, prices })
    }

    const now = Date.now()
    if (priceCache && now - priceCache.fetchedAt < CACHE_TTL) {
      return NextResponse.json({ prices: priceCache.data, cached: true })
    }

    const prices = await getCurrentPrices()
    priceCache = { data: prices, fetchedAt: now }
    return NextResponse.json({ prices, cached: false })
  } catch (error) {
    console.error('Price fetch error:', error)
    if (priceCache) {
      return NextResponse.json({ prices: priceCache.data, cached: true, stale: true })
    }
    return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 })
  }
}
