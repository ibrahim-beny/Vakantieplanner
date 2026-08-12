import { differenceInCalendarDays } from 'date-fns'
import { parseLocalISO } from './dates'
import type { TripStay } from './types'

/**
 * Het verblijf (indien aanwezig) dat een kalenderdatum dekt.
 * `end_date` is de vertrek-/checkoutdag en telt zelf niet meer als verblijfsdag.
 */
export function findStayForDate(stays: TripStay[], date: string): TripStay | null {
  return stays.find((s) => s.start_date <= date && date < s.end_date) ?? null
}

/** Aantal nachten van een verblijf (end_date is de checkoutdag, dus niet inclusief). */
export function nightsOf(stay: Pick<TripStay, 'start_date' | 'end_date'>): number {
  return differenceInCalendarDays(parseLocalISO(stay.end_date), parseLocalISO(stay.start_date))
}
