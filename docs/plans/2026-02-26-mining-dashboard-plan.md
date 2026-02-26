# YDKG Mining Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a personal mining dashboard that calculates and displays theoretical daily mining revenue for 6 ASIC miner models, deployed on Cloudflare Workers.

**Architecture:** Next.js 15 App Router with server-side API routes that proxy CoinGecko (prices) and blockchain explorers (difficulty). Miner configuration stored in Cloudflare KV. Revenue calculation performed client-side. Swiss Design financial aesthetic with shadcn/ui.

**Tech Stack:** Next.js 15, Tailwind CSS, shadcn/ui, Recharts, Cloudflare Workers (via @opennextjs/cloudflare), Cloudflare KV, CoinGecko API, Vitest

**Design doc:** `docs/plans/2026-02-26-mining-dashboard-design.md`

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`
- Create: `wrangler.jsonc` (Cloudflare config)
- Create: `.env.local` (local dev env vars)
- Create: `.gitignore`

**Step 1: Create Next.js project with Tailwind**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Accept defaults. This creates the full Next.js scaffold.

**Step 2: Install shadcn/ui**

```bash
npx shadcn@latest init
```

Select: New York style, Zinc base color, CSS variables = yes.

**Step 3: Install additional dependencies**

```bash
npm install recharts react-day-picker date-fns
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitejs/plugin-react
```

**Step 4: Install Cloudflare tooling**

```bash
npm install -D @opennextjs/cloudflare wrangler
```

**Step 5: Create wrangler.jsonc**

```jsonc
// wrangler.jsonc
{
  "name": "ydkg-mining-dashboard",
  "main": ".open-next/worker.js",
  "compatibility_date": "2025-04-01",
  "compatibility_flags": ["nodejs_compat"],
  "kv_namespaces": [
    {
      "binding": "MINER_CONFIG",
      "id": "placeholder-fill-after-create"
    }
  ],
  "vars": {
    "COINGECKO_API_KEY": ""
  }
}
```

**Step 6: Create vitest config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

Create `src/test/setup.ts`:

```typescript
import '@testing-library/jest-dom/vitest'
```

**Step 7: Add scripts to package.json**

Add to `"scripts"`:

```json
{
  "test": "vitest",
  "test:run": "vitest run",
  "build:cf": "npx @opennextjs/cloudflare build",
  "deploy": "npm run build:cf && wrangler deploy"
}
```

**Step 8: Create .env.local**

```
COINGECKO_API_KEY=your_key_here
```

**Step 9: Verify dev server runs**

```bash
npm run dev
```

Expected: Next.js starts on localhost:3000

**Step 10: Commit**

```bash
git add -A && git commit -m "feat: scaffold Next.js project with Tailwind, shadcn, Recharts, Vitest, and Cloudflare tooling"
```

---

## Task 2: Core Types and Constants

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/constants.ts`
- Test: `src/lib/__tests__/types.test.ts`

**Step 1: Write type definitions**

Create `src/lib/types.ts`:

```typescript
export type Algorithm = 'scrypt' | 'sha256'
export type HashrateUnit = 'Gh/s' | 'Th/s'
export type Coin = 'BTC' | 'LTC' | 'DOGE'

export interface MinerConfig {
  id: string
  name: string
  algorithm: Algorithm
  coins: Coin[]
  hashrate: number
  hashrateUnit: HashrateUnit
  power: number // watts
  quantity: number
  electricityRate: number // $/kWh
}

export interface MinersStore {
  miners: MinerConfig[]
}

export interface OHLCCandle {
  timestamp: number // unix ms
  open: number
  high: number
  low: number
  close: number
}

export interface DailyPrice {
  date: string // YYYY-MM-DD
  price: number // close price in USD
}

export interface DifficultyData {
  btc: number
  ltc: number
  doge: number
  fetchedAt: number // unix ms
}

export interface DailyRevenue {
  date: string // YYYY-MM-DD
  coinOutputs: Record<Coin, number> // coins mined per day (single machine)
  revenue: number // USD (all machines)
  electricityCost: number // USD (all machines)
  profit: number // USD
}

export interface MinerDailyData {
  miner: MinerConfig
  dailyRevenues: DailyRevenue[]
  totalRevenue: number
  totalElectricityCost: number
  totalProfit: number
}

export interface DateRange {
  from: Date
  to: Date
}
```

**Step 2: Write constants**

Create `src/lib/constants.ts`:

```typescript
import type { MinerConfig } from './types'

// Block rewards (update when halvings occur)
export const BLOCK_REWARDS = {
  BTC: 3.125, // post-2024 halving
  LTC: 6.25, // post-2023 halving
  DOGE: 10000,
} as const

// Default initial miner configs
export const DEFAULT_MINERS: MinerConfig[] = [
  {
    id: 'd1-silver-16.2',
    name: 'D1 Silver 16.2Gh/s',
    algorithm: 'scrypt',
    coins: ['LTC', 'DOGE'],
    hashrate: 16.2,
    hashrateUnit: 'Gh/s',
    power: 3510,
    quantity: 3,
    electricityRate: 0.05,
  },
  {
    id: 'd1-lite-14',
    name: 'D1 Lite 14Gh/s',
    algorithm: 'scrypt',
    coins: ['LTC', 'DOGE'],
    hashrate: 14,
    hashrateUnit: 'Gh/s',
    power: 3000,
    quantity: 2,
    electricityRate: 0.05,
  },
  {
    id: 's21pro-245',
    name: 'S21 Pro 245Th/s',
    algorithm: 'sha256',
    coins: ['BTC'],
    hashrate: 245,
    hashrateUnit: 'Th/s',
    power: 3531,
    quantity: 2,
    electricityRate: 0.06,
  },
  {
    id: 's21pro-234',
    name: 'S21 Pro 234Th/s',
    algorithm: 'sha256',
    coins: ['BTC'],
    hashrate: 234,
    hashrateUnit: 'Th/s',
    power: 3400,
    quantity: 1,
    electricityRate: 0.06,
  },
  {
    id: 's21plus-234',
    name: 'S21+ 234Th/s',
    algorithm: 'sha256',
    coins: ['BTC'],
    hashrate: 234,
    hashrateUnit: 'Th/s',
    power: 3400,
    quantity: 2,
    electricityRate: 0.06,
  },
  {
    id: 's21plus-220',
    name: 'S21+ 220Th/s',
    algorithm: 'sha256',
    coins: ['BTC'],
    hashrate: 220,
    hashrateUnit: 'Th/s',
    power: 3200,
    quantity: 1,
    electricityRate: 0.06,
  },
]

// CoinGecko IDs
export const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  LTC: 'litecoin',
  DOGE: 'dogecoin',
}

// Difficulty API endpoints
export const DIFFICULTY_ENDPOINTS = {
  BTC: 'https://blockchain.info/q/getdifficulty',
  LTC: 'https://chainz.cryptoid.info/ltc/api.dws?q=getdifficulty',
  DOGE: 'https://chainz.cryptoid.info/doge/api.dws?q=getdifficulty',
} as const

// Cache durations in ms
export const CACHE_DURATION = {
  PRICES: 5 * 60 * 1000, // 5 minutes
  DIFFICULTY: 60 * 60 * 1000, // 1 hour
} as const
```

