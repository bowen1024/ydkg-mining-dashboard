import { NextRequest, NextResponse } from 'next/server'
import { getMiners, saveMiners } from '@/lib/kv'
import type { MinersStore } from '@/lib/types'

function getKV(): KVNamespace | undefined {
  try {
    const { getRequestContext } = require('@opennextjs/cloudflare')
    return getRequestContext().env.MINER_CONFIG
  } catch {
    return undefined
  }
}

export async function GET() {
  try {
    const kv = getKV()
    const data = await getMiners(kv)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to get miners config:', error)
    return NextResponse.json({ error: 'Failed to load config' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const kv = getKV()
    const body: MinersStore = await request.json()
    if (!body.miners || !Array.isArray(body.miners)) {
      return NextResponse.json({ error: 'Invalid config format' }, { status: 400 })
    }
    await saveMiners(body, kv)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to save miners config:', error)
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 })
  }
}
