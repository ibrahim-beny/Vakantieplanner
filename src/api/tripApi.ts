import type { DayPatch, ExpenseInput, ExpensePatch, StayPatch, TripData } from '../lib/types'

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
  /** Maakt een verblijf aan en geeft het nieuwe stay-id terug. */
  createStay(
    tripId: string,
    fields: { location_name: string; start_date: string; end_date: string } & StayPatch,
  ): Promise<string>
  updateStay(stayId: string, patch: StayPatch): Promise<void>
  deleteStay(stayId: string): Promise<void>

  /** Maakt een kostenpost (+ shares) aan en geeft het nieuwe expense-id terug. */
  createExpense(tripId: string, fields: ExpenseInput): Promise<string>
  /** Wijzigt een kostenpost; als `patch.shares` meegegeven is, vervangt dat alle shares. */
  updateExpense(expenseId: string, patch: ExpensePatch): Promise<void>
  deleteExpense(expenseId: string): Promise<void>

  /** Maakt een categorie aan en geeft het nieuwe category-id terug. */
  createCategory(tripId: string, name: string): Promise<string>
  renameCategory(categoryId: string, name: string): Promise<void>
  /** Bestaande kostenposten met deze categorie vallen terug op "geen categorie". */
  deleteCategory(categoryId: string): Promise<void>

  /**
   * Registreert een daadwerkelijke betaling om een saldo te (deels) te
   * vereffenen. `items` is de bon: de kostenposten die hierin meetellen —
   * voor elk item wordt de bijbehorende expense_shares.reminder_paid direct
   * mee op true gezet.
   */
  recordSettlementPayment(
    tripId: string,
    fields: {
      from_profile: string
      to_profile: string
      amount: number
      paid_at: string
      items: {
        expense_id: string
        profile_id: string
        title: string
        category_name: string | null
        amount: number
        expense_date: string
      }[]
    },
  ): Promise<string>
  /** Verwijdert de afrekening én zet de reminder_paid-vinkjes van de bon weer terug op false. */
  deleteSettlementPayment(paymentId: string): Promise<void>

  /**
   * Persoonlijk "al terugbetaald"-vinkje op één share, los van de echte
   * saldoberekening en settlement_payments — puur cosmetisch.
   */
  toggleShareReminder(expenseId: string, profileId: string, reminderPaid: boolean): Promise<void>
}
