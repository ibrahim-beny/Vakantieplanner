export type DayType = 'chill' | 'licht' | 'gemiddeld' | 'zwaar' | 'vertrek' | 'aankomst'

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

export interface DayComment {
  id: string
  trip_day_id: string
  author_id: string
  body: string
  created_at: string
}

export interface TripDay {
  id: string
  trip_id: string
  date: string // YYYY-MM-DD, lokale kalenderdatum
  location_name: string
  lat: number | null
  lng: number | null
  day_type: DayType
  overnight_location: string | null
  overnight_lat: number | null
  overnight_lng: number | null
  accommodation_booked: boolean
  accommodation_booked_by: string | null
  accommodation_paid_back: boolean
  accommodation_cost: number | null
  activities: string[]
  drive_distance_km: number | null
  drive_time_hours: number | null
  notes: string | null
  updated_by: string | null
  updated_at: string
  comments: DayComment[]
}

export interface TripData {
  trip: Trip
  days: TripDay[]
  members: Profile[]
}

/** Bewerkbare velden van een dag (datum wijzigen loopt via moveDay). */
export type DayPatch = Partial<
  Omit<TripDay, 'id' | 'trip_id' | 'date' | 'comments' | 'updated_at' | 'updated_by'>
>

/** Velden die via kopieer/plak overgenomen kunnen worden. */
export interface ClipboardDay {
  location_name: string
  lat: number | null
  lng: number | null
  day_type: DayType
  overnight_location: string | null
  overnight_lat: number | null
  overnight_lng: number | null
  activities: string[]
  drive_distance_km: number | null
  drive_time_hours: number | null
  notes: string | null
}
