import type { TripStay } from './types'

export type BookingStatus = 'booked-unpaid' | 'booked-paid'

interface BookingBadgeDef {
  status: BookingStatus
  label: string
  glyph: string
  bg: string
  fg: string
}

/** Twee zichtbare boekingsstatussen — "niet geboekt" heeft bewust geen badge. */
export const BOOKING_BADGES: BookingBadgeDef[] = [
  {
    status: 'booked-unpaid',
    label: 'Geboekt, nog niet terugbetaald',
    glyph: '€',
    bg: 'var(--color-gold)',
    fg: 'var(--color-ink)',
  },
  {
    status: 'booked-paid',
    label: 'Geboekt en terugbetaald',
    glyph: '✓',
    bg: 'var(--color-sage-btn)',
    fg: 'var(--color-card)',
  },
]

export function bookingBadge(
  stay: Pick<TripStay, 'booked' | 'paid_back'>,
): BookingBadgeDef | null {
  if (!stay.booked) return null
  return stay.paid_back ? BOOKING_BADGES[1] : BOOKING_BADGES[0]
}

/**
 * Klik-cyclus voor het snelle vinkje in kalender/timeline/budget:
 * leeg -> geboekt -> geboekt+terugbetaald -> leeg.
 */
export function nextBookingPatch(
  stay: Pick<TripStay, 'booked' | 'paid_back'>,
  currentProfileId: string | null,
): Partial<Pick<TripStay, 'booked' | 'booked_by' | 'paid_back'>> {
  if (!stay.booked) {
    return {
      booked: true,
      booked_by: currentProfileId,
      paid_back: false,
    }
  }
  if (!stay.paid_back) {
    return { paid_back: true }
  }
  return { booked: false, booked_by: null, paid_back: false }
}
