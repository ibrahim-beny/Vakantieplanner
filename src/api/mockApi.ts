import { addDaysISO } from '../lib/dates'
import { getStoredProfileId } from '../lib/identity'
import type { TripApi } from './tripApi'
import type {
  Expense,
  ExpenseCategory,
  ExpensePatch,
  Profile,
  SettlementPayment,
  SettlementPaymentItem,
  TripData,
  TripDay,
  TripStay,
} from '../lib/types'

/**
 * In-memory mock van de datalaag, UITSLUITEND voor lokale verificatie
 * (actief bij `import.meta.env.DEV && VITE_USE_MOCK=1`, zie api/index.ts).
 * Kan nooit in een productie-build actief zijn. Geseed met dezelfde trip
 * als supabase/seed.sql.
 */

const IBRAHIM: Profile = { id: 'user-ibrahim', display_name: 'Ibrahim', color: '#B5502F', is_guest: false }
const REISGENOOT: Profile = { id: 'user-reisgenoot', display_name: 'Zaid', color: '#2C3B4A', is_guest: false }
const YOUNES: Profile = { id: 'user-younes', display_name: 'Younes', color: '#7A8B69', is_guest: true }
const MEMBERS = [IBRAHIM, REISGENOOT, YOUNES]

const TRIP_ID = 'trip-1'

type SeedDay = [
  date: string,
  location: string,
  lat: number,
  lng: number,
  activities: string[],
  notes: string | null,
  editor: string,
]

const SEED_DAYS: SeedDay[] = [
  ['2026-09-01', 'San Francisco', 37.7749, -122.4194, ['Aankomst', 'Wandeling Golden Gate Bridge'], 'Vlucht landt 14:20, motel check-in vanaf 16:00.', IBRAHIM.id],
  ['2026-09-02', 'San Francisco', 37.7749, -122.4194, ['Alcatraz (ochtend)', "Fisherman's Wharf"], 'Alcatraz-tickets vooraf boeken, vaak uitverkocht.', REISGENOOT.id],
  ['2026-09-03', 'San Francisco', 37.7749, -122.4194, ['Chinatown', 'Twin Peaks uitzicht'], 'Derde dag in San Francisco — extra tijd voor wat je zelf nog wilt zien.', IBRAHIM.id],
  ['2026-09-04', 'South Lake Tahoe', 38.9399, -119.9772, ['Kajakken op het meer'], null, IBRAHIM.id],
  ['2026-09-05', 'South Lake Tahoe', 38.9399, -119.9772, ['Wandeling Emerald Bay'], null, IBRAHIM.id],
  ['2026-09-06', 'Reno', 39.5296, -119.8138, ['Downtown Reno', 'Vroeg slapen voor lange rit'], 'Tank volgooien voor morgen — volgende benzinestation is ver.', REISGENOOT.id],
  ['2026-09-07', 'Salt Lake City', 40.7608, -111.891, ['Temple Square (bij aankomst, laat)'], 'Lange rit — om 6:00 vertrekken, twee stops onderweg inplannen.', REISGENOOT.id],
  ['2026-09-08', 'Salt Lake City', 40.7608, -111.891, ['Rustdag', 'Great Salt Lake'], 'Herstellen van gisteren.', IBRAHIM.id],
  ['2026-09-09', 'Bryce Canyon', 37.6283, -112.1676, ['Sunset Point bij aankomst'], 'Parkpas $35, geldt ook voor Zion.', IBRAHIM.id],
  ['2026-09-10', 'Bryce Canyon', 37.6283, -112.1676, ['Navajo Loop hike'], null, REISGENOOT.id],
  ['2026-09-11', 'Springdale (Zion)', 37.1889, -112.9986, ['Intocht Zion Canyon'], null, REISGENOOT.id],
  ['2026-09-12', 'Springdale (Zion)', 37.1889, -112.9986, ['Angels Landing hike'], 'Permit voor Angels Landing nodig — vooraf geregeld.', IBRAHIM.id],
  ['2026-09-13', 'Springdale (Zion)', 37.1889, -112.9986, ['The Narrows'], null, IBRAHIM.id],
  ['2026-09-14', 'Springdale (Zion)', 37.1889, -112.9986, ['Kolob Canyons (optioneel)', 'Rustdag'], 'Extra dag in Zion — lekker rustig aan of nog een hike erbij.', REISGENOOT.id],
  ['2026-09-15', 'Las Vegas', 36.1699, -115.1398, ['Valley of Fire State Park onderweg'], 'Valley of Fire dagpas $10, contant meenemen.', REISGENOOT.id],
  ['2026-09-16', 'Las Vegas', 36.1699, -115.1398, ["The Strip 's avonds"], null, REISGENOOT.id],
  ['2026-09-17', 'Las Vegas', 36.1699, -115.1398, ['Dagtrip Hoover Dam'], 'Geen check-out nodig, gewoon een dagtrip vanuit hetzelfde motel.', IBRAHIM.id],
  ['2026-09-18', 'Los Angeles', 34.0522, -118.2437, ['Aankomst', 'Santa Monica Pier'], null, IBRAHIM.id],
  ['2026-09-19', 'Los Angeles', 34.0522, -118.2437, ['Laatste ochtend', 'Vlucht terug (LAX)'], 'Auto inleveren bij verhuurbedrijf vóór 10:00, vlucht om 14:40.', IBRAHIM.id],
]

