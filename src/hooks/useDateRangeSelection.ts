import { useMemo, useState } from 'react'
import { datesInSelection, type DateSelection } from '../lib/dateRange'

/**
 * Sleep-selectie van meerdere kalenderdatums (Shift/Ctrl+slepen), gedeeld tussen
 * CalendarView en TimelineView. Onafhankelijk van de bestaande enkelvoudige
 * click-selectie (die blijft dienen voor day-detail/copy-paste).
 */
export function useDateRangeSelection() {
  const [selection, setSelection] = useState<DateSelection | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const dates = useMemo(() => (selection ? datesInSelection(selection) : []), [selection])
  const isRangeActive = dates.length >= 2

  function beginRangeDrag(date: string) {
    setIsDragging(true)
    setSelection({ anchor: date, focus: date })
  }

  function extendRangeDrag(date: string) {
    setSelection((s) => (s ? { ...s, focus: date } : null))
  }

  function endRangeDrag() {
    setIsDragging(false)
  }

  function clear() {
    setSelection(null)
    setIsDragging(false)
  }

  function isSelected(date: string) {
    return dates.includes(date)
  }

  return { dates, isRangeActive, isDragging, isSelected, beginRangeDrag, extendRangeDrag, endRangeDrag, clear }
}
