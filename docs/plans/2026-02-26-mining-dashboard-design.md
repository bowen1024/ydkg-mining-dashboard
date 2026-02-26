# YDKG Mining Dashboard - Design Document

**Date:** 2026-02-26
**Status:** Approved

## Overview

A personal mining dashboard for monitoring theoretical daily mining revenue across 6 ASIC miner models. Deployed on Cloudflare Workers with a Swiss Design financial aesthetic.

## User Profile

- Single user (personal tool), no authentication required
- Chinese/English mixed interface (Chinese labels, English technical terms)

## Miner Models (Dynamic, Configurable)

Initial 6 models:

| Model | Algorithm | Coins | Hashrate | Unit |
|-------|-----------|-------|----------|------|
| D1 Silver 16.2Gh/s | Scrypt | LTC + DOGE | 16.2 | Gh/s |
| D1 Lite 14Gh/s | Scrypt | LTC + DOGE | 14 | Gh/s |
| S21 Pro 245Th/s | SHA-256 | BTC | 245 | Th/s |
| S21 Pro 234Th/s | SHA-256 | BTC | 234 | Th/s |
| S21+ 234Th/s | SHA-256 | BTC | 234 | Th/s |
| S21+ 220Th/s | SHA-256 | BTC | 220 | Th/s |

Models are dynamically managed via a settings page (add/edit/delete). Each model stores: name, algorithm, coins, hashrate, hashrate unit, power consumption (W), quantity, electricity rate ($/kWh).

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Cloudflare Workers                  │
│                                                     │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Next.js  │  │ API Routes   │  │ Cloudflare   │  │
│  │ SSR Pages│  │ /api/prices  │  │ KV Store     │  │
│  │          │  │ /api/diff    │  │              │  │
│  │ - Home   │  │ /api/config  │  │ - miners cfg │  │
│  │ - Tabs   │  │              │  │ - elec rates │  │
│  │ - Config │  │              │  │              │  │
│  └──────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | Next.js 15 (App Router) | SSR + API Routes, mature ecosystem |
| UI | Tailwind CSS + shadcn/ui | Precise control for Swiss Design |
| Charts | Recharts | Most mature React chart library |
| Date Picker | react-day-picker (via shadcn) | Lightweight, range selection |
| Deployment | @opennextjs/cloudflare | Next.js → Cloudflare Workers bridge |
| Storage | Cloudflare KV | Miner config persistence |

## External APIs

### Coin Prices — CoinGecko (Free Tier)

- **Real-time:** `GET /simple/price?ids=bitcoin,litecoin,dogecoin&vs_currencies=usd`
- **Historical daily OHLC:** `GET /coins/{id}/ohlc?vs_currency=usd&days={days}`
  - Returns OHLC (Open, High, Low, Close) candle data
  - For days > 30: returns daily candles
  - **Use the Close price** as the representative price for each day
- Free tier: 30 calls/min, 10,000 calls/month
- Historical data: past 365 days on free plan
- API key stored server-side in environment variables

> **Price strategy:** For historical daily revenue calculation, use each day's **close price** from the OHLC endpoint. For today (current day), use the real-time price from `/simple/price`.

### Network Difficulty — Free, No Auth

| Coin | Endpoint | Format |
|------|----------|--------|
| BTC | `https://blockchain.info/q/getdifficulty` | Plain text |
| LTC | `https://chainz.cryptoid.info/ltc/api.dws?q=getdifficulty` | Plain text |
| DOGE | `https://chainz.cryptoid.info/doge/api.dws?q=getdifficulty` | Plain text |

### Caching Strategy

| Data | Cache Duration | Reason |
|------|---------------|--------|
| Coin prices | 5 minutes | Prices fluctuate constantly |
| Network difficulty | 1 hour | BTC adjusts ~2 weeks, LTC/DOGE stable |
| Miner config | No cache (KV direct) | User-edited, always fresh |

## Revenue Calculation (Frontend)

All calculations performed client-side using fetched prices + difficulty.

### BTC (SHA-256)

```
btcPerDay = (hashrate_TH * 1e12 * 86400 * blockReward) / (difficulty * 2^32)
revenue = btcPerDay * btcPrice * quantity
electricityCost = (powerW / 1000) * 24 * electricityRate * quantity
profit = revenue - electricityCost
```

Current block reward: 3.125 BTC (post-2024 halving)

### LTC (Scrypt)

