import type { MinerDailyData, DateRange } from '@/lib/types'
import { format } from 'date-fns'

// ── Color / format palette ────────────────────────────────────────────────────
const C = {
  headerBg: 'FF1F2937',   // dark charcoal
  headerFg: 'FFFFFFFF',   // white
  footerBg: 'FFE5E7EB',   // light gray
  zebraRow: 'FFFAFAFA',   // off-white
  green:    'FF16A34A',
  red:      'FFDC2626',
  muted:    'FF6B7280',
} as const

const FMT = {
  usd:     '"$"#,##0.00',
  btcOut:  '0.00000000',
  ltcOut:  '0.000000',
  dogeOut: '0.00',
  diff:    '#,##0',
  date:    '@',
} as const

function sanitizeSheetName(name: string): string {
  return name.replace(/[:\\/?\*\[\]]/g, '-').slice(0, 31)
}

function applyHeaderRow(
  ws: import('exceljs').Worksheet,
  headers: string[]
) {
  const row = ws.getRow(1)
  headers.forEach((h, i) => {
    const cell = row.getCell(i + 1)
    cell.value = h
    cell.font = { bold: true, color: { argb: C.headerFg }, size: 10 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.headerBg } }
    cell.alignment = { horizontal: i === 0 ? 'left' : 'right', vertical: 'middle' }
  })
  row.height = 18
  ws.views = [{ state: 'frozen', ySplit: 1 }]
}

function setColWidths(ws: import('exceljs').Worksheet, widths: number[]) {
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w
  })
}

function applyDataRow(
  ws: import('exceljs').Worksheet,
  rowIndex: number,
  values: (string | number)[],
  formats: string[],
  profit: number
) {
  const row = ws.getRow(rowIndex)
  const isZebra = rowIndex % 2 === 0
  values.forEach((v, i) => {
    const cell = row.getCell(i + 1)
    cell.value = v
    cell.numFmt = formats[i]
    cell.alignment = { horizontal: i === 0 ? 'left' : 'right' }
    if (isZebra) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.zebraRow } }
    }
  })
  // Color the profit cell
  const profitColIdx = values.length
  const profitCell = row.getCell(profitColIdx)
  profitCell.font = {
    bold: true,
    color: { argb: profit > 0 ? C.green : profit < 0 ? C.red : undefined },
  }
}

function applyFooterRow(
  ws: import('exceljs').Worksheet,
  rowIndex: number,
  values: (string | number)[],
  formats: string[],
  profit: number
) {
  const row = ws.getRow(rowIndex)
  values.forEach((v, i) => {
    const cell = row.getCell(i + 1)
    cell.value = v
    cell.numFmt = formats[i]
    cell.font = { bold: true, size: 10, color: { argb: profit > 0 ? C.green : profit < 0 ? C.red : undefined } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.footerBg } }
    cell.alignment = { horizontal: i === 0 ? 'left' : 'right' }
    cell.border = { top: { style: 'thin', color: { argb: 'FFD1D5DB' } } }
  })
}

// ── Summary sheet ─────────────────────────────────────────────────────────────
function buildSummarySheet(
  wb: import('exceljs').Workbook,
  allMinerData: MinerDailyData[]
) {
  const ws = wb.addWorksheet('总览')

  const minerNames = allMinerData.map((md) => md.miner.name)
  const headers = ['日期', ...minerNames, '总计']
  applyHeaderRow(ws, headers)
  setColWidths(ws, [14, ...minerNames.map(() => 14), 14])

  const allDates = Array.from(
    new Set(allMinerData.flatMap((md) => md.dailyRevenues.map((d) => d.date)))
  ).sort()

  const profitMaps = allMinerData.map((md) => {
    const map = new Map<string, number>()
    for (const d of md.dailyRevenues) map.set(d.date, d.profit)
    return map
  })

  allDates.forEach((date, idx) => {
    const profits = allMinerData.map((_, i) => profitMaps[i].get(date) ?? 0)
    const rowTotal = profits.reduce((s, p) => s + p, 0)
    const rowIdx = idx + 2
    const values = [date, ...profits, rowTotal]
    const formats = [FMT.date, ...profits.map(() => FMT.usd), FMT.usd]
    applyDataRow(ws, rowIdx, values, formats, rowTotal)
  })

  // Footer row
  const footerIdx = allDates.length + 2
  const totals = allMinerData.map((md) => md.totalProfit)
  const grandTotal = totals.reduce((s, t) => s + t, 0)
  applyFooterRow(ws, footerIdx, ['汇总', ...totals, grandTotal], [FMT.date, ...totals.map(() => FMT.usd), FMT.usd], grandTotal)
}

