import type { ExpenseShareRow } from './types'

interface ReminderBadgeDef {
  label: string
  glyph: string
  bg: string
  fg: string
}

/** Eén zichtbare staat — "nog niet terugbetaald" heeft bewust geen badge. */
export const REMINDER_BADGE: ReminderBadgeDef = {
  label: 'Terugbetaald',
  glyph: '✓',
  bg: 'var(--color-sage-btn)',
  fg: 'var(--color-card)',
}

export function reminderBadge(share: Pick<ExpenseShareRow, 'reminder_paid'>): ReminderBadgeDef | null {
  return share.reminder_paid ? REMINDER_BADGE : null
}

/** Klik-vinkje: nog niet terugbetaald <-> terugbetaald. */
export function nextShareReminder(share: Pick<ExpenseShareRow, 'reminder_paid'>): boolean {
  return !share.reminder_paid
}
