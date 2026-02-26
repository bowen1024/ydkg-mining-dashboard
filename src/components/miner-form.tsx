'use client'

import { useState, useEffect } from 'react'
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
import type { MinerConfig, Algorithm, Coin, HashrateUnit } from '@/lib/types'

interface MinerFormProps {
  initialData?: MinerConfig
  onSubmit: (miner: MinerConfig) => void
  onCancel: () => void
}

function generateId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .concat('-', Date.now().toString(36))
}

function getCoinsForAlgorithm(algorithm: Algorithm): Coin[] {
  return algorithm === 'scrypt' ? ['LTC', 'DOGE'] : ['BTC']
}

function getHashrateUnitForAlgorithm(algorithm: Algorithm): HashrateUnit {
  return algorithm === 'scrypt' ? 'Gh/s' : 'Th/s'
}

export function MinerForm({ initialData, onSubmit, onCancel }: MinerFormProps) {
  const [name, setName] = useState(initialData?.name || '')
  const [algorithm, setAlgorithm] = useState<Algorithm>(initialData?.algorithm || 'sha256')
  const [hashrate, setHashrate] = useState(initialData?.hashrate?.toString() || '')
  const [power, setPower] = useState(initialData?.power?.toString() || '')
  const [quantity, setQuantity] = useState(initialData?.quantity?.toString() || '1')
  const [electricityRate, setElectricityRate] = useState(
    initialData?.electricityRate?.toString() || '0.06'
  )

  useEffect(() => {
    if (initialData) {
      setName(initialData.name)
      setAlgorithm(initialData.algorithm)
      setHashrate(initialData.hashrate.toString())
      setPower(initialData.power.toString())
      setQuantity(initialData.quantity.toString())
      setElectricityRate(initialData.electricityRate.toString())
    }
  }, [initialData])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const hashrateNum = parseFloat(hashrate)
    const powerNum = parseFloat(power)
    const quantityNum = parseInt(quantity, 10)
    const rateNum = parseFloat(electricityRate)

    if (!name.trim() || isNaN(hashrateNum) || isNaN(powerNum) || isNaN(quantityNum) || isNaN(rateNum)) {
      return
    }

    const miner: MinerConfig = {
      id: initialData?.id || generateId(name),
      name: name.trim(),
      algorithm,
      coins: getCoinsForAlgorithm(algorithm),
      hashrate: hashrateNum,
      hashrateUnit: getHashrateUnitForAlgorithm(algorithm),
      power: powerNum,
      quantity: quantityNum,
      electricityRate: rateNum,
    }

    onSubmit(miner)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name" className="text-xs">
          名称 <span className="text-muted-foreground">Name</span>
        </Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. S21 Pro 245Th/s"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="algorithm" className="text-xs">
          算法 <span className="text-muted-foreground">Algorithm</span>
        </Label>
        <Select value={algorithm} onValueChange={(val) => setAlgorithm(val as Algorithm)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sha256">SHA-256 (BTC)</SelectItem>
            <SelectItem value="scrypt">Scrypt (LTC + DOGE)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="hashrate" className="text-xs">
            算力 <span className="text-muted-foreground">Hashrate ({getHashrateUnitForAlgorithm(algorithm)})</span>
          </Label>
          <Input
            id="hashrate"
            type="number"
            step="any"
            min="0"
            value={hashrate}
            onChange={(e) => setHashrate(e.target.value)}
            placeholder="e.g. 245"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="power" className="text-xs">
            功耗 <span className="text-muted-foreground">Power (W)</span>
          </Label>
          <Input
            id="power"
            type="number"
            step="any"
            min="0"
            value={power}
            onChange={(e) => setPower(e.target.value)}
            placeholder="e.g. 3531"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="quantity" className="text-xs">
            数量 <span className="text-muted-foreground">Quantity</span>
          </Label>
          <Input
            id="quantity"
            type="number"
            step="1"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="e.g. 2"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="electricityRate" className="text-xs">
            电价 <span className="text-muted-foreground">$/kWh</span>
          </Label>
          <Input
            id="electricityRate"
            type="number"
            step="0.001"
            min="0"
            value={electricityRate}
            onChange={(e) => setElectricityRate(e.target.value)}
            placeholder="e.g. 0.06"
            required
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          取消 Cancel
        </Button>
        <Button type="submit" size="sm">
          {initialData ? '保存 Save' : '添加 Add'}
        </Button>
      </div>
    </form>
  )
}
