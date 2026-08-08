import { eachDayOfInterval } from 'date-fns'
import { parseLocalISO, toLocalISO } from './dates'

/** Een sleep-selectie: waar de drag begon (anchor) en waar de muis nu is/eindigde (focus). */
export interface DateSelection {
  anchor: string
  focus: string
}

/** Genormaliseerde, oplopend gesorteerde lijst ISO-datums tussen anchor en focus (beide inclusief). */
export function datesInSelection(sel: DateSelection): string[] {
  const start = sel.anchor <= sel.focus ? sel.anchor : sel.focus
  const end = sel.anchor <= sel.focus ? sel.focus : sel.anchor
  return eachDayOfInterval({ start: parseLocalISO(start), end: parseLocalISO(end) }).map(toLocalISO)
}