// ── Miner sheet ───────────────────────────────────────────────────────────────
function buildMinerSheet(
  wb: import('exceljs').Workbook,
  md: MinerDailyData
) {
  const sheetName = sanitizeSheetName(md.miner.name)
  const ws = wb.addWorksheet(sheetName)
  const isScrypt = md.miner.algorithm === 'scrypt'

  // Extra number formats for price / difficulty columns
  const FMT_btcPrice  = '"$"#,##0'
  const FMT_ltcPrice  = '"$"#,##0.00'
  const FMT_dogePrice = '"$"0.0000'
  const FMT_diff      = '#,##0'

  const headers = isScrypt
    ? ['日期', 'LTC价格', 'DOGE价格', 'LTC难度', 'DOGE难度', 'LTC产出', 'DOGE产出', '收入', '电费', '净利润']
    : ['日期', 'BTC价格', 'BTC难度', 'BTC产出', '收入', '电费', '净利润']

  applyHeaderRow(ws, headers)

  const colWidths = isScrypt
    ? [14, 12, 12, 16, 16, 14, 14, 14, 14, 14]
    : [14, 14, 18, 16, 14, 14, 14]
  setColWidths(ws, colWidths)

  md.dailyRevenues.forEach((row, idx) => {
    const rowIdx = idx + 2
    const values = isScrypt
      ? [
          row.date,
          row.prices.LTC || 0,
          row.prices.DOGE || 0,
          row.difficulties?.LTC || 0,
          row.difficulties?.DOGE || 0,
          row.coinOutputs.LTC,
          row.coinOutputs.DOGE,
          row.revenue,
          row.electricityCost,
          row.profit,
        ]
      : [
          row.date,
          row.prices.BTC || 0,
          row.difficulties?.BTC || 0,
          row.coinOutputs.BTC,
          row.revenue,
          row.electricityCost,
          row.profit,
        ]
    const formats = isScrypt
      ? [FMT.date, FMT_ltcPrice, FMT_dogePrice, FMT_diff, FMT_diff, FMT.ltcOut, FMT.dogeOut, FMT.usd, FMT.usd, FMT.usd]
      : [FMT.date, FMT_btcPrice, FMT_diff, FMT.btcOut, FMT.usd, FMT.usd, FMT.usd]
    applyDataRow(ws, rowIdx, values, formats, row.profit)
  })

  // Footer — prices/difficulties show period averages; outputs/$ show totals
  const footerIdx = md.dailyRevenues.length + 2
  const n = md.dailyRevenues.length || 1

  const totalCoinLTC  = md.dailyRevenues.reduce((s, d) => s + (d.coinOutputs.LTC  ?? 0), 0)
  const totalCoinDOGE = md.dailyRevenues.reduce((s, d) => s + (d.coinOutputs.DOGE ?? 0), 0)
  const totalCoinBTC  = md.dailyRevenues.reduce((s, d) => s + (d.coinOutputs.BTC  ?? 0), 0)

  const avgBtcPrice  = md.dailyRevenues.reduce((s, d) => s + (d.prices.BTC  || 0), 0) / n
  const avgLtcPrice  = md.dailyRevenues.reduce((s, d) => s + (d.prices.LTC  || 0), 0) / n
  const avgDogePrice = md.dailyRevenues.reduce((s, d) => s + (d.prices.DOGE || 0), 0) / n
  const avgBtcDiff   = md.dailyRevenues.reduce((s, d) => s + (d.difficulties?.BTC  || 0), 0) / n
  const avgLtcDiff   = md.dailyRevenues.reduce((s, d) => s + (d.difficulties?.LTC  || 0), 0) / n
  const avgDogeDiff  = md.dailyRevenues.reduce((s, d) => s + (d.difficulties?.DOGE || 0), 0) / n

  const footerValues = isScrypt
    ? ['汇总', avgLtcPrice, avgDogePrice, avgLtcDiff, avgDogeDiff, totalCoinLTC, totalCoinDOGE, md.totalRevenue, md.totalElectricityCost, md.totalProfit]
    : ['汇总', avgBtcPrice, avgBtcDiff, totalCoinBTC, md.totalRevenue, md.totalElectricityCost, md.totalProfit]
  const footerFormats = isScrypt
    ? [FMT.date, FMT_ltcPrice, FMT_dogePrice, FMT_diff, FMT_diff, FMT.ltcOut, FMT.dogeOut, FMT.usd, FMT.usd, FMT.usd]
    : [FMT.date, FMT_btcPrice, FMT_diff, FMT.btcOut, FMT.usd, FMT.usd, FMT.usd]
  applyFooterRow(ws, footerIdx, footerValues, footerFormats, md.totalProfit)
}

// ── Public export function ────────────────────────────────────────────────────
export async function exportToExcel(
  allMinerData: MinerDailyData[],
  dateRange: DateRange
) {
  const { Workbook } = await import('exceljs')
  const wb = new Workbook()
  wb.creator = 'YDKG Mining Dashboard'
  wb.created = new Date()

  buildSummarySheet(wb, allMinerData)
  for (const md of allMinerData) {
    buildMinerSheet(wb, md)
  }

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const from = format(dateRange.from, 'yyyy-MM-dd')
  const to = format(dateRange.to, 'yyyy-MM-dd')
  a.href = url
  a.download = `YDKG-Mining-${from}_${to}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