**Step 3: Write a basic type validation test**

Create `src/lib/__tests__/types.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { DEFAULT_MINERS, BLOCK_REWARDS } from '../constants'
import type { MinerConfig } from '../types'

describe('MinerConfig types and constants', () => {
  it('should have 6 default miner configs', () => {
    expect(DEFAULT_MINERS).toHaveLength(6)
  })

  it('each miner should have all required fields', () => {
    const requiredFields: (keyof MinerConfig)[] = [
      'id', 'name', 'algorithm', 'coins', 'hashrate',
      'hashrateUnit', 'power', 'quantity', 'electricityRate',
    ]
    DEFAULT_MINERS.forEach((miner) => {
      requiredFields.forEach((field) => {
        expect(miner).toHaveProperty(field)
      })
    })
  })

  it('scrypt miners should mine LTC and DOGE', () => {
    const scryptMiners = DEFAULT_MINERS.filter((m) => m.algorithm === 'scrypt')
    expect(scryptMiners.length).toBeGreaterThan(0)
    scryptMiners.forEach((miner) => {
      expect(miner.coins).toContain('LTC')
      expect(miner.coins).toContain('DOGE')
      expect(miner.hashrateUnit).toBe('Gh/s')
    })
  })

  it('sha256 miners should mine BTC', () => {
    const sha256Miners = DEFAULT_MINERS.filter((m) => m.algorithm === 'sha256')
    expect(sha256Miners.length).toBeGreaterThan(0)
    sha256Miners.forEach((miner) => {
      expect(miner.coins).toContain('BTC')
      expect(miner.hashrateUnit).toBe('Th/s')
    })
  })

  it('block rewards should be defined for all coins', () => {
    expect(BLOCK_REWARDS.BTC).toBe(3.125)
    expect(BLOCK_REWARDS.LTC).toBe(6.25)
    expect(BLOCK_REWARDS.DOGE).toBe(10000)
  })
})
```

**Step 4: Run test**

```bash
npx vitest run src/lib/__tests__/types.test.ts
```

Expected: All 5 tests PASS

**Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/constants.ts src/lib/__tests__/types.test.ts vitest.config.ts src/test/setup.ts
git commit -m "feat: add core types, constants, and default miner configs"
```

---

## Task 3: Revenue Calculation Library (TDD)

**Files:**
- Create: `src/lib/calculate.ts`
- Test: `src/lib/__tests__/calculate.test.ts`

**Step 1: Write failing tests**

Create `src/lib/__tests__/calculate.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  calculateBtcPerDay,
  calculateLtcPerDay,
  calculateDogePerDay,
  calculateDailyElectricityCost,
  calculateDailyRevenue,
} from '../calculate'
import type { MinerConfig, DailyPrice, DifficultyData } from '../types'

