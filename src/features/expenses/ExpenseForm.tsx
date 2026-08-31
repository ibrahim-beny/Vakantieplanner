import { useState } from 'react'
import { toLocalISO } from '../../lib/dates'
import { formatEuro } from '../../lib/format'
import { getStoredProfileId } from '../../lib/identity'
import { computeEqualShares } from '../../lib/settlement'
import { nextShareReminder, reminderBadge } from '../../lib/shareReminder'
import type { Expense, ExpenseCategory, ExpenseInput, Profile, TripStay } from '../../lib/types'
import type { TripMutations } from '../../hooks/useTripData'

interface Draft {
  title: string
  category_id: string
  amount: string
  expense_date: string
  paid_by: string
  stay_id: string
  participantIds: string[]
  splitType: 'equal' | 'custom'
  customShares: Record<string, string>
}

function toDraft(
  expense: Expense | null,
  members: Profile[],
  prefill?: { expense_date?: string; stay_id?: string; title?: string; category_id?: string | null },
): Draft {
  if (expense) {
    const customShares: Record<string, string> = {}
    for (const s of expense.shares) customShares[s.profile_id] = s.share_amount.toString()
    return {
      title: expense.title,
      category_id: expense.category_id ?? '',
      amount: expense.amount.toString(),
      expense_date: expense.expense_date,
      paid_by: expense.paid_by,
      stay_id: expense.stay_id ?? '',
      participantIds: expense.shares.map((s) => s.profile_id),
      splitType: expense.split_type,
      customShares,
    }
  }
  return {
    title: prefill?.title ?? '',
    category_id: prefill?.category_id ?? '',
    amount: '',
    expense_date: prefill?.expense_date ?? toLocalISO(new Date()),
    paid_by: getStoredProfileId() ?? '',
    stay_id: prefill?.stay_id ?? '',
    participantIds: members.map((m) => m.id),
    splitType: 'equal',
    customShares: {},
  }
}

