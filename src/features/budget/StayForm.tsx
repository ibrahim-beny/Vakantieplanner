import { useState } from 'react'
import { PlaceSearchInput } from '../dayDetail/PlaceSearchInput'
import { formatEuro } from '../../lib/format'
import { getStoredProfileId } from '../../lib/identity'
import { computeEqualShares } from '../../lib/settlement'
import type { Expense, ExpenseCategory, Profile, StayPatch, TripStay } from '../../lib/types'
import type { TripMutations } from '../../hooks/useTripData'
import { ExpenseForm } from '../expenses/ExpenseForm'

interface Draft {
  location_name: string
  lat: string
  lng: string
  start_date: string
  end_date: string
  booked: boolean
  cost: string
  costPaidBy: string
}

function toDraft(stay: TripStay | null, initialDates?: { start_date: string; end_date: string }): Draft {
  return {
    location_name: stay?.location_name ?? '',
    lat: stay?.lat?.toString() ?? '',
    lng: stay?.lng?.toString() ?? '',
    start_date: stay?.start_date ?? initialDates?.start_date ?? '',
    end_date: stay?.end_date ?? initialDates?.end_date ?? '',
    booked: stay?.booked ?? false,
    cost: '',
    costPaidBy: getStoredProfileId() ?? '',
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
  categories,
  expenses,
  mutations,
  onClose,
  initialDates,
}: {
  stay: TripStay | null
  members: Profile[]
  categories: ExpenseCategory[]
  expenses: Expense[]
  mutations: TripMutations
  onClose: () => void
  /** Vooringevulde van/tot-datums bij het aanmaken vanuit een dagselectie (genegeerd bij bewerken). */
  initialDates?: { start_date: string; end_date: string }
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(stay, initialDates))
  const [busy, setBusy] = useState(false)
  const [costFormOpen, setCostFormOpen] = useState(false)
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))

  const isNew = stay === null
  const canSave = draft.location_name.trim() !== '' && draft.start_date !== '' && draft.end_date !== ''
  const rangeInvalid = draft.start_date !== '' && draft.end_date !== '' && draft.end_date <= draft.start_date
  const linkedExpense = stay ? (expenses.find((e) => e.stay_id === stay.id) ?? null) : null
  const verblijfCategoryId =
    categories.find((c) => c.name.toLowerCase() === 'verblijf')?.id ?? null

  function buildPatch(): StayPatch {
    return {
      location_name: draft.location_name.trim(),
      lat: toNumber(draft.lat),
      lng: toNumber(draft.lng),
      start_date: draft.start_date,
      end_date: draft.end_date,
    }
  }

  async function handleSave() {
    if (!canSave || rangeInvalid || busy) return
    setBusy(true)
    try {
      if (isNew) {
        const newStayId = await mutations.createStay({
          ...(buildPatch() as { location_name: string; start_date: string; end_date: string } & StayPatch),
          booked: draft.booked,
        })
        const cost = toNumber(draft.cost)
        if (newStayId && cost && cost > 0 && draft.costPaidBy) {
          const participantIds = members.map((m) => m.id)
          await mutations.createExpense({
            title: draft.location_name.trim(),
            category_id: verblijfCategoryId,
            amount: cost,
            expense_date: draft.start_date,
            paid_by: draft.costPaidBy,
            split_type: 'equal',
            stay_id: newStayId,
            shares: computeEqualShares(cost, participantIds),
          })
        }
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
                Tot
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
              "Tot" moet ná "Van" liggen.
            </p>
          )}

          <div>
            <span className="field-label">Kosten</span>
            {isNew ? (
              <div className="flex flex-col gap-3">
                <input
                  id="stay-cost"
                  inputMode="decimal"
                  className="field-input font-mono text-[14px]"
                  placeholder="Totale kosten (€, optioneel)"
                  value={draft.cost}
                  onChange={(e) => set({ cost: e.target.value })}
                />
                {toNumber(draft.cost) !== null && (toNumber(draft.cost) as number) > 0 && (
                  <select
                    className="field-input"
                    value={draft.costPaidBy}
                    onChange={(e) => set({ costPaidBy: e.target.value })}
                  >
                    <option value="">Betaald door...</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.display_name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ) : linkedExpense ? (
              <div className="border-[1.5px] border-edge bg-[rgba(42,36,32,0.03)] px-3 py-2.5">
                <p className="font-mono text-[14px] font-bold text-ink">
                  {formatEuro(linkedExpense.amount)}
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-muted">
                  Betaald door {members.find((m) => m.id === linkedExpense.paid_by)?.display_name ?? 'onbekend'}{' '}
                  · {linkedExpense.shares.length}{' '}
                  {linkedExpense.shares.length === 1 ? 'deelnemer' : 'deelnemers'}
                </p>
                <button
                  type="button"
                  className="mt-2 font-mono text-[12px] text-diesel underline hover:text-canyon"
                  onClick={() => setCostFormOpen(true)}
                >
                  Kosten bewerken
                </button>
              </div>
            ) : (
              <button type="button" className="btn-outline w-full" onClick={() => setCostFormOpen(true)}>
                + Kosten toevoegen
              </button>
            )}
          </div>

          <div>
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                className="accent-(--color-canyon)"
                checked={isNew ? draft.booked : stay.booked}
                onChange={(e) => {
                  if (isNew) {
                    set({ booked: e.target.checked })
                  } else {
                    void mutations.updateStay(stay.id, { booked: e.target.checked })
                  }
                }}
              />
              <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
                Geboekt
              </span>
            </label>
          </div>

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

      {costFormOpen && stay && (
        <ExpenseForm
          expense={linkedExpense}
          members={members}
          categories={categories}
          stays={[stay]}
          mutations={mutations}
          lockedStay={stay}
          prefill={
            linkedExpense
              ? undefined
              : {
                  title: stay.location_name,
                  expense_date: stay.start_date,
                  category_id: verblijfCategoryId,
                  stay_id: stay.id,
                }
          }
          onClose={() => setCostFormOpen(false)}
        />
      )}
    </div>
  )
}
