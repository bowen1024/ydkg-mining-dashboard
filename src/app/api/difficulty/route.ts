import { NextResponse } from 'next/server'
import { DIFFICULTY_ENDPOINTS } from '@/lib/constants'
import type { DifficultyData } from '@/lib/types'

let difficultyCache: DifficultyData | null = null
const CACHE_TTL = 60 * 60 * 1000

async function fetchDifficulty(url: string): Promise<number> {
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
  if (!res.ok) throw new Error(`Difficulty fetch failed: ${res.status}`)
  const text = await res.text()
  const value = parseFloat(text.trim())
  if (isNaN(value)) throw new Error(`Invalid difficulty value: ${text}`)
  return value
}

export async function GET() {
  try {
    const now = Date.now()
    if (difficultyCache && now - difficultyCache.fetchedAt < CACHE_TTL) {
      return NextResponse.json(difficultyCache)
    }

    const [btc, ltc, doge] = await Promise.all([
      fetchDifficulty(DIFFICULTY_ENDPOINTS.BTC),
      fetchDifficulty(DIFFICULTY_ENDPOINTS.LTC),
      fetchDifficulty(DIFFICULTY_ENDPOINTS.DOGE),
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