type SeedStay = [location: string, start_date: string, end_date: string]

// end_date is de checkoutdag (exclusief, niet meer meegeteld als verblijfsdag).
const SEED_STAYS: SeedStay[] = [
  ['Budget motel, San Francisco', '2026-09-01', '2026-09-04'],
  ['Lakeside cabin, South Lake Tahoe', '2026-09-04', '2026-09-06'],
  ['Budget motel, Reno', '2026-09-06', '2026-09-07'],
  ['Budget motel, Salt Lake City', '2026-09-07', '2026-09-09'],
  ['Lodge bij Bryce Canyon', '2026-09-09', '2026-09-11'],
  ['Cabin Springdale', '2026-09-11', '2026-09-15'],
  ['Budget motel, Las Vegas', '2026-09-15', '2026-09-18'],
  ['Budget motel, Los Angeles', '2026-09-18', '2026-09-19'],
]

const SEED_CATEGORY_NAMES = ['Verblijf', 'Auto', 'Vlucht', 'Eten', 'Overig']

let nextId = 1
const newId = (prefix: string) => `${prefix}-${nextId++}`

const days: TripDay[] = SEED_DAYS.map(
  ([date, location_name, lat, lng, activities, notes, editor]) => ({
    id: newId('day'),
    trip_id: TRIP_ID,
    date,
    location_name,
    lat,
    lng,
    activities,
    notes,
    updated_by: editor,
    updated_at: new Date().toISOString(),
  }),
)

const stays: TripStay[] = SEED_STAYS.map(([location_name, start_date, end_date]) => ({
  id: newId('stay'),
  trip_id: TRIP_ID,
  location_name,
  start_date,
  end_date,
  lat: null,
  lng: null,
  booked: false,
  updated_by: null,
  updated_at: new Date().toISOString(),
}))

const categories: ExpenseCategory[] = SEED_CATEGORY_NAMES.map((name, i) => ({
  id: newId('cat'),
  trip_id: TRIP_ID,
  name,
  color: '#8A8577',
  sort_order: i,
}))

const expenses: Expense[] = []
const settlementPayments: SettlementPayment[] = []
const settlementPaymentItems: SettlementPaymentItem[] = []

const trip = {
  id: TRIP_ID,
  name: 'USA Roadtrip september 2026',
  start_date: '2026-09-01',
  end_date: '2026-09-19',
}

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
const requireStay = (stayId: string): TripStay => {
  const stay = stays.find((s) => s.id === stayId)
  if (!stay) throw new Error('Verblijf niet gevonden.')
  return stay
}
const requireExpense = (expenseId: string): Expense => {
  const expense = expenses.find((e) => e.id === expenseId)
  if (!expense) throw new Error('Kostenpost niet gevonden.')
  return expense
}
const stamp = (row: { updated_by: string | null; updated_at: string }) => {
  row.updated_by = getStoredProfileId()
  row.updated_at = new Date().toISOString()
}
const delay = () => new Promise((r) => setTimeout(r, 120))

