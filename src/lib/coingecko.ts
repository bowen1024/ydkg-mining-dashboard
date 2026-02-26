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

export async function getHistoricalPrices(
  coin: 'BTC' | 'LTC' | 'DOGE',
  days: number
): Promise<DailyPrice[]> {
  const id = COINGECKO_IDS[coin]
  const res = await fetch(
    `${BASE_URL}/coins/${id}/ohlc?vs_currency=usd&days=${days}`,
    { headers: getHeaders() }
  )
  if (!res.ok) throw new Error(`CoinGecko OHLC fetch failed: ${res.status}`)
  // Response: [[timestamp, open, high, low, close], ...]
  const data = (await res.json()) as number[][]
  return data.map((candle) => {
    const [timestamp, , , , close] = candle
    const date = new Date(timestamp).toISOString().split('T')[0]
    return { date, price: close }
  })
}
