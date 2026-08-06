export interface PlaceSuggestion {
  label: string
  lat: number
  lng: number
}

/** Gratis, key-loze locatiezoeker via OpenStreetMap Nominatim. */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim()
  if (trimmed.length < 3) return []

  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('q', trimmed)
  url.searchParams.set('limit', '5')

  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Nominatim-zoekopdracht mislukt (${res.status})`)

  const data: { display_name: string; lat: string; lon: string }[] = await res.json()
  return data.map((r) => ({ label: r.display_name, lat: Number(r.lat), lng: Number(r.lon) }))
}
