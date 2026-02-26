import type { MinersStore } from './types'
import { DEFAULT_MINERS } from './constants'

const KV_KEY = 'miners'

let localStore: MinersStore | null = null

export async function getMiners(kvBinding?: KVNamespace): Promise<MinersStore> {
  if (kvBinding) {
    const data = await kvBinding.get(KV_KEY, 'json')
    if (data) return data as MinersStore
    const defaults: MinersStore = { miners: DEFAULT_MINERS }
    await kvBinding.put(KV_KEY, JSON.stringify(defaults))
    return defaults
  }
  if (!localStore) {
    localStore = { miners: DEFAULT_MINERS }
  }
  return localStore
}

export async function saveMiners(
  store: MinersStore,
  kvBinding?: KVNamespace
): Promise<void> {
  if (kvBinding) {
    await kvBinding.put(KV_KEY, JSON.stringify(store))
    return
  }
  localStore = store
}
