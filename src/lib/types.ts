export interface Profile {
  id: string
  display_name: string
  color: string
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

/** Een boeking (hotel/motel/cabin) die één of meerdere aaneengesloten nachten beslaat. */
export interface TripStay {
  id: string
  trip_id: string
  location_name: string
  start_date: string // YYYY-MM-DD, eerste nacht
  end_date: string // YYYY-MM-DD, laatste nacht (inclusief)
  lat: number | null
  lng: number | null
  cost: number | null
  booked: boolean
  booked_by: string | null
  paid_back: boolean
  updated_by: string | null
  updated_at: string
}

export interface TripData {
  trip: Trip
  days: TripDay[]
  stays: TripStay[]
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
