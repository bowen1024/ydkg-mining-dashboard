import type { MinersStore } from './types'
import { DEFAULT_MINERS } from './constants'

const KV_KEY = 'miners'

// In-memory cache (populated from file on first access)
let localStore: MinersStore | null = null

// ── Local-dev file persistence ────────────────────────────────────────────────
// Next.js HMR reloads this module on every file save, which resets `localStore`
// to null. We persist to .local-miners.json so miners survive hot reloads.
// Dynamic require() is used so the Cloudflare Workers bundler never bundles `fs`.

function readLocalFile(): MinersStore | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path')
    const p = path.join(process.cwd(), '.local-miners.json')
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf-8')) as MinersStore
    }
  } catch {
    // fs unavailable (Cloudflare Workers) — ignore
  }
  return null
}

function writeLocalFile(store: MinersStore): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path')
    const p = path.join(process.cwd(), '.local-miners.json')
    fs.writeFileSync(p, JSON.stringify(store, null, 2))
  } catch {
    // fs unavailable (Cloudflare Workers) — ignore
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getMiners(kvBinding?: KVNamespace): Promise<MinersStore> {
  if (kvBinding) {
    const data = await kvBinding.get(KV_KEY, 'json')
    if (data) return data as MinersStore
    const defaults: MinersStore = { miners: DEFAULT_MINERS }
    await kvBinding.put(KV_KEY, JSON.stringify(defaults))
    return defaults
  }

  // Local dev: re-hydrate from file if HMR wiped the in-memory cache
  if (!localStore) {
    localStore = readLocalFile() ?? { miners: DEFAULT_MINERS }
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
  writeLocalFile(store)
}
