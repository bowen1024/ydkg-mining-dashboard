import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function MethodologyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-10 text-sm">

      {/* Back link */}
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" />
        返回
      </Link>

      <div>
        <h2 className="text-xl font-semibold mb-1">计算方法 <span className="text-muted-foreground font-normal text-base">Methodology</span></h2>
      </div>

      {/* Overview */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">概述 Overview</h3>
        <p className="text-muted-foreground leading-relaxed">
          本仪表盘估算加密货币挖矿的每日收益。它根据三个核心输入来计算每台矿机每天能挖到多少币，
          再乘以当天的币价得出收入，减去电费后得出净利润。
        </p>
        <p className="text-muted-foreground leading-relaxed">
          This dashboard estimates daily cryptocurrency mining revenue. For each miner, it
          calculates how many coins can be mined per day using three core inputs, multiplies by
          the coin price to get revenue, then subtracts electricity cost and management fee to arrive at net profit.
        </p>
      </section>

      {/* Core Formula */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold">核心公式 Core Formula</h3>

        <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Step 1 — Coins Mined Per Day (Single Machine)</p>
          <p className="font-mono text-sm">coins_per_day = (hashrate × 86,400 × block_reward) ÷ (difficulty × 2<sup>32</sup>)</p>
          <ul className="text-xs text-muted-foreground space-y-1.5 pl-1">
            <li><strong>hashrate</strong> — your miner&apos;s computing speed, converted to hashes per second (e.g. 245 Th/s = 245 × 10<sup>12</sup> h/s)</li>
            <li><strong>86,400</strong> — number of seconds in one day</li>
            <li><strong>block_reward</strong> — how many coins are given for solving one block (BTC: 3.125, LTC: 6.25, DOGE: 10,000)</li>
            <li><strong>difficulty</strong> — a network-wide number that represents how hard it is to find a block. The higher the difficulty, the fewer coins you mine</li>
            <li><strong>2<sup>32</sup></strong> (≈ 4.29 billion) — a fixed constant in the mining target formula</li>
          </ul>
        </div>

        <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Step 2 — Daily Revenue (All Machines)</p>
          <p className="font-mono text-sm">revenue = coins_per_day × coin_price_usd × quantity</p>
          <ul className="text-xs text-muted-foreground space-y-1.5 pl-1">
            <li><strong>coin_price_usd</strong> — the market price of the coin in US dollars on that day</li>
            <li><strong>quantity</strong> — how many identical mining machines you operate</li>
          </ul>
        </div>

        <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Step 3 — Daily Electricity Consumption &amp; Cost</p>
          <p className="font-mono text-sm">kWh = (power_watts ÷ 1000) × 24 × quantity</p>
          <p className="font-mono text-sm">electricity_cost = kWh × electricity_rate</p>
          <ul className="text-xs text-muted-foreground space-y-1.5 pl-1">
            <li><strong>power_watts ÷ 1000</strong> — converts watts to kilowatts (e.g. 3,510 W → 3.51 kW)</li>
            <li><strong>24</strong> — hours in a day (miners run 24/7)</li>
            <li><strong>electricity_rate</strong> — your electricity price in $/kWh (editable in the dashboard)</li>
          </ul>
        </div>

        <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Step 4 — Daily Management Fee</p>
          <p className="font-mono text-sm">management_fee = kWh × management_fee_rate</p>
          <ul className="text-xs text-muted-foreground space-y-1.5 pl-1">
            <li><strong>kWh</strong> — total daily electricity consumption calculated in Step 3</li>
            <li><strong>management_fee_rate</strong> — a flat fee charged per kWh consumed, in $/kWh (default: $0.002/kWh, configurable per miner in Settings)</li>
          </ul>
          <p className="text-xs text-muted-foreground">
            The management fee is based on electricity <em>consumption</em> (kWh), not on electricity <em>cost</em> (USD).
            This means it does not change if you negotiate a different electricity rate.
          </p>
        </div>

        <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Step 5 — Net Profit</p>
          <p className="font-mono text-sm">profit = revenue − electricity_cost − management_fee</p>
          <p className="text-xs text-muted-foreground">
            A positive number (green) means you earned more than you spent on power and management fees.
            A negative number (red) means total costs exceeded the value of coins mined.
          </p>
        </div>
      </section>

      {/* Mining Algorithms */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold">矿机算法 Mining Algorithms</h3>
        <p className="text-muted-foreground">The dashboard supports two types of mining algorithms. Each requires a different type of machine:</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border p-4 space-y-2">
            <p className="font-medium text-xs">SHA-256</p>
            <p className="text-xs text-muted-foreground">
              Used by <strong>Bitcoin (BTC)</strong>. SHA-256 miners are measured in Th/s (terahashes per
              second, i.e. trillions of calculations per second). The difficulty adjusts every ~2 weeks
              (every 2,016 blocks), so it stays relatively stable day-to-day.
            </p>
            <p className="text-xs text-muted-foreground">Revenue = BTC mined × BTC price</p>
          </div>
          <div className="rounded-lg border p-4 space-y-2">
            <p className="font-medium text-xs">SCRYPT</p>
            <p className="text-xs text-muted-foreground">
              Used by <strong>Litecoin (LTC)</strong> and <strong>Dogecoin (DOGE)</strong> via merged
              mining — a single Scrypt miner earns both coins simultaneously. These miners are measured
              in Gh/s (gigahashes per second, i.e. billions of calculations per second). DOGE adjusts
              difficulty on every block, so the daily average difficulty is used instead of a single snapshot.
            </p>
            <p className="text-xs text-muted-foreground">Revenue = (LTC mined × LTC price) + (DOGE mined × DOGE price)</p>
          </div>
        </div>
      </section>

      {/* Data Sources */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold">数据来源 Data Sources</h3>
        <div className="rounded-lg border divide-y text-xs">
          <DataRow label="Coin Prices (current)" source="CoinGecko API" href="https://www.coingecko.com/" description="Real-time spot prices for BTC, LTC, and DOGE in USD. Updated every 5 minutes." />
          <DataRow label="Coin Prices (historical)" source="CoinGecko API" href="https://www.coingecko.com/" description="Daily closing prices for past dates, used to calculate historical revenue for each day in the selected date range." />
          <DataRow label="BTC Difficulty (historical)" source="Blockchain.info" href="https://www.blockchain.com/explorer/charts/difficulty" description="Bitcoin network difficulty over time. Adjusts every ~2,016 blocks (~2 weeks). The dashboard fetches the daily difficulty value for each day." />
          <DataRow label="LTC & DOGE Difficulty (historical)" source="Blockchair API" href="https://blockchair.com/" description="Fetched as avg(difficulty) aggregated by date from the blocks endpoint. Because DOGE adjusts difficulty on every block, using the daily average is more representative than a single snapshot." />
          <DataRow label="Block Rewards" source="Hard-coded constants" description="BTC: 3.125 BTC/block (post April 2024 halving) · LTC: 6.25 LTC/block · DOGE: 10,000 DOGE/block. These are updated when the network undergoes a halving event." />
          <DataRow label="Miner Specifications" source="User configuration" description="Hashrate, power consumption (watts), electricity rate ($/kWh), and machine quantity are configured by the user in the Settings page." />
        </div>
      </section>

      {/* Day-by-Day */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">逐日计算 Day-by-Day Calculation</h3>
        <p className="text-muted-foreground leading-relaxed">
          Rather than applying one fixed difficulty/price for the whole period, the dashboard
          calculates each day independently using that day&apos;s actual difficulty and price:
        </p>
        <ul className="text-muted-foreground space-y-2 list-disc pl-5">
          <li><strong>Past dates</strong> — uses the historical closing price and the historical daily average difficulty from that date.</li>
          <li><strong>Today</strong> — uses the real-time current price (from CoinGecko) and the partial daily average difficulty (from Blockchair, covering blocks mined so far today). If the historical daily average is not yet available, it falls back to the current network difficulty snapshot.</li>
        </ul>
        <p className="text-muted-foreground leading-relaxed">
          This means the revenue shown for Feb 1 uses Feb 1&apos;s actual BTC price and difficulty,
          while Feb 15 uses Feb 15&apos;s values — giving you an accurate picture of what was actually
          earned each day, not just an estimate based on today&apos;s numbers.
        </p>
      </section>

      {/* Worked Example */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold">计算示例 Worked Example</h3>
        <p className="text-muted-foreground">Let&apos;s walk through a concrete example with a SHA-256 Bitcoin miner:</p>
        <div className="rounded-lg border p-4 space-y-3 text-xs bg-muted/30">
          <p className="font-medium">Given:</p>
          <ul className="text-muted-foreground space-y-1 pl-1">
            <li>Miner: S21 Pro, hashrate = 245 Th/s, power = 3,531 W</li>
            <li>Electricity rate: $0.06/kWh · Management fee rate: $0.002/kWh</li>
            <li>Quantity: 2 machines</li>
            <li>BTC difficulty on that day: 114,170,000,000,000 (≈ 114.17 T)</li>
            <li>BTC price on that day: $96,000</li>
          </ul>
          <p className="font-medium mt-2">Step 1 — Coins per day (per machine):</p>
          <p className="font-mono text-muted-foreground">= (245 × 10<sup>12</sup> × 86,400 × 3.125) ÷ (114,170,000,000,000 × 2<sup>32</sup>)</p>
          <p className="font-mono text-muted-foreground">≈ 0.000135 BTC/day per machine</p>
          <p className="font-medium mt-2">Step 2 — Revenue (2 machines):</p>
          <p className="font-mono text-muted-foreground">= 0.000135 × 2 × $96,000 = <strong className="text-foreground">$25.92</strong></p>
          <p className="font-medium mt-2">Step 3 — Electricity consumption &amp; cost (2 machines):</p>
          <p className="font-mono text-muted-foreground">kWh = (3,531 ÷ 1,000) × 24 × 2 = 169.49 kWh/day</p>
          <p className="font-mono text-muted-foreground">electricity_cost = 169.49 × $0.06 = <strong className="text-foreground">$10.17</strong></p>
          <p className="font-medium mt-2">Step 4 — Management fee:</p>
          <p className="font-mono text-muted-foreground">= 169.49 kWh × $0.002/kWh = <strong className="text-foreground">$0.34</strong></p>
          <p className="font-medium mt-2">Step 5 — Net profit:</p>
          <p className="font-mono text-muted-foreground">= $25.92 − $10.17 − $0.34 = <strong className="text-green-600">$15.41</strong></p>
        </div>
      </section>

      {/* Caveats */}
      <section className="space-y-4 pb-10">
        <h3 className="text-sm font-semibold">注意事项 Important Caveats</h3>
        <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5">
          <li>
            <strong>Assumes 100% uptime</strong> — The calculation assumes miners run 24 hours a day.
            Actual output may be lower due to maintenance, network issues, or restarts.
          </li>
          <li>
            <strong>Merged mining</strong> — Scrypt miners mine LTC and DOGE simultaneously.
            The dashboard calculates each coin&apos;s output independently using its own difficulty,
            then sums the revenue.
          </li>
          <li>
            <strong>No hardware depreciation</strong> — The profit figure does not account for
            the purchase price of mining equipment or its declining resale value.
          </li>
          <li>
            <strong>Data freshness</strong> — Prices are cached for 5 minutes, difficulty for 1 hour.
            All data is fetched from public APIs and may occasionally be delayed.
          </li>
        </ul>
      </section>
    </div>
  )
}

// ── Helper component ──────────────────────────────────────────────────

function DataRow({
  label,
  source,
  href,
  description,
}: {
  label: string
  source: string
  href?: string
  description: string
  children?: ReactNode
}) {
  return (
    <div className="px-4 py-3 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium text-foreground text-xs">{label}</p>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors shrink-0"
          >
            {source}
          </a>
        ) : (
          <p className="text-xs text-muted-foreground shrink-0">{source}</p>
        )}
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}
