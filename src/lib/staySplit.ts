import { addDaysISO, formatRange } from './dates'
import type { StayPatch, TripStay } from './types'

export type StayAdjustment =
  | { kind: 'delete'; stay: TripStay }
  | { kind: 'trim'; stay: TripStay; patch: StayPatch }
  | {
      kind: 'split'
      stay: TripStay
      headPatch: StayPatch
      tailFields: { location_name: string; start_date: string; end_date: string } & StayPatch
    }

/**
 * Bepaalt per verblijf dat overlapt met de geselecteerde datums welke aanpassing(en) nodig
 * zijn zodat na uitvoering geen enkele geselecteerde datum nog door een verblijf gedekt wordt.
 * `selectedDates` moet een aaneengesloten, oplopend gesorteerde lijst zijn (zie datesInSelection).
 */
export function computeStayAdjustments(stays: TripStay[], selectedDates: string[]): StayAdjustment[] {
  if (selectedDates.length === 0) return []
  const selectedMin = selectedDates[0]
  const selectedMax = selectedDates[selectedDates.length - 1]

  const adjustments: StayAdjustment[] = []

  for (const stay of stays) {
    // stay.end_date is de checkoutdag (exclusief); laatste bezette nacht is stay.end_date - 1.
    const stayLastNight = addDaysISO(stay.end_date, -1)
    if (stayLastNight < selectedMin || stay.start_date > selectedMax) continue // geen overlap

    const overlapStart = stay.start_date > selectedMin ? stay.start_date : selectedMin
    const overlapEnd = stayLastNight < selectedMax ? stayLastNight : selectedMax
    const touchesStart = overlapStart === stay.start_date
    const touchesEnd = overlapEnd === stayLastNight

    if (touchesStart && touchesEnd) {
      adjustments.push({ kind: 'delete', stay })
    } else if (touchesStart) {
      // prefix-overlap: kort de stay in aan het begin
      adjustments.push({ kind: 'trim', stay, patch: { start_date: addDaysISO(overlapEnd, 1) } })
    } else if (touchesEnd) {
      // suffix-overlap: kort de stay in aan het eind (nieuwe checkoutdag = eerste geselecteerde dag)
      adjustments.push({ kind: 'trim', stay, patch: { end_date: overlapStart } })
    } else {
      // strikte middenoverlap: splits in kop (bestaand record, behoudt booked) + staart (nieuw, leeg)
      adjustments.push({
        kind: 'split',
        stay,
        headPatch: { end_date: overlapStart },
        tailFields: {
          location_name: stay.location_name,
          start_date: addDaysISO(overlapEnd, 1),
          end_date: stay.end_date,
          lat: stay.lat,
          lng: stay.lng,
          booked: false,
        },
      })
    }
  }

  return adjustments
}

/** Leesbare Nederlandse omschrijving van één aanpassing, voor gebruik in een bevestigingsdialoog. */
export function describeAdjustment(adj: StayAdjustment): string {
  switch (adj.kind) {
    case 'delete':
      return `${adj.stay.location_name} (${formatRange(adj.stay.start_date, adj.stay.end_date)}) wordt volledig verwijderd.`
    case 'trim': {
      const start = adj.patch.start_date ?? adj.stay.start_date
      const end = adj.patch.end_date ?? adj.stay.end_date
      return `${adj.stay.location_name} wordt ingekort tot ${formatRange(start, end)}.`
    }
    case 'split':
      return `${adj.stay.location_name} wordt gesplitst: ${formatRange(adj.stay.start_date, adj.headPatch.end_date ?? adj.stay.end_date)} blijft behouden, ${formatRange(adj.tailFields.start_date, adj.tailFields.end_date)} wordt een nieuwe, nog niet geboekte periode.`
  }
}
