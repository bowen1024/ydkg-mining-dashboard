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
  managementFeeRate: number // decimal, e.g. 0.002 = 0.2%
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

export interface DailyDifficultyPoint {
  date: string // YYYY-MM-DD
  difficulty: number
}

export interface DailyRevenue {
  date: string // YYYY-MM-DD
  prices: Record<string, number> // close price USD used for this day
  difficulties: Record<string, number> // difficulty used for this day
  coinOutputs: Record<Coin, number> // coins mined per day (all machines combined)
  revenue: number // USD (all machines)
  electricityCost: number // USD (all machines)
  managementFee: number // USD (all machines) = electricityCost * managementFeeRate
  profit: number // USD
}

export interface MinerDailyData {
  miner: MinerConfig
  dailyRevenues: DailyRevenue[]
  totalRevenue: number
  totalElectricityCost: number
  totalManagementFee: number
  totalProfit: number
}

export interface DateRange {
  from: Date
  to: Date
}

