import type { TripDay, TripStay } from './types'

export interface CityColor {
  bg: string
  fg: string
}

/** Categorisch palet, WCAG-AA bg/fg-paren, zelfde zachte sfeer als de rest van het thema. */
const CITY_PALETTE: CityColor[] = [
  { bg: '#DCE3D3', fg: '#43503A' }, // sage
  { bg: '#EFE6CC', fg: '#756639' }, // licht goud
  { bg: '#F0DCAE', fg: '#7D5A1D' }, // amber
  { bg: '#E8C4B4', fg: '#8A3D24' }, // terracotta
  { bg: '#C9D2D8', fg: '#2C3B4A' }, // staalblauw
  { bg: '#D6D0E3', fg: '#3D3457' }, // lavendel
  { bg: '#D3E0DE', fg: '#2E4A45' }, // teal
  { bg: '#E3D3D8', fg: '#5A2E3A' }, // roze
  { bg: '#DDE3C9', fg: '#4C5730' }, // olijf
  { bg: '#E0D3C3', fg: '#5C4429' }, // tan
  { bg: '#CEDCE3', fg: '#2D4A56' }, // leiblauw
  { bg: '#DED3E3', fg: '#4A2E5A' }, // pruim
]

/** lowercase, trim, alles na de eerste komma weg (vangt ", NV" / ", USA"), whitespace normaliseren. */
function normalizeCity(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .split(',')[0]
    .trim()
    .replace(/\s+/g, ' ')
}

/** Levenshtein-afstand, dependency-vrij. */
function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i++) dp[i][0] = i
  for (let j = 0; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[a.length][b.length]
}

/** Herkent kleine schrijfvarianten/typo's zonder korte, echt verschillende steden te verwarren. */
function isFuzzyMatch(a: string, b: string): boolean {
  if (a === b) return true
  if (a.length >= 5 && b.length >= 5 && (a.startsWith(b) || b.startsWith(a))) return true
  const maxLen = Math.max(a.length, b.length)
  const threshold = Math.min(2, Math.floor(maxLen * 0.2))
  return levenshtein(a, b) <= threshold
}

/**
 * Bouwt een lookup van elke ruwe location_name (dag of verblijf) naar een
 * deterministische {bg, fg}-kleur. Schrijfvarianten van dezelfde stad
 * (bijv. "Las Vegas" / "Las Vegas, NV") worden geclusterd zodat ze dezelfde
 * kleur krijgen.
 */
export function buildCityColorMap(days: TripDay[], stays: TripStay[]): Map<string, CityColor> {
  const rawNames = new Set<string>()
  for (const d of days) if (d.location_name) rawNames.add(d.location_name)
  for (const s of stays) if (s.location_name) rawNames.add(s.location_name)

  const sortedRawNames = [...rawNames].sort()

  const canonicalKeys: string[] = []
  const rawToCanonical = new Map<string, string>()

  for (const raw of sortedRawNames) {
    const norm = normalizeCity(raw)
    const matched = canonicalKeys.find((c) => isFuzzyMatch(c, norm))
    const canonical = matched ?? norm
    if (!matched) canonicalKeys.push(canonical)
    rawToCanonical.set(raw, canonical)
  }

  // Kleur volgt de positie van de canonieke naam in de gesorteerde lijst, niet
  // een hash — zo krijgen alle steden een verschillende kleur zolang hun
  // aantal niet groter is dan het palet, en blijft de toewijzing deterministisch
  // omdat canonicalKeys is opgebouwd uit de alfabetisch gesorteerde ruwe namen.
  const result = new Map<string, CityColor>()
  for (const [raw, canonical] of rawToCanonical) {
    const idx = canonicalKeys.indexOf(canonical) % CITY_PALETTE.length
    result.set(raw, CITY_PALETTE[idx])
  }
  return result
}

/** Kleur-lookup per cel/rij, met fallback naar null (view kiest dan de neutrale kleur). */
export function colorForCity(
  map: Map<string, CityColor>,
  locationName: string | null | undefined,
): CityColor | null {
  if (!locationName) return null
  return map.get(locationName) ?? null
}