describe('Mining revenue calculations', () => {
  // Known reference values for validation:
  // BTC difficulty ~113T, hashrate 245 TH/s → ~0.000056 BTC/day
  const btcDifficulty = 113_000_000_000_000

  describe('calculateBtcPerDay', () => {
    it('should calculate daily BTC output for given hashrate and difficulty', () => {
      const result = calculateBtcPerDay(245, btcDifficulty)
      // Formula: (245e12 * 86400 * 3.125) / (113e12 * 2^32)
      expect(result).toBeGreaterThan(0)
      expect(result).toBeLessThan(0.001) // sanity check: less than 0.001 BTC/day
    })

    it('should scale linearly with hashrate', () => {
      const result1 = calculateBtcPerDay(245, btcDifficulty)
      const result2 = calculateBtcPerDay(490, btcDifficulty)
      expect(result2).toBeCloseTo(result1 * 2, 10)
    })

    it('should return 0 for 0 hashrate', () => {
      expect(calculateBtcPerDay(0, btcDifficulty)).toBe(0)
    })
  })

  describe('calculateLtcPerDay', () => {
    const ltcDifficulty = 40_000_000 // ~40M
    it('should calculate daily LTC output', () => {
      const result = calculateLtcPerDay(16.2, ltcDifficulty)
      expect(result).toBeGreaterThan(0)
    })
  })

  describe('calculateDogePerDay', () => {
    const dogeDifficulty = 20_000_000 // ~20M
    it('should calculate daily DOGE output', () => {
      const result = calculateDogePerDay(16.2, dogeDifficulty)
      expect(result).toBeGreaterThan(0)
      expect(result).toBeGreaterThan(1) // should be many DOGE per day
    })
  })

  describe('calculateDailyElectricityCost', () => {
    it('should calculate daily electricity cost', () => {
      // 3510W * 24h / 1000 * $0.05/kWh * 3 machines = $12.636
      const cost = calculateDailyElectricityCost(3510, 0.05, 3)
      expect(cost).toBeCloseTo(12.636, 2)
    })

    it('should return 0 for 0 machines', () => {
      expect(calculateDailyElectricityCost(3510, 0.05, 0)).toBe(0)
    })
  })

  describe('calculateDailyRevenue', () => {
    const btcMiner: MinerConfig = {
      id: 'test-btc',
      name: 'Test BTC Miner',
      algorithm: 'sha256',
      coins: ['BTC'],
      hashrate: 245,
      hashrateUnit: 'Th/s',
      power: 3531,
      quantity: 2,
      electricityRate: 0.06,
    }

    const scryptMiner: MinerConfig = {
      id: 'test-scrypt',
      name: 'Test Scrypt Miner',
      algorithm: 'scrypt',
      coins: ['LTC', 'DOGE'],
      hashrate: 16.2,
      hashrateUnit: 'Gh/s',
      power: 3510,
      quantity: 3,
      electricityRate: 0.05,
    }

    const prices: Record<string, number> = {
      BTC: 90000,
      LTC: 100,
      DOGE: 0.25,
    }

    const difficulty: DifficultyData = {
      btc: 113_000_000_000_000,
      ltc: 40_000_000,
      doge: 20_000_000,
      fetchedAt: Date.now(),
    }

    it('should calculate BTC miner daily revenue with profit', () => {
      const result = calculateDailyRevenue(btcMiner, prices, difficulty, '2026-02-26')
      expect(result.date).toBe('2026-02-26')
      expect(result.coinOutputs.BTC).toBeGreaterThan(0)
      expect(result.revenue).toBeGreaterThan(0)
      expect(result.electricityCost).toBeGreaterThan(0)
      expect(result.profit).toBe(result.revenue - result.electricityCost)
    })

    it('should calculate Scrypt miner revenue with LTC + DOGE', () => {
      const result = calculateDailyRevenue(scryptMiner, prices, difficulty, '2026-02-26')
      expect(result.coinOutputs.LTC).toBeGreaterThan(0)
      expect(result.coinOutputs.DOGE).toBeGreaterThan(0)
      expect(result.revenue).toBeGreaterThan(0)
    })
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/__tests__/calculate.test.ts
```

Expected: FAIL — module `../calculate` not found

**Step 3: Write implementation**

Create `src/lib/calculate.ts`:

```typescript
import { BLOCK_REWARDS } from './constants'
import type { Coin, MinerConfig, DailyRevenue, DifficultyData } from './types'

const TWO_POW_32 = 2 ** 32
const SECONDS_PER_DAY = 86400

/**
 * Calculate daily BTC output for a single miner.
 * Formula: (hashrate_TH * 1e12 * 86400 * blockReward) / (difficulty * 2^32)
 */
export function calculateBtcPerDay(hashrateTH: number, difficulty: number): number {
  if (hashrateTH === 0 || difficulty === 0) return 0
  return (hashrateTH * 1e12 * SECONDS_PER_DAY * BLOCK_REWARDS.BTC) / (difficulty * TWO_POW_32)
}

/**
 * Calculate daily LTC output for a single miner.
 * Formula: (hashrate_GH * 1e9 * 86400 * blockReward) / (difficulty * 2^32)
 */
export function calculateLtcPerDay(hashrateGH: number, difficulty: number): number {
  if (hashrateGH === 0 || difficulty === 0) return 0
  return (hashrateGH * 1e9 * SECONDS_PER_DAY * BLOCK_REWARDS.LTC) / (difficulty * TWO_POW_32)
}

/**
 * Calculate daily DOGE output for a single miner (merged mining with LTC).
 * Formula: (hashrate_GH * 1e9 * 86400 * blockReward) / (difficulty * 2^32)
 */
export function calculateDogePerDay(hashrateGH: number, difficulty: number): number {
  if (hashrateGH === 0 || difficulty === 0) return 0
  return (hashrateGH * 1e9 * SECONDS_PER_DAY * BLOCK_REWARDS.DOGE) / (difficulty * TWO_POW_32)
}

/**
 * Calculate daily electricity cost for all machines of one model.
 * Formula: (watts / 1000) * 24 * rate * quantity
 */
export function calculateDailyElectricityCost(
  powerWatts: number,
  electricityRate: number,
  quantity: number
): number {
  return (powerWatts / 1000) * 24 * electricityRate * quantity
}

/**
 * Calculate full daily revenue breakdown for a miner model.
 */
export function calculateDailyRevenue(
  miner: MinerConfig,
  prices: Record<string, number>,
  difficulty: DifficultyData,
  date: string
): DailyRevenue {
  const coinOutputs: Record<Coin, number> = { BTC: 0, LTC: 0, DOGE: 0 }
  let revenue = 0

  if (miner.algorithm === 'sha256') {
    const btcPerDay = calculateBtcPerDay(miner.hashrate, difficulty.btc)
    coinOutputs.BTC = btcPerDay
    revenue = btcPerDay * (prices.BTC || 0) * miner.quantity
  } else if (miner.algorithm === 'scrypt') {
    const ltcPerDay = calculateLtcPerDay(miner.hashrate, difficulty.ltc)
    const dogePerDay = calculateDogePerDay(miner.hashrate, difficulty.doge)
    coinOutputs.LTC = ltcPerDay
    coinOutputs.DOGE = dogePerDay
    revenue =
      (ltcPerDay * (prices.LTC || 0) + dogePerDay * (prices.DOGE || 0)) * miner.quantity
  }

  const electricityCost = calculateDailyElectricityCost(
    miner.power,
    miner.electricityRate,
    miner.quantity
  )

  return {
    date,
    coinOutputs,
    revenue,
    electricityCost,
    profit: revenue - electricityCost,
  }
}
```

**Step 4: Run tests**

```bash
npx vitest run src/lib/__tests__/calculate.test.ts
```

Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/lib/calculate.ts src/lib/__tests__/calculate.test.ts
git commit -m "feat: add mining revenue calculation library with tests"
```

---

## Task 4: API Route — /api/config (Miner Config CRUD)

**Files:**
- Create: `src/app/api/config/route.ts`
- Create: `src/lib/kv.ts` (KV helper with local fallback)

**Step 1: Create KV helper with local dev fallback**

Create `src/lib/kv.ts`:

```typescript
import type { MinersStore } from './types'
import { DEFAULT_MINERS } from './constants'

const KV_KEY = 'miners'

/**
 * Get the KV binding. In Cloudflare Workers, this comes from env.
 * In local dev, we use a file-based fallback via process.env.
 */

// Local dev fallback: use in-memory store
let localStore: MinersStore | null = null

export async function getMiners(kvBinding?: KVNamespace): Promise<MinersStore> {
  if (kvBinding) {
    const data = await kvBinding.get(KV_KEY, 'json')
    if (data) return data as MinersStore
    // Initialize with defaults if empty
    const defaults: MinersStore = { miners: DEFAULT_MINERS }
    await kvBinding.put(KV_KEY, JSON.stringify(defaults))
    return defaults
  }

  // Local dev fallback
  if (!localStore) {
    localStore = { miners: DEFAULT_MINERS }
  }
  return localStore
}

export async function saveMiners(
  store: MinersStore,
  kvBinding?: KVNamespace
): Promise<void> {
  if (kvBinding) {
    await kvBinding.put(KV_KEY, JSON.stringify(store))
    return
  }
  // Local dev fallback
  localStore = store
}
```

**Step 2: Create API route**

Create `src/app/api/config/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getMiners, saveMiners } from '@/lib/kv'
import type { MinersStore } from '@/lib/types'

// Helper to get KV binding from Cloudflare env
function getKV(): KVNamespace | undefined {
  try {
    // In Cloudflare Workers, env is available via process.env at build time
    // or via getRequestContext from @opennextjs/cloudflare
    const { getRequestContext } = require('@opennextjs/cloudflare')
    return getRequestContext().env.MINER_CONFIG
  } catch {
    return undefined // local dev
  }
}

export async function GET() {
  try {
    const kv = getKV()
    const data = await getMiners(kv)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to get miners config:', error)
    return NextResponse.json({ error: 'Failed to load config' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const kv = getKV()
    const body: MinersStore = await request.json()

    // Validate
    if (!body.miners || !Array.isArray(body.miners)) {
      return NextResponse.json({ error: 'Invalid config format' }, { status: 400 })
    }

    await saveMiners(body, kv)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to save miners config:', error)
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 })
  }
}
```

**Step 3: Verify API route works**

```bash
npm run dev &
sleep 3
curl http://localhost:3000/api/config | jq .
```

Expected: JSON with 6 default miners

**Step 4: Commit**

```bash
git add src/lib/kv.ts src/app/api/config/route.ts
git commit -m "feat: add /api/config route with KV storage and local fallback"
```

---

## Task 5: API Route — /api/prices (CoinGecko Proxy)

**Files:**
- Create: `src/app/api/prices/route.ts`
- Create: `src/lib/coingecko.ts`

**Step 1: Create CoinGecko client**

Create `src/lib/coingecko.ts`:

```typescript
import { COINGECKO_IDS } from './constants'
import type { DailyPrice } from './types'

const BASE_URL = 'https://api.coingecko.com/api/v3'

function getHeaders(): HeadersInit {
  const apiKey = process.env.COINGECKO_API_KEY
  if (apiKey) {
    return {
      'x-cg-demo-api-key': apiKey,
      'Accept': 'application/json',
    }
  }
  return { Accept: 'application/json' }
}

/**
 * Get current real-time prices for BTC, LTC, DOGE.
 */
export async function getCurrentPrices(): Promise<Record<string, number>> {
  const ids = Object.values(COINGECKO_IDS).join(',')
  const res = await fetch(
    `${BASE_URL}/simple/price?ids=${ids}&vs_currencies=usd`,
    { headers: getHeaders() }
  )

  if (!res.ok) throw new Error(`CoinGecko price fetch failed: ${res.status}`)
  const data = await res.json()

  return {
    BTC: data.bitcoin?.usd || 0,
    LTC: data.litecoin?.usd || 0,
    DOGE: data.dogecoin?.usd || 0,
  }
}

/**
 * Get historical daily OHLC data for a coin.
 * Returns close prices per day.
 * For days > 30, CoinGecko returns daily candles.
 */
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
  const data: number[][] = await res.json()

  return data.map((candle) => {
    const [timestamp, , , , close] = candle
    const date = new Date(timestamp).toISOString().split('T')[0]
    return { date, price: close }
  })
}
```

**Step 2: Create API route**

Create `src/app/api/prices/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentPrices, getHistoricalPrices } from '@/lib/coingecko'

// Simple in-memory cache
let priceCache: { data: Record<string, number>; fetchedAt: number } | null = null
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('mode') || 'current' // 'current' or 'historical'
  const coin = searchParams.get('coin') // BTC, LTC, DOGE
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

    // Current prices with cache
    const now = Date.now()
    if (priceCache && now - priceCache.fetchedAt < CACHE_TTL) {
      return NextResponse.json({ prices: priceCache.data, cached: true })
    }

    const prices = await getCurrentPrices()
    priceCache = { data: prices, fetchedAt: now }
    return NextResponse.json({ prices, cached: false })
  } catch (error) {
    console.error('Price fetch error:', error)
    // Return stale cache if available
    if (priceCache) {
      return NextResponse.json({ prices: priceCache.data, cached: true, stale: true })
    }
    return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 })
  }
}
```

**Step 3: Verify**

```bash
curl "http://localhost:3000/api/prices" | jq .
curl "http://localhost:3000/api/prices?mode=historical&coin=BTC&days=31" | jq .
```

Expected: JSON with current prices; JSON with array of daily close prices

**Step 4: Commit**

```bash
git add src/lib/coingecko.ts src/app/api/prices/route.ts
git commit -m "feat: add /api/prices route with CoinGecko proxy and caching"
```

---

## Task 6: API Route — /api/difficulty

**Files:**
- Create: `src/app/api/difficulty/route.ts`

**Step 1: Create difficulty API route**

Create `src/app/api/difficulty/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { DIFFICULTY_ENDPOINTS } from '@/lib/constants'
import type { DifficultyData } from '@/lib/types'

// In-memory cache
let difficultyCache: DifficultyData | null = null
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

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

    // Return cache if fresh
    if (difficultyCache && now - difficultyCache.fetchedAt < CACHE_TTL) {
      return NextResponse.json(difficultyCache)
    }

    // Fetch all difficulties in parallel
    const [btc, ltc, doge] = await Promise.all([
      fetchDifficulty(DIFFICULTY_ENDPOINTS.BTC),
      fetchDifficulty(DIFFICULTY_ENDPOINTS.LTC),
      fetchDifficulty(DIFFICULTY_ENDPOINTS.DOGE),
    ])

    difficultyCache = { btc, ltc, doge, fetchedAt: now }
    return NextResponse.json(difficultyCache)
  } catch (error) {
    console.error('Difficulty fetch error:', error)
    // Return stale cache if available
    if (difficultyCache) {
      return NextResponse.json({ ...difficultyCache, stale: true })
    }
    return NextResponse.json({ error: 'Failed to fetch difficulty' }, { status: 500 })
  }
}
```

**Step 2: Verify**

```bash
curl http://localhost:3000/api/difficulty | jq .
```

Expected: JSON with `{ btc: number, ltc: number, doge: number, fetchedAt: number }`

**Step 3: Commit**

```bash
git add src/app/api/difficulty/route.ts
git commit -m "feat: add /api/difficulty route for BTC/LTC/DOGE network difficulty"
```

---

## Task 7: Install shadcn Components + Layout Shell

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/app/globals.css` (update with Swiss Design tokens)
- Create: `src/components/layout/header.tsx`

**Step 1: Install needed shadcn components**

```bash
npx shadcn@latest add button card tabs input select label popover calendar table badge separator dialog form
```

**Step 2: Update global CSS for Swiss Design**

Update `src/app/globals.css` — add Inter font import at top and adjust CSS variables for a monochrome + accent scheme:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

/* Swiss Design: restrained palette, strong typography */
@layer base {
  :root {
    --background: 0 0% 98%;
    --foreground: 0 0% 5%;
    --card: 0 0% 100%;
    --card-foreground: 0 0% 5%;
    --primary: 0 0% 9%;
    --primary-foreground: 0 0% 98%;
    --secondary: 0 0% 93%;
    --secondary-foreground: 0 0% 9%;
    --muted: 0 0% 96%;
    --muted-foreground: 0 0% 45%;
    --accent: 0 0% 93%;
    --accent-foreground: 0 0% 9%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 89%;
    --input: 0 0% 89%;
    --ring: 0 0% 5%;
    --radius: 0.25rem;

    /* Custom tokens */
    --profit: 142 71% 45%;
    --loss: 0 84% 60%;
  }
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  -webkit-font-smoothing: antialiased;
}
```

**Step 3: Create header component**

Create `src/components/layout/header.tsx`:

```tsx
import Link from 'next/link'
import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Header() {
  return (
    <header className="border-b border-border">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold tracking-tight">
            YDKG
          </h1>
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
            Mining Dashboard
          </span>
        </div>
        <Link href="/settings">
          <Button variant="ghost" size="sm" className="gap-2 text-xs">
            <Settings className="h-3.5 w-3.5" />
            设置
          </Button>
        </Link>
      </div>
    </header>
  )
}
```

**Step 4: Update layout.tsx**

Update `src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next'
import { Header } from '@/components/layout/header'
import './globals.css'

export const metadata: Metadata = {
  title: 'YDKG Mining Dashboard',
  description: 'Mining revenue calculator and dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Header />
        <main className="max-w-7xl mx-auto px-6 py-6">
          {children}
        </main>
      </body>
    </html>
  )
}
```

**Step 5: Create minimal home page**

Update `src/app/page.tsx`:

```tsx
export default function Home() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">Dashboard loading...</p>
    </div>
  )
}
```

**Step 6: Install lucide-react icon library**

```bash
npm install lucide-react
```

**Step 7: Verify**

```bash
npm run dev
```

Open http://localhost:3000 — should see header with "YDKG Mining Dashboard" and Settings button.

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: add layout shell with Swiss Design tokens and header"
```

---

## Task 8: Date Selector Component

**Files:**
- Create: `src/components/date-selector.tsx`
- Create: `src/lib/date-utils.ts`

**Step 1: Create date utility functions**

Create `src/lib/date-utils.ts`:

```typescript
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  subDays,
  format,
  eachDayOfInterval,
  min,
} from 'date-fns'
import type { DateRange } from './types'

export type DatePreset = 'this-month' | 'last-month' | 'last-7' | 'last-30' | 'custom'

export function getPresetRange(preset: DatePreset): DateRange {
  const today = new Date()

  switch (preset) {
    case 'this-month':
      return { from: startOfMonth(today), to: min([today, endOfMonth(today)]) }
    case 'last-month': {
      const lastMonth = subMonths(today, 1)
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) }
    }
    case 'last-7':
      return { from: subDays(today, 6), to: today }
    case 'last-30':
      return { from: subDays(today, 29), to: today }
    default:
      return { from: startOfMonth(today), to: today }
  }
}

export function getPresetLabel(preset: DatePreset): string {
  switch (preset) {
    case 'this-month': return '本月'
    case 'last-month': return '上月'
    case 'last-7': return '最近 7 天'
    case 'last-30': return '最近 30 天'
    case 'custom': return '自定义'
  }
}

export function formatDateRange(range: DateRange): string {
  return `${format(range.from, 'yyyy-MM-dd')} — ${format(range.to, 'yyyy-MM-dd')}`
}

export function getDaysInRange(range: DateRange): string[] {
  return eachDayOfInterval({ start: range.from, end: range.to }).map(
    (d) => format(d, 'yyyy-MM-dd')
  )
}
```

**Step 2: Create date selector component**

Create `src/components/date-selector.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  type DatePreset,
  getPresetRange,
  getPresetLabel,
} from '@/lib/date-utils'
import type { DateRange } from '@/lib/types'

