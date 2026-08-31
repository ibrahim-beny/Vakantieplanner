import { supabase } from '../lib/supabase'
import { addDaysISO } from '../lib/dates'
import { getStoredProfileId } from '../lib/identity'
import type { TripApi } from './tripApi'
import type {
  DayPatch,
  Expense,
  ExpenseCategory,
  ExpensePatch,
  Profile,
  SettlementPayment,
  StayPatch,
  TripDay,
  TripData,
  TripStay,
} from '../lib/types'

function requireIdentity(): string {
  const id = getStoredProfileId()
  if (!id) throw new Error('Nog geen profiel gekozen.')
  return id
}

/** Houd trips.start_date/end_date gelijk aan de werkelijke dag-range. */
async function syncTripRange(tripId: string): Promise<void> {
  const { data, error } = await supabase
    .from('trip_days')
    .select('date')
    .eq('trip_id', tripId)
    .order('date')
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) return
  await supabase
    .from('trips')
    .update({ start_date: data[0].date, end_date: data[data.length - 1].date })
    .eq('id', tripId)
}

function stamped<T extends object>(patch: T): T & { updated_by: string } {
  return { ...patch, updated_by: requireIdentity() }
}

export const supabaseApi: TripApi = {
  async fetchTripData(): Promise<TripData | null> {
    // Geen accounts: er is precies 1 trip, gewoon de eerste pakken.
    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select('id, name, start_date, end_date')
      .order('start_date')
      .limit(1)
    if (tripsError) throw new Error(tripsError.message)
    const trip = trips?.[0]
    if (!trip) return null

    const [membersRes, daysRes, staysRes, expensesRes, categoriesRes, paymentsRes] =
      await Promise.all([
        supabase
          .from('trip_members')
          .select('profiles(id, display_name, color, is_guest)')
          .eq('trip_id', trip.id),
        supabase.from('trip_days').select('*').eq('trip_id', trip.id).order('date'),
        supabase.from('trip_stays').select('*').eq('trip_id', trip.id).order('start_date'),
        supabase
          .from('expenses')
          .select('*, expense_shares(profile_id, share_amount, reminder_paid)')
          .eq('trip_id', trip.id)
          .order('expense_date'),
        supabase
          .from('expense_categories')
          .select('*')
          .eq('trip_id', trip.id)
          .order('sort_order'),
        supabase
          .from('settlement_payments')
          .select('*')
          .eq('trip_id', trip.id)
          .order('paid_at'),
      ])
    if (membersRes.error) throw new Error(membersRes.error.message)
    if (daysRes.error) throw new Error(daysRes.error.message)
    if (staysRes.error) throw new Error(staysRes.error.message)
    if (expensesRes.error) throw new Error(expensesRes.error.message)
    if (categoriesRes.error) throw new Error(categoriesRes.error.message)
    if (paymentsRes.error) throw new Error(paymentsRes.error.message)

    const members = (membersRes.data ?? [])
      .map((row) => row.profiles as unknown as Profile)
      .filter(Boolean)

    const rawDays = daysRes.data ?? []

    const days: TripDay[] = rawDays.map((d) => ({
      ...d,
      activities: d.activities ?? [],
    }))

    const stays: TripStay[] = staysRes.data ?? []
    const categories: ExpenseCategory[] = categoriesRes.data ?? []
    const settlementPayments: SettlementPayment[] = paymentsRes.data ?? []

    const expenses: Expense[] = (expensesRes.data ?? []).map((row) => {
      const { expense_shares, ...rest } = row as typeof row & {
        expense_shares: { profile_id: string; share_amount: number; reminder_paid: boolean }[]
      }
      return { ...rest, shares: expense_shares ?? [] } as Expense
    })

    return { trip, days, stays, expenses, categories, settlementPayments, members }
  },

  async createDay(tripId, fields) {
    const uid = requireIdentity()
    const { data, error } = await supabase
      .from('trip_days')
      .insert({
        trip_id: tripId,
        location_name: 'Nieuwe stop',
        activities: [],
        ...fields,
        updated_by: uid,
      })
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    await syncTripRange(tripId)
    return data.id
  },

  async updateDay(dayId, patch: DayPatch) {
    const { error } = await supabase
      .from('trip_days')
      .update(stamped(patch))
      .eq('id', dayId)
    if (error) throw new Error(error.message)
  },

  async moveDay(dayId, newDate) {
    const { data: day, error: dayError } = await supabase
      .from('trip_days')
      .select('trip_id')
      .eq('id', dayId)
      .single()
    if (dayError) throw new Error(dayError.message)

    // Overschrijven: bestaande dag op de doeldatum eerst weg (unique-constraint).
    const { error: deleteError } = await supabase
      .from('trip_days')
      .delete()
      .eq('trip_id', day.trip_id)
      .eq('date', newDate)
      .neq('id', dayId)
    if (deleteError) throw new Error(deleteError.message)

    const { error } = await supabase
      .from('trip_days')
      .update({ date: newDate, updated_by: requireIdentity() })
      .eq('id', dayId)
    if (error) throw new Error(error.message)
    await syncTripRange(day.trip_id)
  },

  async deleteDay(dayId) {
    const { data: day } = await supabase
      .from('trip_days')
      .select('trip_id')
      .eq('id', dayId)
      .maybeSingle()
    const { error } = await supabase.from('trip_days').delete().eq('id', dayId)
    if (error) throw new Error(error.message)
    if (day) await syncTripRange(day.trip_id)
  },

  async shiftDays(tripId, fromDate, deltaDays) {
    if (deltaDays === 0) return
    const uid = requireIdentity()
    const { data: days, error } = await supabase
      .from('trip_days')
      .select('id, date')
      .eq('trip_id', tripId)
      .gte('date', fromDate)
      .order('date', { ascending: deltaDays < 0 })
    if (error) throw new Error(error.message)

    // Volgorde is conflict-veilig t.o.v. unique(trip_id, date): vooruit
    // schuiven begint bij de laatste datum, terug schuiven bij de eerste.
    for (const day of days ?? []) {
      const { error: updateError } = await supabase
        .from('trip_days')
        .update({ date: addDaysISO(day.date, deltaDays), updated_by: uid })
        .eq('id', day.id)
      if (updateError) throw new Error(updateError.message)
    }
    await syncTripRange(tripId)
  },

  async createStay(tripId, fields) {
    const uid = requireIdentity()
    const { data, error } = await supabase
      .from('trip_stays')
      .insert({
        trip_id: tripId,
        ...fields,
        updated_by: uid,
      })
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    return data.id
  },

  async updateStay(stayId, patch: StayPatch) {
    const { error } = await supabase
      .from('trip_stays')
      .update(stamped(patch))
      .eq('id', stayId)
    if (error) throw new Error(error.message)
  },

  async deleteStay(stayId) {
    const { error } = await supabase.from('trip_stays').delete().eq('id', stayId)
    if (error) throw new Error(error.message)
  },

  async createExpense(tripId, fields) {
    const uid = requireIdentity()
    const { shares, ...rest } = fields
    const { data, error } = await supabase
      .from('expenses')
      .insert({ trip_id: tripId, ...rest, updated_by: uid })
      .select('id')
      .single()
    if (error) throw new Error(error.message)

    if (shares.length > 0) {
      const { error: sharesError } = await supabase
        .from('expense_shares')
        .insert(shares.map((s) => ({ expense_id: data.id, ...s })))
      if (sharesError) throw new Error(sharesError.message)
    }
    return data.id
  },

  async updateExpense(expenseId, patch: ExpensePatch) {
    const { shares, ...rest } = patch
    if (Object.keys(rest).length > 0) {
      const { error } = await supabase.from('expenses').update(stamped(rest)).eq('id', expenseId)
      if (error) throw new Error(error.message)
    }

    if (shares) {
      const { error: deleteError } = await supabase
        .from('expense_shares')
        .delete()
        .eq('expense_id', expenseId)
      if (deleteError) throw new Error(deleteError.message)

      if (shares.length > 0) {
        const { error: insertError } = await supabase
          .from('expense_shares')
          .insert(shares.map((s) => ({ expense_id: expenseId, ...s })))
        if (insertError) throw new Error(insertError.message)
      }
    }
  },

  async deleteExpense(expenseId) {
    const { error } = await supabase.from('expenses').delete().eq('id', expenseId)
    if (error) throw new Error(error.message)
  },

  async createCategory(tripId, name) {
    const { data: existing, error: existingError } = await supabase
      .from('expense_categories')
      .select('sort_order')
      .eq('trip_id', tripId)
      .order('sort_order', { ascending: false })
      .limit(1)
    if (existingError) throw new Error(existingError.message)
    const nextSortOrder = (existing?.[0]?.sort_order ?? -1) + 1

    const { data, error } = await supabase
      .from('expense_categories')
      .insert({ trip_id: tripId, name, sort_order: nextSortOrder })
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    return data.id
  },

  async renameCategory(categoryId, name) {
    const { error } = await supabase
      .from('expense_categories')
      .update({ name })
      .eq('id', categoryId)
    if (error) throw new Error(error.message)
  },

  async deleteCategory(categoryId) {
    const { error } = await supabase.from('expense_categories').delete().eq('id', categoryId)
    if (error) throw new Error(error.message)
  },

  async recordSettlementPayment(tripId, fields) {
    const uid = requireIdentity()
    const { data, error } = await supabase
      .from('settlement_payments')
      .insert({ trip_id: tripId, ...fields, updated_by: uid })
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    return data.id
  },

  async deleteSettlementPayment(paymentId) {
    const { error } = await supabase.from('settlement_payments').delete().eq('id', paymentId)
    if (error) throw new Error(error.message)
  },

  async toggleShareReminder(expenseId, profileId, reminderPaid) {
    const { error } = await supabase
      .from('expense_shares')
      .update({ reminder_paid: reminderPaid })
      .eq('expense_id', expenseId)
      .eq('profile_id', profileId)
    if (error) throw new Error(error.message)
  },
}
