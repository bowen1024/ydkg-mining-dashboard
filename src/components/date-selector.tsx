'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  type DatePreset,
  getPresetRange,
  getPresetLabel,
} from '@/lib/date-utils'
import type { DateRange } from '@/lib/types'

const PRESETS: DatePreset[] = ['this-month', 'last-month', 'last-7', 'last-30', 'custom']

interface DateSelectorProps {
  dateRange: DateRange
  onDateRangeChange: (range: DateRange) => void
}

export function DateSelector({ dateRange, onDateRangeChange }: DateSelectorProps) {
  const [preset, setPreset] = useState<DatePreset>('this-month')
  const [calendarOpen, setCalendarOpen] = useState(false)

  function handlePresetClick(p: DatePreset) {
    setPreset(p)
    if (p !== 'custom') {
      onDateRangeChange(getPresetRange(p))
    } else {
      setCalendarOpen(true)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        日期
      </span>
      <div className="flex gap-1">
        {PRESETS.map((p) => (
          <Button
            key={p}
            variant={preset === p ? 'default' : 'outline'}
            size="sm"
            className="text-xs h-7 px-2.5"
            onClick={() => handlePresetClick(p)}
          >
            {getPresetLabel(p)}
          </Button>
        ))}
      </div>

      {preset === 'custom' && (
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs h-7 gap-1.5">
              <CalendarIcon className="h-3 w-3" />
              {format(dateRange.from, 'MM/dd')} — {format(dateRange.to, 'MM/dd')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  onDateRangeChange({ from: range.from, to: range.to })
                }
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      )}

      <span className="text-xs text-muted-foreground tabular-nums">
        {format(dateRange.from, 'yyyy-MM-dd')} — {format(dateRange.to, 'yyyy-MM-dd')}
      </span>
    </div>
  )
}
