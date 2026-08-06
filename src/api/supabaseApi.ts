import { supabase } from '../lib/supabase'
import { addDaysISO } from '../lib/dates'
import { getStoredProfileId } from '../lib/identity'
import type { TripApi } from './tripApi'
import type { DayComment, DayPatch, Profile, StayPatch, TripDay, TripData, TripStay } from '../lib/types'

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

    const [membersRes, daysRes, staysRes] = await Promise.all([
      supabase
        .from('trip_members')
        .select('profiles(id, display_name, color)')
        .eq('trip_id', trip.id),
      supabase.from('trip_days').select('*').eq('trip_id', trip.id).order('date'),
      supabase.from('trip_stays').select('*').eq('trip_id', trip.id).order('start_date'),
    ])
    if (membersRes.error) throw new Error(membersRes.error.message)
    if (daysRes.error) throw new Error(daysRes.error.message)
    if (staysRes.error) throw new Error(staysRes.error.message)

    const members = (membersRes.data ?? [])
      .map((row) => row.profiles as unknown as Profile)
      .filter(Boolean)

    const rawDays = daysRes.data ?? []
    const dayIds = rawDays.map((d) => d.id)
    let comments: DayComment[] = []
    if (dayIds.length > 0) {
      const { data: commentRows, error: commentsError } = await supabase
        .from('trip_day_comments')
        .select('*')
        .in('trip_day_id', dayIds)
        .order('created_at')
      if (commentsError) throw new Error(commentsError.message)
      comments = commentRows ?? []
    }

    const days: TripDay[] = rawDays.map((d) => ({
      ...d,
      activities: d.activities ?? [],
      comments: comments.filter((c) => c.trip_day_id === d.id),
    }))

    const stays: TripStay[] = staysRes.data ?? []

    return { trip, days, stays, members }
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

  async addComment(dayId, body) {
    const uid = requireIdentity()
    const { error } = await supabase
      .from('trip_day_comments')
      .insert({ trip_day_id: dayId, author_id: uid, body })
    if (error) throw new Error(error.message)
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
}
