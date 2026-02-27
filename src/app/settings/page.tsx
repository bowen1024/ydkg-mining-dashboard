'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Pencil, Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { MinerForm } from '@/components/miner-form'
import { useMiners } from '@/hooks/use-miners'
import type { MinerConfig } from '@/lib/types'

export default function SettingsPage() {
  const { miners, loading, saveMiners } = useMiners()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMiner, setEditingMiner] = useState<MinerConfig | undefined>(undefined)

  function handleAdd() {
    setEditingMiner(undefined)
    setDialogOpen(true)
  }

  function handleEdit(miner: MinerConfig) {
    setEditingMiner(miner)
    setDialogOpen(true)
  }

  async function handleDelete(minerId: string) {
    const updated = miners.filter((m) => m.id !== minerId)
    await saveMiners(updated)
  }

  async function handleFormSubmit(miner: MinerConfig) {
    let updated: MinerConfig[]
    if (editingMiner) {
      updated = miners.map((m) => (m.id === editingMiner.id ? miner : m))
    } else {
      updated = [...miners, miner]
    }
    await saveMiners(updated)
    setDialogOpen(false)
    setEditingMiner(undefined)
  }

  function handleFormCancel() {
    setDialogOpen(false)
    setEditingMiner(undefined)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
              <ArrowLeft className="h-3.5 w-3.5" />
              返回
            </Button>
          </Link>
          <h2 className="text-base font-semibold">
            矿机设置{' '}
            <span className="text-xs font-normal text-muted-foreground">Miner Settings</span>
          </h2>
        </div>

        <Button size="sm" className="gap-1.5 text-xs" onClick={handleAdd}>
          <Plus className="h-3.5 w-3.5" />
          添加矿机 Add Miner
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
        </div>
      ) : miners.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-muted-foreground">
            No miners configured. Click "Add Miner" to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {miners.map((miner) => (
            <Card key={miner.id} className="py-3 gap-0">
              <CardContent className="px-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{miner.name}</span>
                        <Badge variant="secondary" className="text-[10px] h-5">
                          x{miner.quantity}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] h-5 uppercase">
                          {miner.algorithm}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span>
                          {miner.hashrate} {miner.hashrateUnit}
                        </span>
                        <span>{miner.power}W</span>
                        <span>${miner.electricityRate}/kWh</span>
                        <span>管理费 ${(miner.managementFeeRate ?? 0).toFixed(3)}/kWh</span>
                        <span>{miner.coins.join(' + ')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleEdit(miner)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(miner.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm">
              {editingMiner ? '编辑矿机 Edit Miner' : '添加矿机 Add Miner'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editingMiner
                ? 'Update the miner configuration below.'
                : 'Fill in the miner details below.'}
            </DialogDescription>
          </DialogHeader>
          <MinerForm
            initialData={editingMiner}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
