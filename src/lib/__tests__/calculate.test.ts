import { describe, it, expect } from 'vitest'
import {
  calculateBtcPerDay,
  calculateLtcPerDay,
  calculateDogePerDay,
  calculateDailyElectricityCost,
  calculateDailyRevenue,
} from '../calculate'
import type { MinerConfig } from '../types'

describe('Mining revenue calculations', () => {
  const btcDifficulty = 113_000_000_000_000

  describe('calculateBtcPerDay', () => {
    it('should calculate daily BTC output for given hashrate and difficulty', () => {
      const result = calculateBtcPerDay(245, btcDifficulty)
      expect(result).toBeGreaterThan(0)
      expect(result).toBeLessThan(0.001)
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
    const ltcDifficulty = 40_000_000
    it('should calculate daily LTC output', () => {
      const result = calculateLtcPerDay(16.2, ltcDifficulty)
      expect(result).toBeGreaterThan(0)
    })
  })

  describe('calculateDogePerDay', () => {
    const dogeDifficulty = 20_000_000
    it('should calculate daily DOGE output', () => {
      const result = calculateDogePerDay(16.2, dogeDifficulty)
      expect(result).toBeGreaterThan(0)
      expect(result).toBeGreaterThan(1)
    })
  })

  describe('calculateDailyElectricityCost', () => {
    it('should calculate daily electricity cost', () => {
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

    const difficulty: Record<string, number> = {
      BTC: 113_000_000_000_000,
      LTC: 40_000_000,
      DOGE: 20_000_000,
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
