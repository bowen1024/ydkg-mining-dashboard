import { BLOCK_REWARDS } from './constants'
import type { Coin, MinerConfig, DailyRevenue } from './types'

const TWO_POW_32 = 2 ** 32
const SECONDS_PER_DAY = 86400

export function calculateBtcPerDay(hashrateTH: number, difficulty: number): number {
  if (hashrateTH === 0 || difficulty === 0) return 0
  return (hashrateTH * 1e12 * SECONDS_PER_DAY * BLOCK_REWARDS.BTC) / (difficulty * TWO_POW_32)
}

export function calculateLtcPerDay(hashrateGH: number, difficulty: number): number {
  if (hashrateGH === 0 || difficulty === 0) return 0
  return (hashrateGH * 1e9 * SECONDS_PER_DAY * BLOCK_REWARDS.LTC) / (difficulty * TWO_POW_32)
}

export function calculateDogePerDay(hashrateGH: number, difficulty: number): number {
  if (hashrateGH === 0 || difficulty === 0) return 0
  return (hashrateGH * 1e9 * SECONDS_PER_DAY * BLOCK_REWARDS.DOGE) / (difficulty * TWO_POW_32)
}

export function calculateDailyElectricityCost(
  powerWatts: number,
  electricityRate: number,
  quantity: number
): number {
  return (powerWatts / 1000) * 24 * electricityRate * quantity
}

export function calculateDailyRevenue(
  miner: MinerConfig,
  prices: Record<string, number>,
  difficulties: Record<string, number>,
  date: string
): DailyRevenue {
  const coinOutputs: Record<Coin, number> = { BTC: 0, LTC: 0, DOGE: 0 }
  let revenue = 0

  if (miner.algorithm === 'sha256') {
    const btcPerDay = calculateBtcPerDay(miner.hashrate, difficulties.BTC || 0)
    coinOutputs.BTC = btcPerDay
    revenue = btcPerDay * (prices.BTC || 0) * miner.quantity
  } else if (miner.algorithm === 'scrypt') {
    const ltcPerDay = calculateLtcPerDay(miner.hashrate, difficulties.LTC || 0)
    const dogePerDay = calculateDogePerDay(miner.hashrate, difficulties.DOGE || 0)
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

  const managementFee = electricityCost * (miner.managementFeeRate ?? 0)

  return {
    date,
    prices,
    difficulties,
    coinOutputs,
    revenue,
    electricityCost,
    managementFee,
    profit: revenue - electricityCost - managementFee,
  }
}
