import { addDaysISO } from '../lib/dates'
import type { TripApi } from './tripApi'
import type { DayComment, DayType, Profile, TripData, TripDay } from '../lib/types'

/**
 * In-memory mock van de datalaag, UITSLUITEND voor lokale verificatie
 * (actief bij `import.meta.env.DEV && VITE_USE_MOCK=1`, zie api/index.ts).
 * Kan nooit in een productie-build actief zijn. Geseed met dezelfde trip
 * als supabase/seed.sql.
 */

const IBRAHIM: Profile = { id: 'user-ibrahim', display_name: 'Ibrahim', color: '#B5502F' }
const REISGENOOT: Profile = { id: 'user-reisgenoot', display_name: 'Reisgenoot', color: '#2C3B4A' }

const TRIP_ID = 'trip-1'

type SeedDay = [
  date: string,
  location: string,
  lat: number,
  lng: number,
  dayType: DayType,
  overnight: string | null,
  activities: string[],
  km: number,
  hours: number,
  notes: string | null,
  editor: string,
]

const SEED_DAYS: SeedDay[] = [
  ['2026-09-01', 'San Francisco', 37.7749, -122.4194, 'chill', 'Budget motel, San Francisco', ['Aankomst', 'Wandeling Golden Gate Bridge'], 0, 0, 'Vlucht landt 14:20, motel check-in vanaf 16:00.', IBRAHIM.id],
  ['2026-09-02', 'San Francisco', 37.7749, -122.4194, 'chill', 'Budget motel, San Francisco', ['Alcatraz (ochtend)', "Fisherman's Wharf"], 0, 0, 'Alcatraz-tickets vooraf boeken, vaak uitverkocht.', REISGENOOT.id],
  ['2026-09-03', 'San Francisco', 37.7749, -122.4194, 'chill', 'Budget motel, San Francisco', ['Chinatown', 'Twin Peaks uitzicht'], 0, 0, 'Derde dag in San Francisco — extra tijd voor wat je zelf nog wilt zien.', IBRAHIM.id],
  ['2026-09-04', 'South Lake Tahoe', 38.9399, -119.9772, 'licht', 'Lakeside cabin, South Lake Tahoe', ['Kajakken op het meer'], 340, 3.5, null, IBRAHIM.id],
  ['2026-09-05', 'South Lake Tahoe', 38.9399, -119.9772, 'chill', 'Lakeside cabin, South Lake Tahoe', ['Wandeling Emerald Bay'], 0, 0, null, IBRAHIM.id],
  ['2026-09-06', 'Reno', 39.5296, -119.8138, 'licht', 'Budget motel, Reno', ['Downtown Reno', 'Vroeg slapen voor lange rit'], 70, 1, 'Tank volgooien voor morgen — volgende benzinestation is ver.', REISGENOOT.id],
  ['2026-09-07', 'Salt Lake City', 40.7608, -111.891, 'zwaar', 'Budget motel, Salt Lake City', ['Temple Square (bij aankomst, laat)'], 830, 8.5, 'Lange rit — om 6:00 vertrekken, twee stops onderweg inplannen.', REISGENOOT.id],
  ['2026-09-08', 'Salt Lake City', 40.7608, -111.891, 'chill', 'Budget motel, Salt Lake City', ['Rustdag', 'Great Salt Lake'], 0, 0, 'Herstellen van gisteren.', IBRAHIM.id],
  ['2026-09-09', 'Bryce Canyon', 37.6283, -112.1676, 'gemiddeld', 'Lodge bij Bryce Canyon', ['Sunset Point bij aankomst'], 430, 4.5, 'Parkpas $35, geldt ook voor Zion.', IBRAHIM.id],
  ['2026-09-10', 'Bryce Canyon', 37.6283, -112.1676, 'chill', 'Lodge bij Bryce Canyon', ['Navajo Loop hike'], 0, 0, null, REISGENOOT.id],
  ['2026-09-11', 'Springdale (Zion)', 37.1889, -112.9986, 'licht', 'Cabin Springdale', ['Intocht Zion Canyon'], 120, 1.5, null, REISGENOOT.id],
  ['2026-09-12', 'Springdale (Zion)', 37.1889, -112.9986, 'chill', 'Cabin Springdale', ['Angels Landing hike'], 0, 0, 'Permit voor Angels Landing nodig — vooraf geregeld.', IBRAHIM.id],
  ['2026-09-13', 'Springdale (Zion)', 37.1889, -112.9986, 'chill', 'Cabin Springdale', ['The Narrows'], 0, 0, null, IBRAHIM.id],
  ['2026-09-14', 'Springdale (Zion)', 37.1889, -112.9986, 'chill', 'Cabin Springdale', ['Kolob Canyons (optioneel)', 'Rustdag'], 0, 0, 'Extra dag in Zion — lekker rustig aan of nog een hike erbij.', REISGENOOT.id],
  ['2026-09-15', 'Las Vegas', 36.1699, -115.1398, 'gemiddeld', 'Budget motel, Las Vegas', ['Valley of Fire State Park onderweg'], 270, 3, 'Valley of Fire dagpas $10, contant meenemen.', REISGENOOT.id],
  ['2026-09-16', 'Las Vegas', 36.1699, -115.1398, 'chill', 'Budget motel, Las Vegas', ["The Strip 's avonds"], 0, 0, null, REISGENOOT.id],
  ['2026-09-17', 'Las Vegas', 36.1699, -115.1398, 'licht', 'Budget motel, Las Vegas', ['Dagtrip Hoover Dam'], 100, 2, 'Geen check-out nodig, gewoon een dagtrip vanuit hetzelfde motel.', IBRAHIM.id],
  ['2026-09-18', 'Los Angeles', 34.0522, -118.2437, 'zwaar', 'Budget motel, Los Angeles', ['Aankomst', 'Santa Monica Pier'], 430, 4.5, null, IBRAHIM.id],
  ['2026-09-19', 'Los Angeles', 34.0522, -118.2437, 'vertrek', null, ['Laatste ochtend', 'Vlucht terug (LAX)'], 0, 0, 'Auto inleveren bij verhuurbedrijf vóór 10:00, vlucht om 14:40.', IBRAHIM.id],
]

