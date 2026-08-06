import type { DayPatch, TripData } from '../lib/types'

/**
 * Datalaag-contract. Productie praat met Supabase (supabaseApi); in dev kan
 * een in-memory mock draaien (mockApi, alleen bij DEV + VITE_USE_MOCK=1).
 * Sync-model is bewust simpel: elke mutatie schrijft weg, de caller refetcht.
 */
export interface TripApi {
  fetchTripData(): Promise<TripData | null>
  /** Maakt een dag aan en geeft het nieuwe day-id terug. */
  createDay(tripId: string, fields: { date: string } & DayPatch): Promise<string>
  updateDay(dayId: string, patch: DayPatch): Promise<void>
  /**
   * Verplaatst een dag naar een andere datum. Een bestaande dag op de
   * doeldatum wordt overschreven (verwijderd) — de UI vraagt vooraf om
   * bevestiging.
   */
  moveDay(dayId: string, newDate: string): Promise<void>
  deleteDay(dayId: string): Promise<void>
  /** Verschuift alle dagen vanaf fromDate met deltaDays (+/-). */
  shiftDays(tripId: string, fromDate: string, deltaDays: number): Promise<void>
  addComment(dayId: string, body: string): Promise<void>
}
