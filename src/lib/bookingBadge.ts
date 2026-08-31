import type { TripStay } from './types'

interface BookingBadgeDef {
  label: string
  glyph: string
  bg: string
  fg: string
}

/** Eén zichtbare boekingsstatus — "niet geboekt" heeft bewust geen badge. */
export const BOOKING_BADGES: BookingBadgeDef[] = [
  {
    label: 'Geboekt',
    glyph: '✓',
    bg: 'var(--color-sage-btn)',
    fg: 'var(--color-card)',
  },
]

export function bookingBadge(stay: Pick<TripStay, 'booked'>): BookingBadgeDef | null {
  return stay.booked ? BOOKING_BADGES[0] : null
}

/** Klik-vinkje in kalender/timeline: leeg <-> geboekt. */
export function nextBookingPatch(stay: Pick<TripStay, 'booked'>): Partial<Pick<TripStay, 'booked'>> {
  return { booked: !stay.booked }
}
