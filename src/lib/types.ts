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
