import {
  startOfMonth,
  endOfMonth,
  subMonths,
  subDays,
  format,
  eachDayOfInterval,
  min,
} from 'date-fns'
import type { DateRange } from './types'

export type DatePreset = 'this-month' | 'last-month' | 'last-7' | 'last-30' | 'custom'

export function getPresetRange(preset: DatePreset): DateRange {
  const today = new Date()
  switch (preset) {
    case 'this-month':
      return { from: startOfMonth(today), to: min([today, endOfMonth(today)]) }
    case 'last-month': {
      const lastMonth = subMonths(today, 1)
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) }
    }
    case 'last-7':
      return { from: subDays(today, 6), to: today }
    case 'last-30':
      return { from: subDays(today, 29), to: today }
    default:
      return { from: startOfMonth(today), to: today }
  }
}

export function getPresetLabel(preset: DatePreset): string {
  switch (preset) {
    case 'this-month': return '本月'
    case 'last-month': return '上月'
    case 'last-7': return '最近 7 天'
    case 'last-30': return '最近 30 天'
    case 'custom': return '自定义'
  }
}

export function formatDateRange(range: DateRange): string {
  return `${format(range.from, 'yyyy-MM-dd')} — ${format(range.to, 'yyyy-MM-dd')}`
}

export function getDaysInRange(range: DateRange): string[] {
  return eachDayOfInterval({ start: range.from, end: range.to }).map(
    (d) => format(d, 'yyyy-MM-dd')
  )
}
