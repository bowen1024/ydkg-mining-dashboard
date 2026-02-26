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

interface BlockchairResponse {
  data?: {
    difficulty?: number
  }
}

async function fetchBlockchairDifficulty(url: string, coin: string): Promise<number> {
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
  if (!res.ok) throw new Error(`${coin} difficulty fetch failed: ${res.status}`)
  const json = (await res.json()) as BlockchairResponse
  const difficulty = json?.data?.difficulty
  if (typeof difficulty !== 'number' || isNaN(difficulty)) {
    throw new Error(`Invalid ${coin} difficulty from Blockchair`)
  }
  return difficulty
}

export async function GET() {
  try {
    const now = Date.now()
    if (difficultyCache && now - difficultyCache.fetchedAt < CACHE_TTL) {
      return NextResponse.json(difficultyCache)
    }

    const [btc, ltc, doge] = await Promise.all([
      fetchBtcDifficulty(),
      fetchBlockchairDifficulty(DIFFICULTY_ENDPOINTS.LTC, 'LTC'),
      fetchBlockchairDifficulty(DIFFICULTY_ENDPOINTS.DOGE, 'DOGE'),
    ])

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