export const mockApi: TripApi = {
  async fetchTripData(): Promise<TripData> {
    await delay()
    sortDays()
    return structuredClone({
      trip,
      days,
      stays,
      expenses,
      categories,
      settlementPayments,
      settlementPaymentItems,
      members: MEMBERS,
    })
  },

  async createDay(_tripId, fields) {
    await delay()
    const day: TripDay = {
      id: newId('day'),
      trip_id: TRIP_ID,
      location_name: 'Nieuwe stop',
      lat: null,
      lng: null,
      activities: [],
      notes: null,
      updated_by: null,
      updated_at: '',
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

  async createStay(_tripId, fields) {
    await delay()
    const stay: TripStay = {
      id: newId('stay'),
      trip_id: TRIP_ID,
      lat: null,
      lng: null,
      booked: false,
      updated_by: null,
      updated_at: '',
      ...fields,
    }
    stamp(stay)
    stays.push(stay)
    return stay.id
  },

  async updateStay(stayId, patch) {
    await delay()
    const stay = requireStay(stayId)
    Object.assign(stay, patch)
    stamp(stay)
  },

  async deleteStay(stayId) {
    await delay()
    const index = stays.findIndex((s) => s.id === stayId)
    if (index >= 0) stays.splice(index, 1)
  },

  async createExpense(_tripId, fields) {
    await delay()
    const { shares, ...rest } = fields
    const expense: Expense = {
      id: newId('expense'),
      trip_id: TRIP_ID,
      stay_id: null,
      notes: null,
      updated_by: null,
      updated_at: '',
      ...rest,
      shares: shares.map((s) => ({ ...s, reminder_paid: false })),
    }
    stamp(expense)
    expenses.push(expense)
    return expense.id
  },

  async updateExpense(expenseId, patch: ExpensePatch) {
    await delay()
    const expense = requireExpense(expenseId)
    const { shares, ...rest } = patch
    Object.assign(expense, rest)
    if (shares) expense.shares = shares.map((s) => ({ ...s, reminder_paid: false }))
    stamp(expense)
  },

  async deleteExpense(expenseId) {
    await delay()
    const index = expenses.findIndex((e) => e.id === expenseId)
    if (index >= 0) expenses.splice(index, 1)
  },

  async createCategory(_tripId, name) {
    await delay()
    const nextSortOrder = categories.reduce((max, c) => Math.max(max, c.sort_order), -1) + 1
    const category: ExpenseCategory = {
      id: newId('cat'),
      trip_id: TRIP_ID,
      name,
      color: '#8A8577',
      sort_order: nextSortOrder,
    }
    categories.push(category)
    return category.id
  },

  async renameCategory(categoryId, name) {
    await delay()
    const category = categories.find((c) => c.id === categoryId)
    if (category) category.name = name
  },

  async deleteCategory(categoryId) {
    await delay()
    const index = categories.findIndex((c) => c.id === categoryId)
    if (index >= 0) categories.splice(index, 1)
    for (const expense of expenses) {
      if (expense.category_id === categoryId) expense.category_id = null
    }
  },

  async recordSettlementPayment(_tripId, fields) {
    await delay()
    const { items, ...rest } = fields
    const payment: SettlementPayment = {
      id: newId('payment'),
      trip_id: TRIP_ID,
      ...rest,
    }
    settlementPayments.push(payment)

    for (const item of items) {
      settlementPaymentItems.push({ id: newId('spitem'), payment_id: payment.id, ...item })
      const share = expenses
        .find((e) => e.id === item.expense_id)
        ?.shares.find((s) => s.profile_id === item.profile_id)
      if (share) share.reminder_paid = true
    }
    return payment.id
  },

  async deleteSettlementPayment(paymentId) {
    await delay()
    for (const item of settlementPaymentItems.filter((it) => it.payment_id === paymentId)) {
      const share = expenses
        .find((e) => e.id === item.expense_id)
        ?.shares.find((s) => s.profile_id === item.profile_id)
      if (share) share.reminder_paid = false
    }
    for (let i = settlementPaymentItems.length - 1; i >= 0; i--) {
      if (settlementPaymentItems[i].payment_id === paymentId) settlementPaymentItems.splice(i, 1)
    }
    const index = settlementPayments.findIndex((p) => p.id === paymentId)
    if (index >= 0) settlementPayments.splice(index, 1)
  },

  async toggleShareReminder(expenseId, profileId, reminderPaid) {
    await delay()
    const expense = requireExpense(expenseId)
    const share = expense.shares.find((s) => s.profile_id === profileId)
    if (share) share.reminder_paid = reminderPaid
  },
}
