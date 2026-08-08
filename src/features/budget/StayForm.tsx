import { useState } from 'react'
import { PlaceSearchInput } from '../dayDetail/PlaceSearchInput'
import type { Profile, StayPatch, TripStay } from '../../lib/types'
import type { TripMutations } from '../../hooks/useTripData'

interface Draft {
  location_name: string
  lat: string
  lng: string
  start_date: string
  end_date: string
  cost: string
  booked: boolean
  booked_by: string
  paid_back: boolean
}

function toDraft(stay: TripStay | null, initialDates?: { start_date: string; end_date: string }): Draft {
  return {
    location_name: stay?.location_name ?? '',
    lat: stay?.lat?.toString() ?? '',
    lng: stay?.lng?.toString() ?? '',
    start_date: stay?.start_date ?? initialDates?.start_date ?? '',
    end_date: stay?.end_date ?? initialDates?.end_date ?? '',
    cost: stay?.cost?.toString() ?? '',
    booked: stay?.booked ?? false,
    booked_by: stay?.booked_by ?? '',
    paid_back: stay?.paid_back ?? false,
  }
}

const toNumber = (s: string): number | null => {
  if (s.trim() === '') return null
  const n = Number(s.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/** Formulier om één verblijf (aaneengesloten nachten op één plek) toe te voegen of te bewerken. */
export function StayForm({
  stay,
  members,
  mutations,
  onClose,
  initialDates,
}: {
  stay: TripStay | null
  members: Profile[]
  mutations: TripMutations
  onClose: () => void
  /** Vooringevulde van/tot-datums bij het aanmaken vanuit een dagselectie (genegeerd bij bewerken). */
  initialDates?: { start_date: string; end_date: string }
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(stay, initialDates))
  const [busy, setBusy] = useState(false)
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))

  const isNew = stay === null
  const canSave = draft.location_name.trim() !== '' && draft.start_date !== '' && draft.end_date !== ''
  const rangeInvalid = draft.start_date !== '' && draft.end_date !== '' && draft.end_date < draft.start_date

  function buildPatch(): StayPatch {
    return {
      location_name: draft.location_name.trim(),
      lat: toNumber(draft.lat),
      lng: toNumber(draft.lng),
      start_date: draft.start_date,
      end_date: draft.end_date,
      cost: toNumber(draft.cost),
    }
  }

  async function handleSave() {
    if (!canSave || rangeInvalid || busy) return
    setBusy(true)
    try {
      if (isNew) {
        await mutations.createStay({
          ...(buildPatch() as { location_name: string; start_date: string; end_date: string } & StayPatch),
          booked: draft.booked,
          booked_by: draft.booked ? draft.booked_by || null : null,
          paid_back: draft.booked && draft.booked_by ? draft.paid_back : false,
        })
      } else {
        await mutations.updateStay(stay.id, buildPatch())
      }
      onClose()
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (isNew || busy) return
    setBusy(true)
    try {
      await mutations.deleteStay(stay.id)
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40">
      <div className="animate-scrim absolute inset-0 bg-[rgba(42,36,32,0.35)]" onMouseDown={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isNew ? 'Verblijf toevoegen' : 'Verblijf bewerken'}
        className="animate-panel absolute inset-y-0 right-0 flex w-[min(440px,100vw)] flex-col overflow-y-auto bg-card shadow-[-6px_0_24px_rgba(42,36,32,0.18)]"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-edge bg-card px-6 py-4">
          <h2 className="font-display text-[20px] font-extrabold text-ink">
            {isNew ? 'Verblijf toevoegen' : 'Verblijf bewerken'}
          </h2>
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
            <label htmlFor="stay-location" className="field-label">
              Plaats / accommodatie
            </label>
            <PlaceSearchInput
              id="stay-location"
              value={draft.location_name}
              onChange={(text) => set({ location_name: text, lat: '', lng: '' })}
              onBlur={() => {}}
              onPlaceSelected={(place) =>
                set({ location_name: place.label, lat: place.lat.toString(), lng: place.lng.toString() })
              }
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label htmlFor="stay-start" className="field-label">
                Van
              </label>
              <input
                id="stay-start"
                type="date"
                className="field-input font-mono"
                value={draft.start_date}
                onChange={(e) => set({ start_date: e.target.value })}
              />
            </div>
            <div className="flex-1">
              <label htmlFor="stay-end" className="field-label">
                Tot en met
              </label>
              <input
                id="stay-end"
                type="date"
                className="field-input font-mono"
                value={draft.end_date}
                onChange={(e) => set({ end_date: e.target.value })}
              />
            </div>
          </div>
          {rangeInvalid && (
            <p className="-mt-2 font-mono text-[11px] text-canyon">
              "Tot en met" kan niet vóór "Van" liggen.
            </p>
          )}

          <div>
            <label htmlFor="stay-cost" className="field-label">
              Totale kosten (€)
            </label>
            <input
              id="stay-cost"
              inputMode="decimal"
              className="field-input font-mono text-[14px]"
              value={draft.cost}
              onChange={(e) => set({ cost: e.target.value })}
            />
          </div>

          {isNew ? (
            <div>
              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  className="accent-(--color-canyon)"
                  checked={draft.booked}
                  onChange={(e) =>
                    set(
                      e.target.checked
                        ? { booked: true }
                        : { booked: false, booked_by: '', paid_back: false },
                    )
                  }
                />
                <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
                  Geboekt
                </span>
              </label>

              {draft.booked && (
                <div className="mt-3 flex flex-col gap-3 border-l-[1.5px] border-edge pl-3">
                  <div>
                    <label htmlFor="stay-booked-by" className="field-label">
                      Geboekt door
                    </label>
                    <select
                      id="stay-booked-by"
                      className="field-input"
                      value={draft.booked_by}
                      onChange={(e) =>
                        set({
                          booked_by: e.target.value,
                          ...(e.target.value ? {} : { paid_back: false }),
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
                      draft.booked_by ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="accent-(--color-sage)"
                      checked={draft.paid_back}
                      disabled={!draft.booked_by}
                      onChange={(e) => set({ paid_back: e.target.checked })}
                    />
                    <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
                      Terugbetaald (Tikkie ontvangen)
                    </span>
                  </label>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  className="accent-(--color-canyon)"
                  checked={stay.booked}
                  onChange={(e) => {
                    const checked = e.target.checked
                    void mutations.updateStay(
                      stay.id,
                      checked
                        ? { booked: true }
                        : { booked: false, booked_by: null, paid_back: false },
                    )
                  }}
                />
                <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
                  Geboekt
                </span>
              </label>

              {stay.booked && (
                <div className="mt-3 flex flex-col gap-3 border-l-[1.5px] border-edge pl-3">
                  <div>
                    <label htmlFor="stay-booked-by" className="field-label">
                      Geboekt door
                    </label>
                    <select
                      id="stay-booked-by"
                      className="field-input"
                      value={stay.booked_by ?? ''}
                      onChange={(e) =>
                        void mutations.updateStay(stay.id, {
                          booked_by: e.target.value || null,
                          ...(e.target.value ? {} : { paid_back: false }),
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
                      stay.booked_by ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="accent-(--color-sage)"
                      checked={stay.paid_back}
                      disabled={!stay.booked_by}
                      onChange={(e) => void mutations.updateStay(stay.id, { paid_back: e.target.checked })}
                    />
                    <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
                      Terugbetaald (Tikkie ontvangen)
                    </span>
                  </label>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            disabled={!canSave || rangeInvalid || busy}
            className="btn-primary w-full text-[15px]"
            onClick={handleSave}
          >
            {isNew ? 'Verblijf toevoegen' : 'Wijzigingen opslaan'}
          </button>

          {!isNew && (
            <div className="mt-2 border-t border-edge pt-4">
              <button
                type="button"
                className="btn-danger-outline w-full"
                disabled={busy}
                onClick={handleDelete}
              >
                Verblijf verwijderen
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
