// Extends the CloudflareEnv interface from @opennextjs/cloudflare
// with bindings declared in wrangler.jsonc

declare module "cloudflare:workers" {
  interface Env {
    MINER_CONFIG: KVNamespace
  }
}

// For @opennextjs/cloudflare's getCloudflareContext().env
declare global {
  interface CloudflareEnv {
    MINER_CONFIG: KVNamespace
  }
}

export {}
