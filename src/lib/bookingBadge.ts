import type { TripDay } from './types'

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
  day: Pick<TripDay, 'accommodation_booked' | 'accommodation_paid_back'>,
): BookingBadgeDef | null {
  if (!day.accommodation_booked) return null
  return day.accommodation_paid_back ? BOOKING_BADGES[1] : BOOKING_BADGES[0]
}

/**
 * Klik-cyclus voor het snelle vinkje in kalender/timeline:
 * leeg -> geboekt -> geboekt+terugbetaald -> leeg.
 */
export function nextBookingPatch(
  day: Pick<TripDay, 'accommodation_booked' | 'accommodation_paid_back'>,
  currentProfileId: string | null,
): Partial<Pick<TripDay, 'accommodation_booked' | 'accommodation_booked_by' | 'accommodation_paid_back'>> {
  if (!day.accommodation_booked) {
    return {
      accommodation_booked: true,
      accommodation_booked_by: currentProfileId,
      accommodation_paid_back: false,
    }
  }
  if (!day.accommodation_paid_back) {
    return { accommodation_paid_back: true }
  }
  return { accommodation_booked: false, accommodation_booked_by: null, accommodation_paid_back: false }
}
