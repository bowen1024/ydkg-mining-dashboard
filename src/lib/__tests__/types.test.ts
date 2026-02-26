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
