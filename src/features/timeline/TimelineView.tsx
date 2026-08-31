import { useEffect, useMemo, useRef, useState } from 'react'
import { addDaysISO, formatDayMonth } from '../../lib/dates'
import { bookingBadge, nextBookingPatch } from '../../lib/bookingBadge'
import { findStayForDate } from '../../lib/stays'
import { computeStayAdjustments, describeAdjustment } from '../../lib/staySplit'
import { colorForCity, type CityColor } from '../../lib/cityColors'
import type { Expense, ExpenseCategory, Profile, TripDay, TripStay } from '../../lib/types'
import type { TripMutations } from '../../hooks/useTripData'
import { useDateRangeSelection } from '../../hooks/useDateRangeSelection'
import { ProgressLine } from './ProgressLine'
import { StayForm } from '../budget/StayForm'
import { SelectionActionBar } from '../../components/SelectionActionBar'
import { ConfirmModal } from '../../components/ConfirmModal'

/** Lineaire dag-voor-dag lijst — de primaire weergave op mobiel. */
export function TimelineView({
  days,
  stays,
  members,
  expenses,
  categories,
  mutations,
  onOpenDay,
  onAddDay,
  onShift,
  cityColorMap,
}: {
  days: TripDay[]
  stays: TripStay[]
  members: Profile[]
  expenses: Expense[]
  categories: ExpenseCategory[]
  mutations: TripMutations
  onOpenDay: (id: string) => void
  onAddDay: () => void
  onShift: () => void
  cityColorMap: Map<string, CityColor>
}) {
  const memberName = (id: string | null) =>
    members.find((m) => m.id === id)?.display_name ?? 'onbekend'

  function cycleBooking(stay: TripStay) {
    void mutations.updateStay(stay.id, nextBookingPatch(stay))
  }

  const selection = useDateRangeSelection()
  const rangeSelectStartedRef = useRef(false)
  const [stayFormPrefill, setStayFormPrefill] = useState<
    { start_date: string; end_date: string } | null | undefined
  >(undefined)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [confirmDetachOpen, setConfirmDetachOpen] = useState(false)

  const dayByDate = useMemo(() => {
    const map = new Map<string, TripDay>()
    for (const d of days) map.set(d.date, d)
    return map
  }, [days])

  const detachAdjustments = useMemo(
    () => computeStayAdjustments(stays, selection.dates),
    [stays, selection.dates],
  )
  const deletableDayCount = selection.dates.filter((iso) => dayByDate.has(iso)).length

  useEffect(() => {
    if (!selection.isDragging) return
    const up = () => selection.endRangeDrag()
    window.addEventListener('mouseup', up)
    return () => window.removeEventListener('mouseup', up)
  }, [selection.isDragging, selection])

  useEffect(() => {
    if (!selection.isRangeActive) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') selection.clear()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selection.isRangeActive, selection])

  return (
    <section className="mx-auto w-full max-w-[960px]" style={{ padding: 'clamp(16px, 4vw, 36px)' }}>
      <ProgressLine days={days} onOpenDay={onOpenDay} />

      <div className="mb-4 mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[12px] text-muted">
          Shift/Ctrl+slepen om meerdere dagen te selecteren
        </p>
        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" className="btn-outline" onClick={onShift}>
            Dagen verschuiven
          </button>
          <button type="button" className="btn-diesel" onClick={() => setStayFormPrefill(null)}>
            + Verblijf toevoegen
          </button>
          <button type="button" className="btn-diesel" onClick={onAddDay}>
            + Dag toevoegen
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {days.map((day) => {
          const stay = findStayForDate(stays, day.date)
          const badge = stay ? bookingBadge(stay) : null
          const cityColor = colorForCity(cityColorMap, day.location_name)
          const { day: dayNr, month } = formatDayMonth(day.date)
          const isRangeSelected = selection.isSelected(day.date)
          return (
            <button
              key={day.id}
              type="button"
              style={{
                background: isRangeSelected
                  ? `color-mix(in srgb, var(--color-sage) 18%, ${cityColor?.bg ?? 'var(--color-card)'})`
                  : (cityColor?.bg ?? 'var(--color-card)'),
                ...(isRangeSelected
                  ? { outline: '2px solid var(--color-sage)', outlineOffset: -2 }
                  : {}),
              }}
              onMouseDown={(e) => {
                const modifier = e.shiftKey || e.ctrlKey || e.metaKey
                rangeSelectStartedRef.current = modifier
                if (modifier) {
                  e.preventDefault()
                  selection.beginRangeDrag(day.date)
                }
              }}
              onMouseEnter={() => {
                if (selection.isDragging) selection.extendRangeDrag(day.date)
              }}
              onClick={(e) => {
                if (rangeSelectStartedRef.current || e.shiftKey || e.ctrlKey || e.metaKey) {
                  rangeSelectStartedRef.current = false
                  return
                }
                onOpenDay(day.id)
              }}
              className="flex flex-wrap gap-x-5 gap-y-2 border-[1.5px] border-edge px-[18px] py-4 text-left transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:shadow-[0_4px_14px_rgba(42,36,32,0.1)]"
            >
              <span className="min-w-[64px]">
                <span className="block font-display text-[26px] font-bold leading-none text-ink">
                  {dayNr}
                </span>
                <span className="block font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
                  {month}
                </span>
              </span>

              <span className="min-w-0 flex-[3] basis-52">
                <span className="flex flex-wrap items-center gap-2.5">
                  <span className="text-[18px] font-bold leading-snug text-ink">
                    {day.location_name}
                  </span>
                  {stay && (
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={
                        badge
                          ? `${badge.label} — klik om te wijzigen`
                          : 'Nog niet geboekt — klik om te boeken'
                      }
                      className="flex h-[18px] w-[18px] items-center justify-center font-mono text-[10.5px] font-bold"
                      style={{
                        background: badge ? badge.bg : 'transparent',
                        color: badge ? badge.fg : 'var(--color-muted)',
                        border: badge
                          ? '1.5px solid var(--color-card)'
                          : '1.5px solid var(--color-edge)',
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        cycleBooking(stay)
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          e.stopPropagation()
                          cycleBooking(stay)
                        }
                      }}
                    >
                      {badge ? badge.glyph : ''}
                    </span>
                  )}
                </span>
                {stay && (
                  <span className="mt-1 block text-[14px] text-inkbody">
                    {stay.location_name}
                  </span>
                )}
                {day.activities.length > 0 && (
                  <span className="block text-[14px] text-inkbody">
                    {day.activities.join(', ')}
                  </span>
                )}
                {day.notes && (
                  <span className="mt-1 block text-[13px] italic text-muted">{day.notes}</span>
                )}
              </span>

              <span className="flex-1 basis-36 text-right font-mono">
                <span className="mt-1 block text-[11.5px] leading-relaxed text-muted">
                  Laatst bewerkt door {memberName(day.updated_by)}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      {selection.isRangeActive && (
        <SelectionActionBar
          count={selection.dates.length}
          canDetachStay={detachAdjustments.length > 0}
          onAddStay={() => {
            setStayFormPrefill({
              start_date: selection.dates[0],
              end_date: addDaysISO(selection.dates[selection.dates.length - 1], 1),
            })
            selection.clear()
          }}
          onDeleteDays={() => setConfirmDeleteOpen(true)}
          onDetachStay={() => setConfirmDetachOpen(true)}
          onCancel={() => selection.clear()}
        />
      )}

      {stayFormPrefill !== undefined && (
        <StayForm
          stay={null}
          members={members}
          categories={categories}
          expenses={expenses}
          mutations={mutations}
          initialDates={stayFormPrefill ?? undefined}
          onClose={() => setStayFormPrefill(undefined)}
        />
      )}

      {confirmDeleteOpen && (
        <ConfirmModal
          title="Dagen verwijderen"
          message={`Weet je zeker dat je ${deletableDayCount} ${deletableDayCount === 1 ? 'dag' : 'dagen'} wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`}
          confirmLabel="Verwijderen"
          onCancel={() => setConfirmDeleteOpen(false)}
          onConfirm={async () => {
            for (const iso of selection.dates) {
              const d = dayByDate.get(iso)
              if (d) await mutations.deleteDay(d.id)
            }
            setConfirmDeleteOpen(false)
            selection.clear()
          }}
        />
      )}

      {confirmDetachOpen && (
        <ConfirmModal
          title="Verblijf loskoppelen"
          message={detachAdjustments.map(describeAdjustment).join('\n')}
          confirmLabel="Loskoppelen"
          onCancel={() => setConfirmDetachOpen(false)}
          onConfirm={async () => {
            for (const adj of detachAdjustments) {
              if (adj.kind === 'trim') await mutations.updateStay(adj.stay.id, adj.patch)
              else if (adj.kind === 'split') await mutations.updateStay(adj.stay.id, adj.headPatch)
            }
            for (const adj of detachAdjustments) {
              if (adj.kind === 'delete') await mutations.deleteStay(adj.stay.id)
            }
            for (const adj of detachAdjustments) {
              if (adj.kind === 'split') await mutations.createStay(adj.tailFields)
            }
            setConfirmDetachOpen(false)
            selection.clear()
          }}
        />
      )}
    </section>
  )
}
