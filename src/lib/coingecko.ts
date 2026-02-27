import { COINGECKO_IDS } from './constants'
import type { DailyPrice } from './types'

const BASE_URL = 'https://api.coingecko.com/api/v3'

function getHeaders(): HeadersInit {
  const apiKey = process.env.COINGECKO_API_KEY
  if (apiKey) {
    return { 'x-cg-demo-api-key': apiKey, 'Accept': 'application/json' }
  }
  return { Accept: 'application/json' }
}

export async function getCurrentPrices(): Promise<Record<string, number>> {
  const ids = Object.values(COINGECKO_IDS).join(',')
  const res = await fetch(
    `${BASE_URL}/simple/price?ids=${ids}&vs_currencies=usd`,
    { headers: getHeaders() }
  )
  if (!res.ok) throw new Error(`CoinGecko price fetch failed: ${res.status}`)
  const data = (await res.json()) as Record<string, { usd?: number }>
  return {
    BTC: data.bitcoin?.usd || 0,
    LTC: data.litecoin?.usd || 0,
    DOGE: data.dogecoin?.usd || 0,
  }
}

interface MarketChartResponse {
  prices?: [number, number][]
}

export async function getHistoricalPrices(
  coin: 'BTC' | 'LTC' | 'DOGE',
  days: number
): Promise<DailyPrice[]> {
  const id = COINGECKO_IDS[coin]
  const res = await fetch(
    `${BASE_URL}/coins/${id}/market_chart?vs_currency=usd&days=${days}&interval=daily`,
    { headers: getHeaders() }
  )
  if (!res.ok) throw new Error(`CoinGecko market_chart fetch failed: ${res.status}`)
  const data = (await res.json()) as MarketChartResponse
  const prices = data.prices || []
  // API returns prices at 00:00 UTC = opening of that day = close of PREVIOUS day.
  // The final data point has a non-midnight timestamp = today's live price.
  const dateMap = new Map<string, number>()
  for (const [timestamp, price] of prices) {
    const d = new Date(timestamp)
    if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0) {
      // Midnight entry: this is previous day's close price
      d.setUTCDate(d.getUTCDate() - 1)
    }
    const date = d.toISOString().split('T')[0]
    dateMap.set(date, price)
  }
  return Array.from(dateMap.entries()).map(([date, price]) => ({ date, price }))
}
