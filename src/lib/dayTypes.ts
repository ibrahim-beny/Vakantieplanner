import type { DayType } from './types'

/**
 * Dagtype-kleurparen uit de design-handoff. De tekstkleuren van 'licht' en
 * 'gemiddeld' zijn minimaal verdonkerd t.o.v. de handoff (#7A6A3B -> #756639,
 * #8B6420 -> #7D5A1D) zodat kleine tekst WCAG AA (>=4.5:1) haalt — expliciet
 * aandachtspunt uit de handoff-README.
 */
export const DAY_TYPES: Record<DayType, { label: string; bg: string; fg: string }> = {
  aankomst: { label: 'Aankomst', bg: '#D6D0E3', fg: '#3D3457' },
  chill: { label: 'Chill', bg: '#DCE3D3', fg: '#43503A' },
  licht: { label: 'Licht rijden', bg: '#EFE6CC', fg: '#756639' },
  gemiddeld: { label: 'Gemiddeld rijden', bg: '#F0DCAE', fg: '#7D5A1D' },
  zwaar: { label: 'Zwaar rijden', bg: '#E8C4B4', fg: '#8A3D24' },
  vertrek: { label: 'Vertrek', bg: '#C9D2D8', fg: '#2C3B4A' },
}

export const DAY_TYPE_KEYS = Object.keys(DAY_TYPES) as DayType[]