let nextId = 1
const newId = (prefix: string) => `${prefix}-${nextId++}`

const days: TripDay[] = SEED_DAYS.map(
  ([date, location_name, lat, lng, day_type, overnight_location, activities, km, hours, notes, editor]) => ({
    id: newId('day'),
    trip_id: TRIP_ID,
    date,
    location_name,
    lat,
    lng,
    day_type,
    overnight_location,
    activities,
    drive_distance_km: km,
    drive_time_hours: hours,
    notes,
    updated_by: editor,
    updated_at: new Date().toISOString(),
    comments: [],
  }),
)

function seedComment(date: string, authorId: string, body: string) {
  const day = days.find((d) => d.date === date)
  if (!day) return
  day.comments.push({
    id: newId('comment'),
    trip_day_id: day.id,
    author_id: authorId,
    body,
    created_at: new Date().toISOString(),
  })
}
seedComment('2026-09-01', REISGENOOT.id, 'Zullen we bij aankomst meteen naar de brug lopen of eerst uitchecken bij het motel?')
seedComment('2026-09-01', IBRAHIM.id, 'Eerst motel, dan lopen — anders slepen we met bagage.')
seedComment('2026-09-07', REISGENOOT.id, 'Dit wordt de zwaarste dag. Stop bij Wendover voor koffie?')
seedComment('2026-09-07', IBRAHIM.id, 'Ja graag, en laten we om 6 uur echt vertrekken dit keer.')

const trip = {
  id: TRIP_ID,
  name: 'USA Roadtrip september 2026',
  start_date: '2026-09-01',
  end_date: '2026-09-19',
}

// Met ?uitgelogd in de URL start de mock uitgelogd (om het loginscherm te zien)
let currentProfile: Profile | null = new URLSearchParams(window.location.search).has('uitgelogd')
  ? null
  : IBRAHIM
const listeners = new Set<(p: Profile | null) => void>()
const notify = () => listeners.forEach((cb) => cb(currentProfile))

const sortDays = () => days.sort((a, b) => a.date.localeCompare(b.date))
const syncRange = () => {
  if (days.length === 0) return
  sortDays()
  trip.start_date = days[0].date
  trip.end_date = days[days.length - 1].date
}
const requireDay = (dayId: string): TripDay => {
  const day = days.find((d) => d.id === dayId)
  if (!day) throw new Error('Dag niet gevonden.')
  return day
}
const stamp = (day: TripDay) => {
  day.updated_by = currentProfile?.id ?? null
  day.updated_at = new Date().toISOString()
}
const delay = () => new Promise((r) => setTimeout(r, 120))

export const mockApi: TripApi = {
  async getProfile() {
    return currentProfile
  },
  onAuthChange(cb) {
    listeners.add(cb)
    return () => listeners.delete(cb)
  },
  async signInWithMagicLink() {
    await delay() // LoginScreen toont daarna de "check je mail"-stap
  },
  async signOut() {
    currentProfile = null
    notify()
  },
  async devLogin() {
    currentProfile = IBRAHIM
    notify()
  },

  async fetchTripData(): Promise<TripData> {
    await delay()
    sortDays()
    return structuredClone({ trip, days, members: [IBRAHIM, REISGENOOT] })
  },

  async createDay(_tripId, fields) {
    await delay()
    const day: TripDay = {
      id: newId('day'),
      trip_id: TRIP_ID,
      location_name: 'Nieuwe stop',
      lat: null,
      lng: null,
      day_type: 'chill',
      overnight_location: null,
      activities: [],
      drive_distance_km: null,
      drive_time_hours: null,
      notes: null,
      updated_by: null,
      updated_at: '',
      comments: [],
      ...fields,
    }
    stamp(day)
    days.push(day)
    syncRange()
    return day.id
  },

  async updateDay(dayId, patch) {
    await delay()
    const day = requireDay(dayId)
    Object.assign(day, patch)
    stamp(day)
  },

  async moveDay(dayId, newDate) {
    await delay()
    const day = requireDay(dayId)
    const existingIndex = days.findIndex((d) => d.date === newDate && d.id !== dayId)
    if (existingIndex >= 0) days.splice(existingIndex, 1)
    day.date = newDate
    stamp(day)
    syncRange()
  },

  async deleteDay(dayId) {
    await delay()
    const index = days.findIndex((d) => d.id === dayId)
    if (index >= 0) days.splice(index, 1)
    syncRange()
  },

  async shiftDays(_tripId, fromDate, deltaDays) {
    await delay()
    for (const day of days) {
      if (day.date >= fromDate) day.date = addDaysISO(day.date, deltaDays)
    }
    syncRange()
  },

  async addComment(dayId, body) {
    await delay()
    const day = requireDay(dayId)
    const comment: DayComment = {
      id: newId('comment'),
      trip_day_id: dayId,
      author_id: currentProfile?.id ?? '',
      body,
      created_at: new Date().toISOString(),
    }
    day.comments.push(comment)
  },
}
