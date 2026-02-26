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

export function computeMinerDailyData(
  miner: MinerConfig,
  dateRange: DateRange,
  difficulty: DifficultyData,
  historicalPrices: Record<string, DailyPrice[]>,
  currentPrices: Record<string, number>
): MinerDailyData {
  const days = getDaysInRange(dateRange)
  const today = format(new Date(), 'yyyy-MM-dd')

  const priceMaps: Record<string, Map<string, number>> = {}
  for (const coin of ['BTC', 'LTC', 'DOGE']) {
    const map = new Map<string, number>()
    const hist = Array.isArray(historicalPrices[coin]) ? historicalPrices[coin] : []
    for (const dp of hist) {
      map.set(dp.date, dp.price)
    }
    priceMaps[coin] = map
  }

  const dailyRevenues = days.map((day) => {
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