const toNumber = (s: string): number => {
  const n = Number(s.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

/** Formulier om één kostenpost toe te voegen of te bewerken, met gelijke of aangepaste verdeling. */
export function ExpenseForm({
  expense,
  members,
  categories,
  stays,
  mutations,
  onClose,
  prefill,
  lockedStay,
}: {
  expense: Expense | null
  members: Profile[]
  categories: ExpenseCategory[]
  stays: TripStay[]
  mutations: TripMutations
  onClose: () => void
  /** Vooringevulde velden bij het aanmaken (genegeerd bij bewerken). */
  prefill?: { expense_date?: string; stay_id?: string; title?: string; category_id?: string | null }
  /** Wanneer geopend vanuit een verblijf: koppeling vastzetten i.p.v. een select tonen. */
  lockedStay?: TripStay
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(expense, members, prefill))
  const [busy, setBusy] = useState(false)
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))

  const isNew = expense === null
  const amount = toNumber(draft.amount)
  const canSave =
    draft.title.trim() !== '' &&
    amount > 0 &&
    draft.expense_date !== '' &&
    draft.paid_by !== '' &&
    draft.participantIds.length > 0

  const equalShares = computeEqualShares(amount, draft.participantIds)
  const customTotal = draft.participantIds.reduce(
    (sum, id) => sum + toNumber(draft.customShares[id] ?? ''),
    0,
  )
  const customDiff = Math.round((amount - customTotal) * 100) / 100
  const splitValid = draft.splitType === 'equal' || Math.abs(customDiff) < 0.01

  function toggleParticipant(id: string) {
    set({
      participantIds: draft.participantIds.includes(id)
        ? draft.participantIds.filter((p) => p !== id)
        : [...draft.participantIds, id],
    })
  }

  function buildShares() {
    if (draft.splitType === 'equal') return computeEqualShares(amount, draft.participantIds)
    return draft.participantIds.map((id) => ({
      profile_id: id,
      share_amount: toNumber(draft.customShares[id] ?? ''),
    }))
  }

  async function handleSave() {
    if (!canSave || !splitValid || busy) return
    setBusy(true)
    try {
      const fields: ExpenseInput = {
        title: draft.title.trim(),
        category_id: draft.category_id || null,
        amount,
        expense_date: draft.expense_date,
        paid_by: draft.paid_by,
        split_type: draft.splitType,
        stay_id: lockedStay ? lockedStay.id : draft.stay_id || null,
        shares: buildShares(),
      }
      if (isNew) {
        await mutations.createExpense(fields)
      } else {
        await mutations.updateExpense(expense.id, fields)
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
      await mutations.deleteExpense(expense.id)
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
        aria-label={isNew ? 'Kosten toevoegen' : 'Kosten bewerken'}
        className="animate-panel absolute inset-y-0 right-0 flex w-[min(440px,100vw)] flex-col overflow-y-auto bg-card shadow-[-6px_0_24px_rgba(42,36,32,0.18)]"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-edge bg-card px-6 py-4">
          <h2 className="font-display text-[20px] font-extrabold text-ink">
            {isNew ? 'Kosten toevoegen' : 'Kosten bewerken'}
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
            <label htmlFor="expense-title" className="field-label">
              Titel
            </label>
            <input
              id="expense-title"
              type="text"
              className="field-input"
              value={draft.title}
              onChange={(e) => set({ title: e.target.value })}
              placeholder="Bijv. Avondeten, Autohuur, Vliegtickets..."
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label htmlFor="expense-category" className="field-label">
                Categorie
              </label>
              <select
                id="expense-category"
                className="field-input"
                value={draft.category_id}
                onChange={(e) => set({ category_id: e.target.value })}
              >
                <option value="">Geen categorie</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label htmlFor="expense-date" className="field-label">
                Datum
              </label>
              <input
                id="expense-date"
                type="date"
                className="field-input font-mono"
                value={draft.expense_date}
                onChange={(e) => set({ expense_date: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label htmlFor="expense-amount" className="field-label">
                Bedrag (€)
              </label>
              <input
                id="expense-amount"
                inputMode="decimal"
                className="field-input font-mono text-[14px]"
                value={draft.amount}
                onChange={(e) => set({ amount: e.target.value })}
              />
            </div>
            <div className="flex-1">
              <label htmlFor="expense-paid-by" className="field-label">
                Betaald door
              </label>
              <select
                id="expense-paid-by"
                className="field-input"
                value={draft.paid_by}
                onChange={(e) => set({ paid_by: e.target.value })}
              >
                <option value="">Kies wie...</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.display_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!lockedStay && (
            <div>
              <label htmlFor="expense-stay" className="field-label">
                Koppelen aan verblijf (optioneel)
              </label>
              <select
                id="expense-stay"
                className="field-input"
                value={draft.stay_id}
                onChange={(e) => set({ stay_id: e.target.value })}
              >
                <option value="">Geen</option>
                {stays.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.location_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <span className="field-label">Wie doet mee?</span>
            <div className="flex flex-col gap-2">
              {members.map((m) => {
                const share =
                  !isNew && m.id !== expense.paid_by
                    ? (expense.shares.find((s) => s.profile_id === m.id) ?? null)
                    : null
                const badge = share ? reminderBadge(share) : null
                return (
                  <label key={m.id} className="flex cursor-pointer items-center gap-2.5">
                    <input
                      type="checkbox"
                      className="accent-(--color-canyon)"
                      checked={draft.participantIds.includes(m.id)}
                      onChange={() => toggleParticipant(m.id)}
                    />
                    <span className="text-[14px] text-inkbody">{m.display_name}</span>
                    {share && (
                      <span
                        role="button"
                        tabIndex={0}
                        title={
                          badge
                            ? 'Al terugbetaald — klik om ongedaan te maken'
                            : 'Nog niet terugbetaald — klik om te markeren'
                        }
                        aria-label={
                          badge ? `${m.display_name}: al terugbetaald` : `${m.display_name}: nog niet terugbetaald`
                        }
                        className="ml-auto flex h-[18px] min-w-[18px] items-center justify-center px-1 font-mono text-[10px] font-bold"
                        style={{
                          background: badge ? badge.bg : 'transparent',
                          color: badge ? badge.fg : 'var(--color-muted)',
                          border: badge ? '1.5px solid var(--color-sage-btn)' : '1.5px solid var(--color-edge)',
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          void mutations.toggleShareReminder(expense!.id, m.id, nextShareReminder(share))
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            e.stopPropagation()
                            void mutations.toggleShareReminder(expense!.id, m.id, nextShareReminder(share))
                          }
                        }}
                      >
                        {badge ? badge.glyph : ''}
                      </span>
                    )}
                  </label>
                )
              })}
            </div>
          </div>

          <div>
            <span className="field-label">Verdeling</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => set({ splitType: 'equal' })}
                className={`flex-1 border-[1.5px] px-3 py-2 font-mono text-[12px] uppercase tracking-[0.06em] ${
                  draft.splitType === 'equal'
                    ? 'border-canyon bg-canyon text-card'
                    : 'border-edge text-inkbody hover:border-diesel'
                }`}
              >
                Gelijk verdelen
              </button>
              <button
                type="button"
                onClick={() => set({ splitType: 'custom' })}
                className={`flex-1 border-[1.5px] px-3 py-2 font-mono text-[12px] uppercase tracking-[0.06em] ${
                  draft.splitType === 'custom'
                    ? 'border-canyon bg-canyon text-card'
                    : 'border-edge text-inkbody hover:border-diesel'
                }`}
              >
                Aangepast
              </button>
            </div>

            {draft.splitType === 'equal' ? (
              <div className="mt-3 flex flex-col gap-1 border-l-[1.5px] border-edge pl-3">
                {equalShares.map((s) => (
                  <p key={s.profile_id} className="font-mono text-[12.5px] text-inkbody">
                    {members.find((m) => m.id === s.profile_id)?.display_name}:{' '}
                    {formatEuro(s.share_amount)}
                  </p>
                ))}
              </div>
            ) : (
              <div className="mt-3 flex flex-col gap-2 border-l-[1.5px] border-edge pl-3">
                {draft.participantIds.map((id) => (
                  <div key={id} className="flex items-center gap-2.5">
                    <span className="w-24 shrink-0 text-[13px] text-inkbody">
                      {members.find((m) => m.id === id)?.display_name}
                    </span>
                    <input
                      inputMode="decimal"
                      className="field-input font-mono text-[13px]"
                      value={draft.customShares[id] ?? ''}
                      onChange={(e) =>
                        set({ customShares: { ...draft.customShares, [id]: e.target.value } })
                      }
                    />
                  </div>
                ))}
                <p
                  className={`font-mono text-[11.5px] ${
                    Math.abs(customDiff) < 0.01 ? 'text-muted' : 'text-canyon'
                  }`}
                >
                  {Math.abs(customDiff) < 0.01
                    ? 'Som klopt met het totaalbedrag.'
                    : `Nog ${formatEuro(customDiff)} te verdelen.`}
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={!canSave || !splitValid || busy}
            className="btn-primary w-full text-[15px]"
            onClick={handleSave}
          >
            {isNew ? 'Kosten toevoegen' : 'Wijzigingen opslaan'}
          </button>

          {!isNew && (
            <div className="mt-2 border-t border-edge pt-4">
              <button
                type="button"
                className="btn-danger-outline w-full"
                disabled={busy}
                onClick={handleDelete}
              >
                Kostenpost verwijderen
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
