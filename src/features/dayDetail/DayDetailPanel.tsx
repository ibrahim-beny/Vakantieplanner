import { useEffect, useRef, useState } from 'react'
import { DAY_TYPES, DAY_TYPE_KEYS } from '../../lib/dayTypes'
import { formatFull } from '../../lib/dates'
import type { DayType, Profile, TripDay } from '../../lib/types'
import type { TripMutations } from '../../hooks/useTripData'
import { ActivityTagInput } from './ActivityTagInput'
import { CommentThread } from './CommentThread'
import { PlaceSearchInput } from './PlaceSearchInput'

interface Draft {
  location_name: string
  lat: string
  lng: string
  overnight_location: string
  overnight_lat: string
  overnight_lng: string
  activities: string[]
  drive_time_hours: string
  drive_distance_km: string
  notes: string
}

function toDraft(day: TripDay): Draft {
  return {
    location_name: day.location_name,
    lat: day.lat?.toString() ?? '',
    lng: day.lng?.toString() ?? '',
    overnight_location: day.overnight_location ?? '',
    overnight_lat: day.overnight_lat?.toString() ?? '',
    overnight_lng: day.overnight_lng?.toString() ?? '',
    activities: [...day.activities],
    drive_time_hours: day.drive_time_hours?.toString() ?? '',
    drive_distance_km: day.drive_distance_km?.toString() ?? '',
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
  days,
  members,
  mutations,
  onClose,
}: {
  day: TripDay
  days: TripDay[]
  members: Profile[]
  mutations: TripMutations
  onClose: () => void
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(day))
  const [date, setDate] = useState(day.date)
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
      overnight_location: draft.overnight_location.trim() || null,
      overnight_lat: toNumber(draft.overnight_lat),
      overnight_lng: toNumber(draft.overnight_lng),
      drive_time_hours: toNumber(draft.drive_time_hours),
      drive_distance_km: toNumber(draft.drive_distance_km),
      notes: draft.notes.trim() || null,
    }
    const changed =
      patch.location_name !== day.location_name ||
      patch.lat !== day.lat ||
      patch.lng !== day.lng ||
      patch.overnight_location !== day.overnight_location ||
      patch.overnight_lat !== day.overnight_lat ||
      patch.overnight_lng !== day.overnight_lng ||
      patch.drive_time_hours !== day.drive_time_hours ||
      patch.drive_distance_km !== day.drive_distance_km ||
      patch.notes !== day.notes
    if (changed) void mutations.updateDay(day.id, patch)
  }

  /** Vrij typen maakt de vorige, geverifieerde Nominatim-coördinaat ongeldig. */
  function changeOvernightText(text: string) {
    set({ overnight_location: text, overnight_lat: '', overnight_lng: '' })
  }

  function pickOvernightPlace(place: { label: string; lat: number; lng: number }) {
    const next = {
      overnight_location: place.label,
      overnight_lat: place.lat.toString(),
      overnight_lng: place.lng.toString(),
    }
    set(next)
    void mutations.updateDay(day.id, {
      overnight_location: place.label,
      overnight_lat: place.lat,
      overnight_lng: place.lng,
    })
  }

  function changeDate(newDate: string) {
    if (!newDate || newDate === day.date) return
    const existing = days.find((d) => d.date === newDate && d.id !== day.id)
    if (
      existing &&
      !window.confirm(`Dag op ${formatFull(newDate)} bevat al gegevens. Overschrijven?`)
    ) {
      setDate(day.date)
      return
    }
    setDate(newDate)
    void mutations.moveDay(day.id, newDate)
  }

  const editorName = members.find((m) => m.id === day.updated_by)?.display_name

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
            <input
              id="day-location"
              className="field-input"
              value={draft.location_name}
              onChange={(e) => set({ location_name: e.target.value })}
              onBlur={commitText}
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label htmlFor="day-lat" className="field-label">
                Lat
              </label>
              <input
                id="day-lat"
                inputMode="decimal"
                className="field-input font-mono text-[14px]"
                value={draft.lat}
                onChange={(e) => set({ lat: e.target.value })}
                onBlur={commitText}
              />
            </div>
            <div className="flex-1">
              <label htmlFor="day-lng" className="field-label">
                Lng
              </label>
              <input
                id="day-lng"
                inputMode="decimal"
                className="field-input font-mono text-[14px]"
                value={draft.lng}
                onChange={(e) => set({ lng: e.target.value })}
                onBlur={commitText}
              />
            </div>
          </div>

          <div>
            <label htmlFor="day-type" className="field-label">
              Dagtype
            </label>
            <select
              id="day-type"
              className="field-input"
              value={day.day_type}
              onChange={(e) => void mutations.updateDay(day.id, { day_type: e.target.value as DayType })}
            >
              {DAY_TYPE_KEYS.map((key) => (
                <option key={key} value={key}>
                  {DAY_TYPES[key].label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="day-overnight" className="field-label">
              Overnachting
            </label>
            <PlaceSearchInput
              id="day-overnight"
              value={draft.overnight_location}
              onChange={changeOvernightText}
              onBlur={commitText}
              onPlaceSelected={pickOvernightPlace}
            />
          </div>

          <div>
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                className="accent-(--color-canyon)"
                checked={day.accommodation_booked}
                onChange={(e) => {
                  const checked = e.target.checked
                  void mutations.updateDay(
                    day.id,
                    checked
                      ? { accommodation_booked: true }
                      : {
                          accommodation_booked: false,
                          accommodation_booked_by: null,
                          accommodation_paid_back: false,
                        },
                  )
                }}
              />
              <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
                Slaapplek geboekt
              </span>
            </label>

            {day.accommodation_booked && (
              <div className="mt-3 flex flex-col gap-3 border-l-[1.5px] border-edge pl-3">
                <div>
                  <label htmlFor="day-booked-by" className="field-label">
                    Geboekt door
                  </label>
                  <select
                    id="day-booked-by"
                    className="field-input"
                    value={day.accommodation_booked_by ?? ''}
                    onChange={(e) =>
                      void mutations.updateDay(day.id, {
                        accommodation_booked_by: e.target.value || null,
                        ...(e.target.value ? {} : { accommodation_paid_back: false }),
                      })
                    }
                  >
                    <option value="">Kies wie...</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.display_name}
                      </option>
                    ))}
                  </select>
                </div>

                <label
                  className={`flex items-center gap-2.5 ${
                    day.accommodation_booked_by ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="accent-(--color-sage)"
                    checked={day.accommodation_paid_back}
                    disabled={!day.accommodation_booked_by}
                    onChange={(e) =>
                      void mutations.updateDay(day.id, { accommodation_paid_back: e.target.checked })
                    }
                  />
                  <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
                    Terugbetaald (Tikkie ontvangen)
                  </span>
                </label>
              </div>
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

          <div className="flex gap-3">
            <div className="flex-1">
              <label htmlFor="day-hours" className="field-label">
                Rijtijd (u)
              </label>
              <input
                id="day-hours"
                inputMode="decimal"
                className="field-input font-mono text-[14px]"
                value={draft.drive_time_hours}
                onChange={(e) => set({ drive_time_hours: e.target.value })}
                onBlur={commitText}
              />
            </div>
            <div className="flex-1">
              <label htmlFor="day-km" className="field-label">
                Afstand (km)
              </label>
              <input
                id="day-km"
                inputMode="decimal"
                className="field-input font-mono text-[14px]"
                value={draft.drive_distance_km}
                onChange={(e) => set({ drive_distance_km: e.target.value })}
                onBlur={commitText}
              />
            </div>
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

          <hr className="border-edge" />

          <CommentThread
            day={day}
            members={members}
            onAdd={(body) => mutations.addComment(day.id, body)}
          />

          <div className="mt-2 border-t border-edge pt-4">
            <button
              type="button"
              className="btn-danger-outline w-full"
              onClick={() => {
                if (window.confirm(`Dag op ${formatFull(day.date)} verwijderen?`)) {
                  void mutations.deleteDay(day.id).then(onClose)
                }
              }}
            >
              Dag verwijderen
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
