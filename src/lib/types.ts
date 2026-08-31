export interface Profile {
  id: string
  display_name: string
  color: string
  /** Gast-deelnemer: telt mee in kostenverdeling, kan zichzelf niet kiezen als "wie ben jij". */
  is_guest: boolean
}

export interface Trip {
  id: string
  name: string
  start_date: string
  end_date: string
}

export interface TripDay {
  id: string
  trip_id: string
  date: string // YYYY-MM-DD, lokale kalenderdatum
  location_name: string
  lat: number | null
  lng: number | null
  activities: string[]
  notes: string | null
  updated_by: string | null
  updated_at: string
}

/**
 * Een boeking (hotel/motel/cabin) die één of meerdere aaneengesloten nachten
 * beslaat. Kosten lopen via een gekoppelde Expense (zie stay_id daar) —
 * `booked` is hier puur een reserverings-vinkje, los van geld.
 */
export interface TripStay {
  id: string
  trip_id: string
  location_name: string
  start_date: string // YYYY-MM-DD, eerste nacht
  end_date: string // YYYY-MM-DD, laatste nacht (inclusief)
  lat: number | null
  lng: number | null
  booked: boolean
  updated_by: string | null
  updated_at: string
}

export type ExpenseCategory = {
  id: string
  trip_id: string
  name: string
  color: string
  sort_order: number
}

export type SplitType = 'equal' | 'custom'

export interface ExpenseShare {
  profile_id: string
  share_amount: number
}

/**
 * Eén share zoals die terugkomt uit de fetch, met het puur-cosmetische
 * "heb ik mijn aandeel al terugbetaald aan de betaler?"-vinkje erbij. Los
 * van de echte saldoberekening (settlement.ts) en van settlement_payments —
 * puur een persoonlijke checklist-marker.
 */
export interface ExpenseShareRow extends ExpenseShare {
  reminder_paid: boolean
}

/** Eén kostenpost (verblijf, autohuur, vliegticket, eten, ...). */
export interface Expense {
  id: string
  trip_id: string
  title: string
  category_id: string | null
  amount: number
  expense_date: string // YYYY-MM-DD
  paid_by: string // Profile.id
  split_type: SplitType
  stay_id: string | null
  notes: string | null
  updated_by: string | null
  updated_at: string
  shares: ExpenseShareRow[]
}

/** Payload voor aanmaken/wijzigen; shares vervangen bij een update altijd alles. */
export interface ExpenseInput {
  title: string
  category_id: string | null
  amount: number
  expense_date: string
  paid_by: string
  split_type: SplitType
  stay_id?: string | null
  notes?: string | null
  shares: ExpenseShare[] // moet optellen tot `amount`
}

export type ExpensePatch = Partial<ExpenseInput>

/** Een daadwerkelijke betaling tussen twee personen om een saldo te vereffenen. */
export interface SettlementPayment {
  id: string
  trip_id: string
  from_profile: string
  to_profile: string
  amount: number
  paid_at: string // YYYY-MM-DD
}

export interface TripData {
  trip: Trip
  days: TripDay[]
  stays: TripStay[]
  expenses: Expense[]
  categories: ExpenseCategory[]
  settlementPayments: SettlementPayment[]
  members: Profile[]
}

/** Bewerkbare velden van een dag (datum wijzigen loopt via moveDay). */
export type DayPatch = Partial<
  Omit<TripDay, 'id' | 'trip_id' | 'date' | 'updated_at' | 'updated_by'>
>

/** Bewerkbare velden van een verblijf. */
export type StayPatch = Partial<Omit<TripStay, 'id' | 'trip_id' | 'updated_at' | 'updated_by'>>

/** Velden die via kopieer/plak overgenomen kunnen worden. */
export interface ClipboardDay {
  location_name: string
  lat: number | null
  lng: number | null
  activities: string[]
  notes: string | null
}
