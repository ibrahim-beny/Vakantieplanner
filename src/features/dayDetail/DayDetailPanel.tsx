import { useEffect, useRef, useState } from 'react'
import { formatEuro } from '../../lib/format'
import { findStayForDate, nightsOf } from '../../lib/stays'
import type { Profile, TripDay, TripStay } from '../../lib/types'
import type { TripMutations } from '../../hooks/useTripData'
import { ActivityTagInput } from './ActivityTagInput'
import { PlaceSearchInput } from './PlaceSearchInput'
import { StayForm } from '../budget/StayForm'

interface Draft {
  location_name: string
  lat: string
  lng: string
  activities: string[]
  notes: string
}

function toDraft(day: TripDay): Draft {
  return {
    location_name: day.location_name,
    lat: day.lat?.toString() ?? '',
    lng: day.lng?.toString() ?? '',
    activities: [...day.activities],
    notes: day.notes ?? '',
  }
}

const toNumber = (s: string): number | null => {
  if (s.trim() === '') return null
  const n = Number(s.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/**
 * Dag bewerken in een side panel vanaf rechts. Elke veldwijziging wordt
 * direct opgeslagen (on change/blur, geen save-knop) en stampt updated_by.
 */
export function DayDetailPanel({
  day,
  members,
  stays,
  mutations,
  onClose,
}: {
  day: TripDay
  members: Profile[]
  stays: TripStay[]
  mutations: TripMutations
  onClose: () => void
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(day))
  const [date, setDate] = useState(day.date)
  const [editingStay, setEditingStay] = useState(false)
  // Ref met de meest recente activiteitenlijst, zodat snel opeenvolgende
  // tag-wijzigingen (add/add binnen één render) niet elkaars update overschrijven.
  const activitiesRef = useRef<string[]>([...day.activities])

  // Alleen hersyncen bij een andere dag; tijdens bewerken is de draft leidend.
  useEffect(() => {
    setDraft(toDraft(day))
    setDate(day.date)
    activitiesRef.current = [...day.activities]
  }, [day.id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden' // body niet mee laten scrollen achter het paneel
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))

  function changeActivities(compute: (prev: string[]) => string[]) {
    const next = compute(activitiesRef.current)
    activitiesRef.current = next
    set({ activities: next })
    void mutations.updateDay(day.id, { activities: next })
  }

  function commitText() {
    const patch = {
      location_name: draft.location_name.trim() || day.location_name,
      lat: toNumber(draft.lat),
      lng: toNumber(draft.lng),
      notes: draft.notes.trim() || null,
    }
    const changed =
      patch.location_name !== day.location_name ||
      patch.lat !== day.lat ||
      patch.lng !== day.lng ||
      patch.notes !== day.notes
    if (changed) void mutations.updateDay(day.id, patch)
  }

  /** Vrij typen maakt de vorige, geverifieerde Nominatim-coördinaat ongeldig. */
  function changeLocationText(text: string) {
    set({ location_name: text, lat: '', lng: '' })
  }

  function pickLocationPlace(place: { label: string; lat: number; lng: number }) {
    set({ location_name: place.label, lat: place.lat.toString(), lng: place.lng.toString() })
    void mutations.updateDay(day.id, {
      location_name: place.label,
      lat: place.lat,
      lng: place.lng,
    })
  }

  function changeDate(newDate: string) {
    if (!newDate || newDate === day.date) return
    setDate(newDate)
    void mutations.moveDay(day.id, newDate)
  }

  const editorName = members.find((m) => m.id === day.updated_by)?.display_name
  const stay = findStayForDate(stays, day.date)

  return (
    <div className="fixed inset-0 z-40">
      <div
        className="animate-scrim absolute inset-0 bg-[rgba(42,36,32,0.35)]"
        onMouseDown={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Dag bewerken"
        className="animate-panel absolute inset-y-0 right-0 flex w-[min(440px,100vw)] flex-col overflow-y-auto bg-card shadow-[-6px_0_24px_rgba(42,36,32,0.18)]"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-edge bg-card px-6 py-4">
          <h2 className="font-display text-[20px] font-extrabold text-ink">Dag bewerken</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className="flex h-8 w-8 items-center justify-center border-[1.5px] border-edge text-[18px] leading-none text-inkbody hover:border-canyon hover:text-canyon"
          >
            ×
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-4 px-6 py-5">
          <div>
            <label htmlFor="day-date" className="field-label">
              Datum
            </label>
            <input
              id="day-date"
              type="date"
              className="field-input font-mono"
              value={date}
              onChange={(e) => changeDate(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="day-location" className="field-label">
              Locatie
            </label>
            <PlaceSearchInput
              id="day-location"
              value={draft.location_name}
              onChange={changeLocationText}
              onBlur={commitText}
              onPlaceSelected={pickLocationPlace}
            />
          </div>

          <div>
            <span className="field-label">Verblijf</span>
            {stay ? (
              <button
                type="button"
                onClick={() => setEditingStay(true)}
                className="w-full border-[1.5px] border-edge bg-[rgba(42,36,32,0.03)] px-3 py-2.5 text-left font-mono text-[13px] text-inkbody hover:border-canyon"
              >
                {stay.location_name} — {nightsOf(stay)} nacht{nightsOf(stay) === 1 ? '' : 'en'}
                {stay.cost != null && <> · {formatEuro(stay.cost)}</>}
                <br />
                <span className="text-[11px] text-muted">Klik om dit verblijf te bewerken.</span>
              </button>
            ) : (
              <p className="font-mono text-[11px] text-muted">
                Geen verblijf gekoppeld aan deze dag — voeg er een toe in de Budget-tab.
              </p>
            )}
          </div>

          <div>
            <span className="field-label">Activiteiten</span>
            <ActivityTagInput
              value={draft.activities}
              onAdd={(text) =>
                changeActivities((prev) => (prev.includes(text) ? prev : [...prev, text]))
              }
              onRemoveAt={(index) => changeActivities((prev) => prev.filter((_, i) => i !== index))}
              onPop={() => changeActivities((prev) => prev.slice(0, -1))}
            />
          </div>

          <div>
            <label htmlFor="day-notes" className="field-label">
              Notitie
            </label>
            <textarea
              id="day-notes"
              rows={3}
              className="field-input resize-y"
              value={draft.notes}
              onChange={(e) => set({ notes: e.target.value })}
              onBlur={commitText}
            />
          </div>

          {editorName && (
            <p className="font-mono text-[11.5px] text-muted">Laatst bewerkt door {editorName}</p>
          )}

          <div className="mt-2 border-t border-edge pt-4">
            <button
              type="button"
              className="btn-danger-outline w-full"
              onClick={() => {
                void mutations.deleteDay(day.id).then(onClose)
              }}
            >
              Dag verwijderen
            </button>
          </div>
        </div>
      </div>

      {editingStay && stay && (
        <StayForm
          stay={stay}
          members={members}
          mutations={mutations}
          onClose={() => setEditingStay(false)}
        />
      )}
    </div>
  )
}
