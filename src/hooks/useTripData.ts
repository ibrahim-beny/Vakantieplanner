import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import type { DayPatch, TripData } from '../lib/types'

/** Zelfde mock-opt-in als src/api/index.ts: geen Supabase-client laden zonder project. */
const useMock = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === '1'

export interface TripMutations {
  createDay(fields: { date: string } & DayPatch): Promise<string | null>
  updateDay(dayId: string, patch: DayPatch): Promise<void>
  moveDay(dayId: string, newDate: string): Promise<void>
  deleteDay(dayId: string): Promise<void>
  shiftDays(fromDate: string, deltaDays: number): Promise<void>
  addComment(dayId: string, body: string): Promise<void>
}

/**
 * Laadt de actieve trip en biedt mutaties aan volgens het simpele
 * save & refetch-model: schrijf naar de backend, haal daarna alles opnieuw op.
 */
export function useTripData() {
  const [data, setData] = useState<TripData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    try {
      setData(await api.fetchTripData())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Laden mislukt.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const tripId = data?.trip.id

  // Realtime: haal opnieuw op zodra de ander (of jijzelf, via een ander
  // tabblad) trip_days/trip_day_comments wijzigt — geen refresh meer nodig.
  useEffect(() => {
    if (!tripId || useMock) return

    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    const debouncedRefetch = () => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => void refetch(), 300)
    }

    let unsubscribe: (() => void) | undefined
    void import('../lib/supabase').then(({ supabase }) => {
      if (cancelled) return
      const channel = supabase
        .channel(`trip-${tripId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'trip_days', filter: `trip_id=eq.${tripId}` },
          debouncedRefetch,
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'trip_day_comments' },
          debouncedRefetch,
        )
        .subscribe()
      unsubscribe = () => void supabase.removeChannel(channel)
    })

    return () => {
      cancelled = true
      if (timeoutId) clearTimeout(timeoutId)
      unsubscribe?.()
    }
  }, [tripId, refetch])

  const run = useCallback(
    async (fn: () => Promise<void>) => {
      try {
        await fn()
        setError(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Opslaan mislukt.')
      } finally {
        await refetch()
      }
    },
    [refetch],
  )

  const mutations: TripMutations = {
    createDay: async (fields) => {
      if (!tripId) return null
      let newId: string | null = null
      await run(async () => {
        newId = await api.createDay(tripId, fields)
      })
      return newId
    },
    updateDay: (dayId, patch) => run(() => api.updateDay(dayId, patch)),
    moveDay: (dayId, newDate) => run(() => api.moveDay(dayId, newDate)),
    deleteDay: (dayId) => run(() => api.deleteDay(dayId)),
    shiftDays: async (fromDate, deltaDays) => {
      if (!tripId) return
      await run(() => api.shiftDays(tripId, fromDate, deltaDays))
    },
    addComment: (dayId, body) => run(() => api.addComment(dayId, body)),
  }

  return { data, loading, error, refetch, mutations }
}
