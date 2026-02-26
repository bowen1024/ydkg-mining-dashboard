import type { MinerConfig } from './types'

export const BLOCK_REWARDS = {
  BTC: 3.125,
  LTC: 6.25,
  DOGE: 10000,
} as const

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

export const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  LTC: 'litecoin',
  DOGE: 'dogecoin',
}

export const DIFFICULTY_ENDPOINTS = {
  BTC: 'https://blockchain.info/q/getdifficulty',
  LTC: 'https://chainz.cryptoid.info/ltc/api.dws?q=getdifficulty',
  DOGE: 'https://chainz.cryptoid.info/doge/api.dws?q=getdifficulty',
} as const

export const CACHE_DURATION = {
  PRICES: 5 * 60 * 1000,
  DIFFICULTY: 60 * 60 * 1000,
} as const
