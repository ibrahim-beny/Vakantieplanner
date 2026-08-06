import { useEffect, useRef, useState } from 'react'
import { searchPlaces, type PlaceSuggestion } from '../../lib/nominatim'

const DEBOUNCE_MS = 400

/**
 * Tekstveld met live locatiesuggesties (OpenStreetMap Nominatim, gratis,
 * geen key). Vrij typen blijft mogelijk; een gekozen suggestie levert
 * meteen coördinaten op via onPlaceSelected.
 */
export function PlaceSearchInput({
  id,
  value,
  onChange,
  onBlur,
  onPlaceSelected,
}: {
  id: string
  value: string
  onChange: (text: string) => void
  onBlur: () => void
  onPlaceSelected: (place: PlaceSuggestion) => void
}) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function handleChange(text: string) {
    onChange(text)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    abortRef.current?.abort()

    if (text.trim().length < 3) {
      setSuggestions([])
      setOpen(false)
      return
    }

    debounceRef.current = setTimeout(() => {
      const controller = new AbortController()
      abortRef.current = controller
      searchPlaces(text, controller.signal)
        .then((results) => {
          setSuggestions(results)
          setOpen(results.length > 0)
        })
        .catch(() => {
          // Afgebroken of netwerkfout — geen suggesties, vrij typen blijft werken.
        })
    }, DEBOUNCE_MS)
  }

  function pick(place: PlaceSuggestion) {
    setOpen(false)
    setSuggestions([])
    onPlaceSelected(place)
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        id={id}
        className="field-input"
        value={value}
        autoComplete="off"
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setOpen(suggestions.length > 0)}
        onBlur={() => {
          // Klik-op-suggestie eerst laten afhandelen (mousedown) vóór blur sluit.
          window.setTimeout(onBlur, 0)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false)
        }}
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-10 mt-1 max-h-64 overflow-y-auto border-[1.5px] border-edge bg-card shadow-[0_4px_14px_rgba(42,36,32,0.18)]">
          {suggestions.map((s, i) => (
            <li key={`${s.lat}-${s.lng}-${i}`}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-[13.5px] text-ink hover:bg-sand"
                onMouseDown={(e) => {
                  e.preventDefault() // voorkomt dat het inputveld blur/close eerder triggert
                  pick(s)
                }}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
