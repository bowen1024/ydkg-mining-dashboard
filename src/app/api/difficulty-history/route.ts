import { NextRequest, NextResponse } from 'next/server'

interface DailyDifficultyPoint {
  date: string       // YYYY-MM-DD
  difficulty: number
}

// ── BTC — blockchain.info charts API ─────────────────────────────────────────
// blockchain.info only returns one data point per ~2-week difficulty adjustment,
// so we forward-fill to produce one entry per day in the requested range.

async function fetchBtcDifficultyHistory(start: string, end: string): Promise<DailyDifficultyPoint[]> {
  // Add 20-day buffer before start to capture the adjustment that preceded it
  const startDt = new Date(start + 'T00:00:00Z')
  const todayDt = new Date()
  const daysBack = Math.ceil((todayDt.getTime() - startDt.getTime()) / 86400000) + 20

  const res = await fetch(
    `https://api.blockchain.info/charts/difficulty?timespan=${daysBack}days&format=json`,
    { signal: AbortSignal.timeout(15000) }
  )
  if (!res.ok) throw new Error(`BTC difficulty history fetch failed: ${res.status}`)
  const json = (await res.json()) as { values?: { x: number; y: number }[] }
  if (!Array.isArray(json.values)) throw new Error('Unexpected BTC difficulty history format')

  const points: DailyDifficultyPoint[] = json.values.map(({ x, y }) => ({
    date: new Date(x * 1000).toISOString().split('T')[0],
    difficulty: y,
  }))

  return forwardFillDaily(points, start, end)
}

// Forward-fill sparse adjustment points to produce one entry per calendar day.
// Each day carries the most recent adjustment value seen on or before that day.
function forwardFillDaily(
  points: DailyDifficultyPoint[],
  start: string,
  end: string
): DailyDifficultyPoint[] {
  if (points.length === 0) return []
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date))

  // Find the difficulty value in effect at the start date (last adjustment ≤ start)
  let lastDifficulty = sorted[0].difficulty
  let nextIdx = 0
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].date <= start) {
      lastDifficulty = sorted[i].difficulty
      nextIdx = i + 1
    } else {
      break
    }
  }

  const result: DailyDifficultyPoint[] = []
  const current = new Date(start + 'T00:00:00Z')
  const endDt = new Date(end + 'T00:00:00Z')

  while (current <= endDt) {
    const dateStr = current.toISOString().split('T')[0]
    // Apply any adjustments that occurred on or before this day
    while (nextIdx < sorted.length && sorted[nextIdx].date <= dateStr) {
      lastDifficulty = sorted[nextIdx].difficulty
      nextIdx++
    }
    result.push({ date: dateStr, difficulty: lastDifficulty })
    current.setUTCDate(current.getUTCDate() + 1)
  }

  return result
}

// ── LTC / DOGE — Blockchair avg(difficulty) aggregated by date ───────────────

async function fetchBlockchairDifficultyHistory(
  coin: 'litecoin' | 'dogecoin',
  start: string,
  end: string
): Promise<DailyDifficultyPoint[]> {
  const res = await fetch(
    `https://api.blockchair.com/${coin}/blocks?a=date,avg(difficulty)&q=time(${start}..${end})`,
    { signal: AbortSignal.timeout(15000) }
  )
  if (!res.ok) throw new Error(`${coin} difficulty history fetch failed: ${res.status}`)
  const json = (await res.json()) as {
    data?: { date: string; 'avg(difficulty)': number }[]
  }
  if (!Array.isArray(json.data)) throw new Error(`Unexpected ${coin} difficulty history format`)
  return json.data
    .map((row) => ({
      date: row.date,
      difficulty: row['avg(difficulty)'],
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

// ── Cache ─────────────────────────────────────────────────────────────────────

let cache: {
  start: string
  end: string
  BTC: DailyDifficultyPoint[]
  LTC: DailyDifficultyPoint[]
  DOGE: DailyDifficultyPoint[]
  fetchedAt: number
} | null = null

const CACHE_TTL = 60 * 60 * 1000 // 1 hour

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  // Accept explicit start/end dates (preferred) or fall back to days-from-today
  let start = searchParams.get('start') ?? ''
  let end = searchParams.get('end') ?? ''

  if (!start || !end) {
    const days = Math.min(parseInt(searchParams.get('days') || '31', 10), 365)
    const endDt = new Date()
    const startDt = new Date(endDt)
    startDt.setUTCDate(startDt.getUTCDate() - days)
    start = startDt.toISOString().split('T')[0]
    end = endDt.toISOString().split('T')[0]
  }

  try {
    const now = Date.now()
    if (cache && cache.start === start && cache.end === end && now - cache.fetchedAt < CACHE_TTL) {
      return NextResponse.json({ BTC: cache.BTC, LTC: cache.LTC, DOGE: cache.DOGE })
    }

    const results = await Promise.allSettled([
      fetchBtcDifficultyHistory(start, end),
      fetchBlockchairDifficultyHistory('litecoin', start, end),
      fetchBlockchairDifficultyHistory('dogecoin', start, end),
    ])

    const BTC = results[0].status === 'fulfilled' ? results[0].value : (cache?.BTC ?? [])
    const LTC = results[1].status === 'fulfilled' ? results[1].value : (cache?.LTC ?? [])
    const DOGE = results[2].status === 'fulfilled' ? results[2].value : (cache?.DOGE ?? [])

    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(`Difficulty history fetch failed for ${['BTC', 'LTC', 'DOGE'][i]}:`, r.reason)
      }
    })

    cache = { start, end, BTC, LTC, DOGE, fetchedAt: now }
    return NextResponse.json({ BTC, LTC, DOGE })
  } catch (error) {
    console.error('Difficulty history error:', error)
    if (cache) {
      return NextResponse.json({ BTC: cache.BTC, LTC: cache.LTC, DOGE: cache.DOGE })
    }
    return NextResponse.json({ BTC: [], LTC: [], DOGE: [] })
  }
}
