import { calculateDailyRevenue } from './calculate'
import type {
  MinerConfig,
  DifficultyData,
  DailyPrice,
  DailyDifficultyPoint,
  DateRange,
  MinerDailyData,
} from './types'
import { getDaysInRange } from './date-utils'
import { format } from 'date-fns'

export function computeMinerDailyData(
  miner: MinerConfig,
  dateRange: DateRange,
  difficulty: DifficultyData,
  historicalPrices: Record<string, DailyPrice[]>,
  historicalDifficulty: Record<string, DailyDifficultyPoint[]>,
  currentPrices: Record<string, number>,
): MinerDailyData {
  const days = getDaysInRange(dateRange)
  const today = format(new Date(), 'yyyy-MM-dd')

  const priceMaps: Record<string, Map<string, number>> = {}
  const difficultyMaps: Record<string, Map<string, number>> = {}

  for (const coin of ['BTC', 'LTC', 'DOGE']) {
    // Price maps
    const priceMap = new Map<string, number>()
    const hist = Array.isArray(historicalPrices[coin]) ? historicalPrices[coin] : []
    for (const dp of hist) {
      priceMap.set(dp.date, dp.price)
    }
    priceMaps[coin] = priceMap

    // Difficulty maps
    const diffMap = new Map<string, number>()
    const diffHist = Array.isArray(historicalDifficulty[coin]) ? historicalDifficulty[coin] : []
    for (const dd of diffHist) {
      diffMap.set(dd.date, dd.difficulty)
    }
    difficultyMaps[coin] = diffMap
  }

  // Current difficulty fallback values
  const currentDifficulty: Record<string, number> = {
    BTC: difficulty.btc,
    LTC: difficulty.ltc,
    DOGE: difficulty.doge,
  }

  const dailyRevenues = days.map((day) => {
    const prices: Record<string, number> = {}
    const difficulties: Record<string, number> = {}

    for (const coin of ['BTC', 'LTC', 'DOGE']) {
      // Today uses current real-time price; past days use historical close
      if (day === today) {
        prices[coin] = currentPrices[coin] || priceMaps[coin].get(day) || 0
      } else {
        prices[coin] = priceMaps[coin].get(day) || 0
      }

      // Always prefer the historical daily average difficulty (avg over all blocks that day).
      // For DOGE/LTC, per-block difficulty adjustment makes the daily average far more
      // representative than a single snapshot. The history endpoint includes today's
      // partial-day average, so the current-difficulty snapshot is only a last-resort fallback.
      difficulties[coin] = difficultyMaps[coin].get(day) || currentDifficulty[coin] || 0
    }

    return calculateDailyRevenue(miner, prices, difficulties, day)
  })

  const totalRevenue = dailyRevenues.reduce((s, d) => s + d.revenue, 0)
  const totalElectricityCost = dailyRevenues.reduce((s, d) => s + d.electricityCost, 0)
  const totalProfit = totalRevenue - totalElectricityCost

  return { miner, dailyRevenues, totalRevenue, totalElectricityCost, totalProfit }
}
