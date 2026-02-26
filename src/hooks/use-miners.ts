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
