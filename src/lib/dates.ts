import { addDays, format } from 'date-fns'
import { nl } from 'date-fns/locale'

/**
 * Datum -> 'YYYY-MM-DD' in LOKALE tijdzone. Bewust niet via toISOString()
 * (dat is UTC en verschuift de datum een dag in negatieve UTC-offsets).
 */
export function toLocalISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 'YYYY-MM-DD' -> Date om middernacht lokale tijd. */
export function parseLocalISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDaysISO(iso: string, n: number): string {
  return toLocalISO(addDays(parseLocalISO(iso), n))
}

/** bijv. '3 – 18 sept 2026' */
export function formatRange(startISO: string, endISO: string): string {
  const start = parseLocalISO(startISO)
  const end = parseLocalISO(endISO)
  const sameMonth =
    start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
  const endStr = format(end, 'd MMM yyyy', { locale: nl }).replace('.', '')
  if (sameMonth) return `${format(start, 'd')} – ${endStr}`
  return `${format(start, 'd MMM', { locale: nl }).replace('.', '')} – ${endStr}`
}

export function formatDayMonth(iso: string): { day: string; month: string } {
  const d = parseLocalISO(iso)
  return {
    day: format(d, 'd'),
    month: format(d, 'MMM', { locale: nl }).replace('.', ''),
  }
}

/** bijv. 'vrijdag 4 september 2026' */
export function formatFull(iso: string): string {
  return format(parseLocalISO(iso), 'EEEE d MMMM yyyy', { locale: nl })
}

/** bijv. 'september 2026' */
export function formatMonthTitle(d: Date): string {
  return format(d, 'MMMM yyyy', { locale: nl })
}