const PRESETS: DatePreset[] = ['this-month', 'last-month', 'last-7', 'last-30', 'custom']

interface DateSelectorProps {
  dateRange: DateRange
  onDateRangeChange: (range: DateRange) => void
}

export function DateSelector({ dateRange, onDateRangeChange }: DateSelectorProps) {
  const [preset, setPreset] = useState<DatePreset>('this-month')
  const [calendarOpen, setCalendarOpen] = useState(false)

  function handlePresetClick(p: DatePreset) {
    setPreset(p)
    if (p !== 'custom') {
      onDateRangeChange(getPresetRange(p))
    } else {
      setCalendarOpen(true)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        日期
      </span>
      <div className="flex gap-1">
        {PRESETS.map((p) => (
          <Button
            key={p}
            variant={preset === p ? 'default' : 'outline'}
            size="sm"
            className="text-xs h-7 px-2.5"
            onClick={() => handlePresetClick(p)}
          >
            {getPresetLabel(p)}
          </Button>
        ))}
      </div>

      {preset === 'custom' && (
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs h-7 gap-1.5">
              <CalendarIcon className="h-3 w-3" />
              {format(dateRange.from, 'MM/dd')} — {format(dateRange.to, 'MM/dd')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  onDateRangeChange({ from: range.from, to: range.to })
                }
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      )}

      <span className="text-xs text-muted-foreground tabular-nums">
        {format(dateRange.from, 'yyyy-MM-dd')} — {format(dateRange.to, 'yyyy-MM-dd')}
      </span>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/components/date-selector.tsx src/lib/date-utils.ts
git commit -m "feat: add date selector component with presets and custom range"
```

---

## Task 9: Data Fetching Hooks

**Files:**
- Create: `src/hooks/use-miners.ts`
- Create: `src/hooks/use-market-data.ts`

**Step 1: Create miner config hook**

Create `src/hooks/use-miners.ts`:

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import type { MinerConfig, MinersStore } from '@/lib/types'

export function useMiners() {
  const [miners, setMiners] = useState<MinerConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMiners = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/config')
      if (!res.ok) throw new Error('Failed to fetch config')
      const data: MinersStore = await res.json()
      setMiners(data.miners)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  const saveMiners = useCallback(async (updatedMiners: MinerConfig[]) => {
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ miners: updatedMiners }),
      })
      if (!res.ok) throw new Error('Failed to save config')
      setMiners(updatedMiners)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
      throw err
    }
  }, [])

  const updateMinerElectricityRate = useCallback(
    async (minerId: string, rate: number) => {
      const updated = miners.map((m) =>
        m.id === minerId ? { ...m, electricityRate: rate } : m
      )
      await saveMiners(updated)
    },
    [miners, saveMiners]
  )

  useEffect(() => {
    fetchMiners()
  }, [fetchMiners])

  return { miners, loading, error, saveMiners, updateMinerElectricityRate, refetch: fetchMiners }
}
```

**Step 2: Create market data hook**

Create `src/hooks/use-market-data.ts`:

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import type { DifficultyData, DailyPrice } from '@/lib/types'

interface MarketData {
  currentPrices: Record<string, number>
  difficulty: DifficultyData | null
  historicalPrices: Record<string, DailyPrice[]> // keyed by coin
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
```

**Step 3: Commit**

```bash
git add src/hooks/use-miners.ts src/hooks/use-market-data.ts
git commit -m "feat: add data fetching hooks for miners config and market data"
```

---

## Task 10: Summary Cards Component

**Files:**
- Create: `src/components/summary-cards.tsx`

**Step 1: Create summary cards**

Create `src/components/summary-cards.tsx`:

```tsx
import { Card, CardContent } from '@/components/ui/card'
import type { MinerDailyData } from '@/lib/types'

interface SummaryCardsProps {
  allMinerData: MinerDailyData[]
}

function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

export function SummaryCards({ allMinerData }: SummaryCardsProps) {
  const totalRevenue = allMinerData.reduce((sum, m) => sum + m.totalRevenue, 0)
  const totalElectricity = allMinerData.reduce((sum, m) => sum + m.totalElectricityCost, 0)
  const totalProfit = totalRevenue - totalElectricity
  const profitMargin = totalRevenue > 0 ? totalProfit / totalRevenue : 0

  const metrics = [
    { label: '总收入', value: formatUSD(totalRevenue), sublabel: 'Total Revenue' },
    { label: '总电费', value: formatUSD(totalElectricity), sublabel: 'Electricity' },
    {
      label: '净利润',
      value: formatUSD(totalProfit),
      sublabel: 'Net Profit',
      color: totalProfit >= 0 ? 'text-green-600' : 'text-red-600',
    },
    {
      label: '利润率',
      value: formatPercent(profitMargin),
      sublabel: 'Margin',
      color: profitMargin >= 0 ? 'text-green-600' : 'text-red-600',
    },
  ]

  return (
    <div className="grid grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <Card key={metric.label} className="border-border">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">
                {metric.label}
              </span>
              <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">
                {metric.sublabel}
              </span>
            </div>
            <p className={`text-2xl font-bold tabular-nums tracking-tight ${metric.color || ''}`}>
              {metric.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/summary-cards.tsx
git commit -m "feat: add summary cards component for total revenue/cost/profit"
```

---

## Task 11: Miner Tab Content — Chart + Table

**Files:**
- Create: `src/components/miner-tab-content.tsx`
- Create: `src/components/revenue-chart.tsx`
- Create: `src/components/revenue-table.tsx`

**Step 1: Create revenue chart**

Create `src/components/revenue-chart.tsx`:

```tsx
'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import type { DailyRevenue } from '@/lib/types'

interface RevenueChartProps {
  data: DailyRevenue[]
}

export function RevenueChart({ data }: RevenueChartProps) {
  const chartData = data.map((d) => ({
    date: d.date.slice(5), // MM-DD
    revenue: parseFloat(d.revenue.toFixed(2)),
    cost: parseFloat(d.electricityCost.toFixed(2)),
    profit: parseFloat(d.profit.toFixed(2)),
  }))

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${v}`}
          />
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '4px',
              fontSize: '12px',
            }}
            formatter={(value: number, name: string) => [
              `$${value.toFixed(2)}`,
              name === 'profit' ? '净利润' : name === 'revenue' ? '收入' : '电费',
            ]}
          />
          <ReferenceLine y={0} stroke="hsl(var(--border))" />
          <Bar dataKey="profit" fill="hsl(142, 71%, 45%)" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

**Step 2: Create revenue table**

Create `src/components/revenue-table.tsx`:

```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { DailyRevenue, MinerConfig } from '@/lib/types'

interface RevenueTableProps {
  data: DailyRevenue[]
  miner: MinerConfig
}

function fmt(n: number, decimals: number = 2): string {
  return n.toFixed(decimals)
}

function fmtUSD(n: number): string {
  return `$${n.toFixed(2)}`
}

export function RevenueTable({ data, miner }: RevenueTableProps) {
  const isScrypt = miner.algorithm === 'scrypt'

  return (
    <div className="border rounded-sm">
      <Table>
        <TableHeader>
          <TableRow className="text-xs">
            <TableHead className="w-[100px]">日期</TableHead>
            {isScrypt ? (
              <>
                <TableHead className="text-right">LTC 产出</TableHead>
                <TableHead className="text-right">DOGE 产出</TableHead>
              </>
            ) : (
              <TableHead className="text-right">BTC 产出</TableHead>
            )}
            <TableHead className="text-right">收入 Revenue</TableHead>
            <TableHead className="text-right">电费 Cost</TableHead>
            <TableHead className="text-right">净利润 Profit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.date} className="text-xs tabular-nums">
              <TableCell className="font-medium">{row.date}</TableCell>
              {isScrypt ? (
                <>
                  <TableCell className="text-right">{fmt(row.coinOutputs.LTC, 6)}</TableCell>
                  <TableCell className="text-right">{fmt(row.coinOutputs.DOGE, 2)}</TableCell>
                </>
              ) : (
                <TableCell className="text-right">{fmt(row.coinOutputs.BTC, 8)}</TableCell>
              )}
              <TableCell className="text-right">{fmtUSD(row.revenue)}</TableCell>
              <TableCell className="text-right text-muted-foreground">
                {fmtUSD(row.electricityCost)}
              </TableCell>
              <TableCell
                className={`text-right font-medium ${
                  row.profit >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {fmtUSD(row.profit)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
```

**Step 3: Create tab content wrapper**

Create `src/components/miner-tab-content.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Pencil, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { RevenueChart } from './revenue-chart'
import { RevenueTable } from './revenue-table'
import type { MinerDailyData } from '@/lib/types'

interface MinerTabContentProps {
  minerData: MinerDailyData
  onElectricityRateChange: (minerId: string, rate: number) => void
}

function fmtUSD(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(n)
}

export function MinerTabContent({
  minerData,
  onElectricityRateChange,
}: MinerTabContentProps) {
  const { miner, dailyRevenues, totalRevenue, totalElectricityCost, totalProfit } = minerData
  const [editingRate, setEditingRate] = useState(false)
  const [rateInput, setRateInput] = useState(String(miner.electricityRate))

  function handleSaveRate() {
    const val = parseFloat(rateInput)
    if (!isNaN(val) && val >= 0) {
      onElectricityRateChange(miner.id, val)
      setEditingRate(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Miner info bar */}
      <div className="flex items-center justify-between py-3 border-b">
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold">{miner.name}</span>
          <Badge variant="outline" className="text-[10px]">
            × {miner.quantity} 台
          </Badge>
          <span className="text-xs text-muted-foreground">
            {miner.hashrate} {miner.hashrateUnit}
          </span>
          <span className="text-xs text-muted-foreground">
            {miner.power}W
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">电价:</span>
          {editingRate ? (
            <div className="flex items-center gap-1">
              <Input
                className="h-6 w-20 text-xs"
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveRate()}
              />
              <span className="text-xs text-muted-foreground">$/kWh</span>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleSaveRate}>
                <Check className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-xs font-mono">${miner.electricityRate}/kWh</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => setEditingRate(true)}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Period summary */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
            Period Revenue
          </p>
          <p className="text-lg font-bold tabular-nums">{fmtUSD(totalRevenue)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
            Period Cost
          </p>
          <p className="text-lg font-bold tabular-nums text-muted-foreground">
            {fmtUSD(totalElectricityCost)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
            Period Profit
          </p>
          <p className={`text-lg font-bold tabular-nums ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {fmtUSD(totalProfit)}
          </p>
        </div>
      </div>

      {/* Chart */}
      <RevenueChart data={dailyRevenues} />

      {/* Table */}
      <RevenueTable data={dailyRevenues} miner={miner} />
    </div>
  )
}
```

**Step 4: Commit**

```bash
git add src/components/miner-tab-content.tsx src/components/revenue-chart.tsx src/components/revenue-table.tsx
git commit -m "feat: add miner tab content with revenue chart and table"
```

---

## Task 12: Main Dashboard Page — Wire Everything Together

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/lib/compute-daily-data.ts`

**Step 1: Create data computation helper**

Create `src/lib/compute-daily-data.ts`:

```typescript
import { calculateDailyRevenue } from './calculate'
import type {
  MinerConfig,
  DifficultyData,
  DailyPrice,
  DateRange,
  MinerDailyData,
} from './types'
import { getDaysInRange } from './date-utils'
import { format } from 'date-fns'

/**
 * For each day in the date range, compute daily revenue for a miner.
 * Uses historical close prices when available, falls back to current price.
 */
export function computeMinerDailyData(
  miner: MinerConfig,
  dateRange: DateRange,
  difficulty: DifficultyData,
  historicalPrices: Record<string, DailyPrice[]>,
  currentPrices: Record<string, number>
): MinerDailyData {
  const days = getDaysInRange(dateRange)
  const today = format(new Date(), 'yyyy-MM-dd')

  // Build price lookup maps: date → price
  const priceMaps: Record<string, Map<string, number>> = {}
  for (const coin of ['BTC', 'LTC', 'DOGE']) {
    const map = new Map<string, number>()
    const hist = historicalPrices[coin] || []
    for (const dp of hist) {
      map.set(dp.date, dp.price)
    }
    priceMaps[coin] = map
  }

  const dailyRevenues = days.map((day) => {
    // Use historical close price if available, otherwise current price
    const prices: Record<string, number> = {}
    for (const coin of ['BTC', 'LTC', 'DOGE']) {
      if (day === today) {
        prices[coin] = currentPrices[coin] || 0
      } else {
        prices[coin] = priceMaps[coin].get(day) || currentPrices[coin] || 0
      }
    }

    return calculateDailyRevenue(miner, prices, difficulty, day)
  })

  const totalRevenue = dailyRevenues.reduce((s, d) => s + d.revenue, 0)
  const totalElectricityCost = dailyRevenues.reduce((s, d) => s + d.electricityCost, 0)
  const totalProfit = totalRevenue - totalElectricityCost

  return { miner, dailyRevenues, totalRevenue, totalElectricityCost, totalProfit }
}
```

**Step 2: Build the full dashboard page**

Replace `src/app/page.tsx`:

```tsx
'use client'

import { useState, useMemo } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DateSelector } from '@/components/date-selector'
import { SummaryCards } from '@/components/summary-cards'
import { MinerTabContent } from '@/components/miner-tab-content'
import { useMiners } from '@/hooks/use-miners'
import { useMarketData } from '@/hooks/use-market-data'
import { computeMinerDailyData } from '@/lib/compute-daily-data'
import { getPresetRange } from '@/lib/date-utils'
import type { DateRange } from '@/lib/types'
import { differenceInDays } from 'date-fns'

export default function Home() {
  const [dateRange, setDateRange] = useState<DateRange>(getPresetRange('this-month'))
  const days = differenceInDays(dateRange.to, dateRange.from) + 1

  const { miners, loading: minersLoading, updateMinerElectricityRate } = useMiners()
  const {
    currentPrices,
    difficulty,
    historicalPrices,
    loading: marketLoading,
  } = useMarketData(Math.max(days, 31))

  const allMinerData = useMemo(() => {
    if (!difficulty || !miners.length) return []
    return miners.map((miner) =>
      computeMinerDailyData(miner, dateRange, difficulty, historicalPrices, currentPrices)
    )
  }, [miners, dateRange, difficulty, historicalPrices, currentPrices])

  const isLoading = minersLoading || marketLoading

  return (
    <div className="space-y-6">
      {/* Date Selector */}
      <DateSelector dateRange={dateRange} onDateRangeChange={setDateRange} />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-muted-foreground animate-pulse">
            Loading market data...
          </p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <SummaryCards allMinerData={allMinerData} />

          {/* Miner Tabs */}
          {allMinerData.length > 0 && (
            <Tabs defaultValue={allMinerData[0].miner.id} className="mt-6">
              <TabsList className="h-auto flex-wrap gap-1 bg-transparent p-0 border-b rounded-none pb-2">
                {allMinerData.map((md) => (
                  <TabsTrigger
                    key={md.miner.id}
                    value={md.miner.id}
                    className="text-xs data-[state=active]:bg-foreground data-[state=active]:text-background rounded-sm px-3 h-7"
                  >
                    {md.miner.name}
                  </TabsTrigger>
                ))}
              </TabsList>

              {allMinerData.map((md) => (
                <TabsContent key={md.miner.id} value={md.miner.id} className="mt-4">
                  <MinerTabContent
                    minerData={md}
                    onElectricityRateChange={updateMinerElectricityRate}
                  />
                </TabsContent>
              ))}
            </Tabs>
          )}
        </>
      )}
    </div>
  )
}
```

**Step 3: Verify**

```bash
npm run dev
```

Open http://localhost:3000 — should see full dashboard with date selector, summary cards, tabs, chart, and table.

**Step 4: Commit**

```bash
git add src/app/page.tsx src/lib/compute-daily-data.ts
git commit -m "feat: wire up main dashboard page with all components"
```

---

## Task 13: Settings Page

**Files:**
- Create: `src/app/settings/page.tsx`
- Create: `src/components/miner-form.tsx`

**Step 1: Create miner form component**

Create `src/components/miner-form.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { MinerConfig, Algorithm, HashrateUnit, Coin } from '@/lib/types'

interface MinerFormProps {
  initial?: MinerConfig
  onSave: (miner: MinerConfig) => void
  onCancel: () => void
}

const ALGORITHM_COINS: Record<Algorithm, { coins: Coin[]; unit: HashrateUnit }> = {
  scrypt: { coins: ['LTC', 'DOGE'], unit: 'Gh/s' },
  sha256: { coins: ['BTC'], unit: 'Th/s' },
}

export function MinerForm({ initial, onSave, onCancel }: MinerFormProps) {
  const [name, setName] = useState(initial?.name || '')
  const [algorithm, setAlgorithm] = useState<Algorithm>(initial?.algorithm || 'sha256')
  const [hashrate, setHashrate] = useState(String(initial?.hashrate || ''))
  const [power, setPower] = useState(String(initial?.power || ''))
  const [quantity, setQuantity] = useState(String(initial?.quantity || 1))
  const [electricityRate, setElectricityRate] = useState(
    String(initial?.electricityRate || 0.05)
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const { coins, unit } = ALGORITHM_COINS[algorithm]
    const hr = parseFloat(hashrate)
    const id = initial?.id || `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`

    onSave({
      id,
      name,
      algorithm,
      coins,
      hashrate: hr,
      hashrateUnit: unit,
      power: parseInt(power, 10),
      quantity: parseInt(quantity, 10),
      electricityRate: parseFloat(electricityRate),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">名称 Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. S21 Pro 245Th/s"
            required
          />
        </div>
        <div>
          <Label className="text-xs">算法 Algorithm</Label>
          <Select
            value={algorithm}
            onValueChange={(v) => setAlgorithm(v as Algorithm)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sha256">SHA-256 (BTC)</SelectItem>
              <SelectItem value="scrypt">Scrypt (LTC+DOGE)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">
            算力 Hashrate ({ALGORITHM_COINS[algorithm].unit})
          </Label>
          <Input
            type="number"
            step="0.1"
            value={hashrate}
            onChange={(e) => setHashrate(e.target.value)}
            required
          />
        </div>
        <div>
          <Label className="text-xs">功耗 Power (W)</Label>
          <Input
            type="number"
            value={power}
            onChange={(e) => setPower(e.target.value)}
            required
          />
        </div>
        <div>
          <Label className="text-xs">数量 Quantity</Label>
          <Input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </div>
        <div>
          <Label className="text-xs">电价 Electricity ($/kWh)</Label>
          <Input
            type="number"
            step="0.001"
            value={electricityRate}
            onChange={(e) => setElectricityRate(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" size="sm" className="text-xs">
          {initial ? '保存修改' : '添加矿机'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={onCancel}
        >
          取消
        </Button>
      </div>
    </form>
  )
}
```

**Step 2: Create settings page**

Create `src/app/settings/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MinerForm } from '@/components/miner-form'
import { useMiners } from '@/hooks/use-miners'
import type { MinerConfig } from '@/lib/types'

export default function SettingsPage() {
  const { miners, loading, saveMiners } = useMiners()
  const [editingMiner, setEditingMiner] = useState<MinerConfig | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  async function handleSave(miner: MinerConfig) {
    if (editingMiner) {
      // Update existing
      const updated = miners.map((m) => (m.id === editingMiner.id ? miner : m))
      await saveMiners(updated)
      setEditingMiner(null)
    } else {
      // Add new
      await saveMiners([...miners, miner])
      setIsAdding(false)
    }
  }

  async function handleDelete(id: string) {
    const updated = miners.filter((m) => m.id !== id)
    await saveMiners(updated)
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-1 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" />
            返回 Dashboard
          </Button>
        </Link>
        <h2 className="text-lg font-semibold">矿机设置</h2>
      </div>

      {/* Miner list */}
      <div className="space-y-3">
        {miners.map((miner) => (
          <Card key={miner.id} className="border-border">
            <CardContent className="py-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">{miner.name}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {miner.algorithm === 'scrypt' ? 'Scrypt' : 'SHA-256'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {miner.hashrate} {miner.hashrateUnit}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {miner.power}W
                  </span>
                  <span className="text-xs text-muted-foreground">
                    × {miner.quantity}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ${miner.electricityRate}/kWh
                  </span>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setEditingMiner(miner)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive"
                    onClick={() => handleDelete(miner.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add button */}
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs"
        onClick={() => setIsAdding(true)}
      >
        <Plus className="h-3.5 w-3.5" />
        添加矿机 Add Miner
      </Button>

      {/* Edit dialog */}
      <Dialog open={!!editingMiner} onOpenChange={() => setEditingMiner(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm">编辑矿机 Edit Miner</DialogTitle>
          </DialogHeader>
          {editingMiner && (
            <MinerForm
              initial={editingMiner}
              onSave={handleSave}
              onCancel={() => setEditingMiner(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Add dialog */}
      <Dialog open={isAdding} onOpenChange={() => setIsAdding(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm">添加矿机 Add Miner</DialogTitle>
          </DialogHeader>
          <MinerForm onSave={handleSave} onCancel={() => setIsAdding(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

**Step 3: Verify**

Open http://localhost:3000/settings — should see miner list with edit/delete and add button.

**Step 4: Commit**

```bash
git add src/app/settings/page.tsx src/components/miner-form.tsx
git commit -m "feat: add settings page with miner CRUD management"
```

---

## Task 14: Cloudflare Deployment Configuration

**Files:**
- Modify: `wrangler.jsonc`
- Modify: `next.config.ts`
- Create: `.dev.vars` (local secrets for wrangler)

**Step 1: Update next.config.ts for Cloudflare**

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Required for Cloudflare Workers compatibility
  // @opennextjs/cloudflare handles the rest
}

export default nextConfig
```

**Step 2: Create .dev.vars for local wrangler**

```
COINGECKO_API_KEY=your_key_here
```

**Step 3: Update .gitignore**

Ensure `.dev.vars` and `.env.local` are in `.gitignore`.

**Step 4: Test build**

```bash
npm run build
```

Expected: Next.js build succeeds.

**Step 5: Commit**

```bash
git add next.config.ts wrangler.jsonc .gitignore
git commit -m "feat: configure Cloudflare Workers deployment"
```

---

## Task 15: Final Integration Test & Polish

**Step 1: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass.

**Step 2: Run dev server and manually verify**

```bash
npm run dev
```

Checklist:
- [ ] Dashboard loads with 6 miner tabs
- [ ] Date selector works (presets + custom)
- [ ] Summary cards show totals
- [ ] Each tab shows chart + table
- [ ] Electricity rate inline editing works
- [ ] Settings page: add/edit/delete miners
- [ ] API routes return data correctly

**Step 3: Fix any issues found**

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete YDKG Mining Dashboard v1"
```

---

## Deployment Checklist (Post-Development)

1. Create CoinGecko account and get free API key
2. Create Cloudflare account (if not existing)
3. Run `wrangler kv namespace create MINER_CONFIG` — copy ID to wrangler.jsonc
4. Run `wrangler secret put COINGECKO_API_KEY` — paste your key
5. Run `npm run deploy`
6. Verify at deployed URL
