import { supabase } from '../lib/supabase'
import { addDaysISO } from '../lib/dates'
import type { TripApi } from './tripApi'
import type { DayComment, DayPatch, Profile, TripDay, TripData } from '../lib/types'

async function requireUid(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const uid = data.session?.user.id
  if (!uid) throw new Error('Niet ingelogd.')
  return uid
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, color')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
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

async function stamped(patch: DayPatch): Promise<DayPatch & { updated_by: string }> {
  return { ...patch, updated_by: await requireUid() }
}

export const supabaseApi: TripApi = {
  async getProfile() {
    const { data } = await supabase.auth.getSession()
    if (!data.session) return null
    return fetchProfile(data.session.user.id)
  },

  onAuthChange(cb) {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        cb(null)
        return
      }
      // Niet awaiten in de callback zelf (Supabase-advies): profiel apart ophalen.
      void fetchProfile(session.user.id).then(cb)
    })
    return () => data.subscription.unsubscribe()
  },

  async signInWithMagicLink(email) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false, // geen publieke registratie
        emailRedirectTo: window.location.origin,
      },
    })
    if (error) throw new Error(error.message)
  },

  async signOut() {
    await supabase.auth.signOut()
  },

  async fetchTripData(): Promise<TripData | null> {
    // RLS beperkt tot trips waar de gebruiker lid van is; pak de eerste.
    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select('id, name, start_date, end_date')
      .order('start_date')
      .limit(1)
    if (tripsError) throw new Error(tripsError.message)
    const trip = trips?.[0]
    if (!trip) return null

    const [membersRes, daysRes] = await Promise.all([
      supabase
        .from('trip_members')
        .select('profiles(id, display_name, color)')
        .eq('trip_id', trip.id),
      supabase.from('trip_days').select('*').eq('trip_id', trip.id).order('date'),
    ])
    if (membersRes.error) throw new Error(membersRes.error.message)
    if (daysRes.error) throw new Error(daysRes.error.message)

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

    return { trip, days, members }
  },

  async createDay(tripId, fields) {
    const uid = await requireUid()
    const { data, error } = await supabase
      .from('trip_days')
      .insert({
        trip_id: tripId,
        location_name: 'Nieuwe stop',
        day_type: 'chill',
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

  async updateDay(dayId, patch) {
    const { error } = await supabase
      .from('trip_days')
      .update(await stamped(patch))
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
      .update({ date: newDate, updated_by: await requireUid() })
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
    const uid = await requireUid()
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
    const uid = await requireUid()
    const { error } = await supabase
      .from('trip_day_comments')
      .insert({ trip_day_id: dayId, author_id: uid, body })
    if (error) throw new Error(error.message)
  },
}
