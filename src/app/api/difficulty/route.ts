import { NextResponse } from 'next/server'
import { DIFFICULTY_ENDPOINTS } from '@/lib/constants'
import type { DifficultyData } from '@/lib/types'

let difficultyCache: DifficultyData | null = null
const CACHE_TTL = 60 * 60 * 1000

async function fetchBtcDifficulty(): Promise<number> {
  const res = await fetch(DIFFICULTY_ENDPOINTS.BTC, {
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`BTC difficulty fetch failed: ${res.status}`)
  const text = await res.text()
  const value = parseFloat(text.trim())
  if (isNaN(value)) throw new Error(`Invalid BTC difficulty: ${text}`)
  return value
}

interface BlockchairAggRow {
  date: string
  'avg(difficulty)': number
}

interface BlockchairAggResponse {
  data?: BlockchairAggRow[]
}

// Fetches the most recent complete day's average difficulty from Blockchair
async function fetchBlockchairDailyAvgDifficulty(coin: 'litecoin' | 'dogecoin', label: string): Promise<number> {
  const yesterday = new Date()
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  const dateStr = yesterday.toISOString().split('T')[0]
  const url = `https://api.blockchair.com/${coin}/blocks?a=date,avg(difficulty)&q=time(${dateStr}..${dateStr})`
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
  if (!res.ok) throw new Error(`${label} difficulty fetch failed: ${res.status}`)
  const json = (await res.json()) as BlockchairAggResponse
  if (!Array.isArray(json.data) || json.data.length === 0) {
    throw new Error(`No ${label} difficulty data from Blockchair for ${dateStr}`)
  }
  const difficulty = json.data[0]['avg(difficulty)']
  if (typeof difficulty !== 'number' || isNaN(difficulty)) {
    throw new Error(`Invalid ${label} difficulty value from Blockchair`)
  }
  return difficulty
}

export async function GET() {
  try {
    const now = Date.now()
    if (difficultyCache && now - difficultyCache.fetchedAt < CACHE_TTL) {
      return NextResponse.json(difficultyCache)
    }

    const results = await Promise.allSettled([
      fetchBtcDifficulty(),
      fetchBlockchairDailyAvgDifficulty('litecoin', 'LTC'),
      fetchBlockchairDailyAvgDifficulty('dogecoin', 'DOGE'),
    ])

    const btc = results[0].status === 'fulfilled' ? results[0].value : (difficultyCache?.btc ?? 0)
    const ltc = results[1].status === 'fulfilled' ? results[1].value : (difficultyCache?.ltc ?? 0)
    const doge = results[2].status === 'fulfilled' ? results[2].value : (difficultyCache?.doge ?? 0)

    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(`Current difficulty fetch failed for ${['BTC','LTC','DOGE'][i]}:`, r.reason)
      }
    })

    difficultyCache = { btc, ltc, doge, fetchedAt: now }
    return NextResponse.json(difficultyCache)
  } catch (error) {
    console.error('Difficulty fetch error:', error)
    if (difficultyCache) {
      return NextResponse.json({ ...difficultyCache, stale: true })
    }
    return NextResponse.json({ error: 'Failed to fetch difficulty' }, { status: 500 })
  }
}