```
ltcPerDay = (hashrate_GH * 1e9 * 86400 * ltcBlockReward) / (ltcDifficulty * 2^32)
```

Current block reward: 6.25 LTC (post-2023 halving)

### DOGE (Scrypt, Merged Mining)

```
dogePerDay = (hashrate_GH * 1e9 * 86400 * dogeBlockReward) / (dogeDifficulty * 2^32)
```

Current block reward: 10,000 DOGE

### Combined Revenue (LTC+DOGE miners)

```
totalRevenue = ltcPerDay * ltcPrice + dogePerDay * dogePrice
totalRevenue *= quantity
```

## Page Structure

### Main Dashboard (/)

```
┌─────────────────────────────────────────────────┐
│  YDKG 矿机 Dashboard              ⚙️ 设置      │
├─────────────────────────────────────────────────┤
│  日期: [本月 ▼]  2026-02-01 ~ 2026-02-26       │
│        自定义: [开始日期] — [结束日期]           │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │ 总览摘要                                │    │
│  │ 总收入  总电费  净利润  利润率           │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  [Tab1] [Tab2] [Tab3] [Tab4] [Tab5] [Tab6]     │
│  ───────────────────────────────────────────    │
│  │ Model Info: 名称 × 数量  算力  电价[编辑] │   │
│  │ ┌────────────────────────────────────┐   │   │
│  │ │ 每日收益图表 (折线/柱状)           │   │   │
│  │ └────────────────────────────────────┘   │   │
│  │ 日期   | 币产出 | 收入 | 电费 | 净利润  │   │
│  │ 02-26  | 0.012  | $1.5 | $0.4 | $1.1   │   │
│  └──────────────────────────────────────────│   │
└─────────────────────────────────────────────────┘
```

### Date Selector

- Default: Current month (MTD - month to date)
- Presets: 本月, 上月, 最近7天, 最近30天
- Custom: Start date — End date range picker

### Miner Tabs (Dynamic)

- One tab per configured miner model
- Dynamically generated from KV-stored config
- Each tab shows:
  - Model name, quantity, hashrate, power, electricity rate (editable inline)
  - Daily revenue chart (Recharts line/bar)
  - Daily detail table with: date, coin output, revenue, electricity cost, net profit

### Settings Page (/settings)

- Add new miner model
- Edit existing model (name, algorithm, hashrate, power, quantity, electricity rate)
- Delete model
- Form fields:
  - 名称 (Name): text
  - 算法 (Algorithm): select [Scrypt, SHA-256]
  - 挖矿币种 (Coins): auto-set based on algorithm
  - 算力 (Hashrate): number + unit select [Gh/s, Th/s]
  - 功耗 (Power): number (Watts)
  - 数量 (Quantity): number
  - 电价 (Electricity Rate): number ($/kWh)

## Data Storage — Cloudflare KV

### Key: `miners`

```json
{
  "miners": [
    {
      "id": "d1-silver-16.2",
      "name": "D1 Silver 16.2Gh/s",
      "algorithm": "scrypt",
      "coins": ["LTC", "DOGE"],
      "hashrate": 16.2,
      "hashrateUnit": "Gh/s",
      "power": 3510,
      "quantity": 3,
      "electricityRate": 0.05
    }
  ]
}
```

## Visual Design — Swiss Design Financial Style

- **Typography:** Strong hierarchy, Helvetica/Inter font family, large numbers for KPIs
- **Grid:** Strict grid system, generous whitespace
- **Color:** Restrained palette — monochrome base + one accent color for profit/loss (green/red)
- **Layout:** Clean lines, minimal decoration, data-forward
- **Charts:** Minimal grid lines, clear labels, no unnecessary embellishment

## Deployment

- **Platform:** Cloudflare Workers via @opennextjs/cloudflare
- **KV Namespace:** `MINER_CONFIG` for miner configuration storage
- **Environment Variables:** `COINGECKO_API_KEY` for coin price API
- **Build:** `npx @opennextjs/cloudflare build`
- **Deploy:** `wrangler deploy`

## Error Handling

- API failures: Show cached data with "data may be stale" indicator
- Network offline: Show last cached values
- Invalid miner config: Form validation before save
- CoinGecko rate limit: Respect 30 calls/min, use server-side caching

## Future Considerations (Not in V1)

- Mining pool API integration (actual vs theoretical revenue)
- Multi-currency electricity rate support
- Export data to CSV
- Mobile responsive optimization
- Dark/Light theme toggle
