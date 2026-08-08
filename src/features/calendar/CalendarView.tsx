import { useEffect, useMemo, useRef, useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { formatFull, formatMonthTitle, parseLocalISO, toLocalISO } from '../../lib/dates'
import { BOOKING_BADGES, bookingBadge, nextBookingPatch } from '../../lib/bookingBadge'
import { findStayForDate } from '../../lib/stays'
import { computeStayAdjustments, describeAdjustment } from '../../lib/staySplit'
import { getStoredProfileId } from '../../lib/identity'
import type { ClipboardDay, Profile, TripDay, TripStay } from '../../lib/types'
import type { TripMutations } from '../../hooks/useTripData'
import { useDateRangeSelection } from '../../hooks/useDateRangeSelection'
import { QuickAddModal } from './QuickAddModal'
import { PasteModal } from './PasteModal'
import { StayForm } from '../budget/StayForm'
import { SelectionActionBar } from '../../components/SelectionActionBar'
import { ConfirmModal } from '../../components/ConfirmModal'

const WEEKDAYS = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']
const CELL_HEIGHT = 'clamp(96px, 13vw, 126px)' // vast — grid moet uitgelijnd blijven

function toClipboard(day: TripDay): ClipboardDay {
  return {
    location_name: day.location_name,
    lat: day.lat,
    lng: day.lng,
    activities: [...day.activities],
    notes: day.notes,
  }
}

export function CalendarView({
  days,
  stays,
  members,
  onOpenDay,
  mutations,
}: {
  days: TripDay[]
  stays: TripStay[]
  members: Profile[]
  onOpenDay: (id: string) => void
  mutations: TripMutations
}) {
  const dayByDate = useMemo(() => {
    const map = new Map<string, TripDay>()
    for (const d of days) map.set(d.date, d)
    return map
  }, [days])

  const [monthCursor, setMonthCursor] = useState<Date>(() =>
    days.length > 0 ? startOfMonth(parseLocalISO(days[0].date)) : startOfMonth(new Date()),
  )
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [clipboard, setClipboard] = useState<ClipboardDay | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; date: string } | null>(
    null,
  )
  const [quickAddDate, setQuickAddDate] = useState<string | null>(null)
  const [pasteDate, setPasteDate] = useState<string | null>(null)
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)

  const selection = useDateRangeSelection()
  const rangeSelectStartedRef = useRef(false)
  const [stayFormPrefill, setStayFormPrefill] = useState<
    { start_date: string; end_date: string } | null | undefined
  >(undefined)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [confirmDetachOpen, setConfirmDetachOpen] = useState(false)

  const detachAdjustments = useMemo(
    () => computeStayAdjustments(stays, selection.dates),
    [stays, selection.dates],
  )
  const deletableDayCount = selection.dates.filter((iso) => dayByDate.has(iso)).length

  // Range-selectie loslaten: mouseup kan buiten een cel plaatsvinden.
  useEffect(() => {
    if (!selection.isDragging) return
    const up = () => selection.endRangeDrag()
    window.addEventListener('mouseup', up)
    return () => window.removeEventListener('mouseup', up)
  }, [selection.isDragging, selection])

  // Escape wist een actieve selectie.
  useEffect(() => {
    if (!selection.isRangeActive) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') selection.clear()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selection.isRangeActive, selection])

  const gridDates = useMemo(() => {
    const start = startOfWeek(startOfMonth(monthCursor), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(monthCursor), { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [monthCursor])

  // ⌘C/⌘V (Ctrl+C/V) op de geselecteerde cel — niet wanneer de focus in een
  // invoerveld staat. De kalender is alleen gemount als deze view actief is.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || !selectedDate) return
      const target = e.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      if (e.key === 'c') {
        const day = dayByDate.get(selectedDate)
        if (day) setClipboard(toClipboard(day))
      } else if (e.key === 'v' && clipboard) {
        e.preventDefault()
        setPasteDate(selectedDate)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedDate, dayByDate, clipboard])

  // Contextmenu sluiten bij klik elders
  useEffect(() => {
    if (!contextMenu) return
    const close = () => setContextMenu(null)
    window.addEventListener('mousedown', close)
    window.addEventListener('blur', close)
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('blur', close)
    }
  }, [contextMenu])

  function cycleBooking(stay: TripStay) {
    void mutations.updateStay(stay.id, nextBookingPatch(stay, getStoredProfileId()))
  }

  async function handleMove(dayId: string, targetDate: string) {
    const source = days.find((d) => d.id === dayId)
    if (!source || source.date === targetDate) return
    await mutations.moveDay(dayId, targetDate)
  }

  return (
    <section className="mx-auto w-full max-w-[1200px]" style={{ padding: 'clamp(16px, 4vw, 36px)' }}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[12px] text-muted">
          Rechtermuisklik voor kopiëren/plakken · dubbelklik op een leeg vakje om in te plannen ·
          sleep om te verplaatsen · Shift/Ctrl+slepen om meerdere dagen te selecteren
        </p>
        <div className="flex items-center gap-3">
          <button type="button" className="btn-diesel" onClick={() => setStayFormPrefill(null)}>
            + Verblijf toevoegen
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Vorige maand"
              className="flex h-8 w-8 items-center justify-center border-[1.5px] border-edge bg-card text-inkbody hover:border-diesel hover:text-diesel"
              onClick={() => setMonthCursor((m) => addMonths(m, -1))}
            >
              ‹
            </button>
            <p className="min-w-[150px] text-center font-mono text-[13px] uppercase tracking-[0.08em] text-ink">
              {formatMonthTitle(monthCursor)}
            </p>
            <button
              type="button"
              aria-label="Volgende maand"
              className="flex h-8 w-8 items-center justify-center border-[1.5px] border-edge bg-card text-inkbody hover:border-diesel hover:text-diesel"
              onClick={() => setMonthCursor((m) => addMonths(m, 1))}
            >
              ›
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7" style={{ gap: 'clamp(2px, 0.6vw, 6px)' }}>
        {WEEKDAYS.map((wd) => (
          <p
            key={wd}
            className="pb-1 text-center font-mono text-[12px] uppercase tracking-[0.1em] text-muted"
          >
            {wd}
          </p>
        ))}

        {gridDates.map((date) => {
          const iso = toLocalISO(date)
          const inMonth = isSameMonth(date, monthCursor)
          const day = dayByDate.get(iso)
          const stay = findStayForDate(stays, iso)
          const badge = stay ? bookingBadge(stay) : null
          const isSelected = selectedDate === iso
          const isDragOver = dragOverDate === iso
          const isRangeSelected = selection.isSelected(iso)

          if (!inMonth) {
            return (
              <div
                key={iso}
                className="bg-outmonth p-2 opacity-45"
                style={{ height: CELL_HEIGHT }}
                aria-hidden="true"
              >
                <span className="font-mono text-[12px] text-muted">{date.getDate()}</span>
              </div>
            )
          }

          return (
            <button
              type="button"
              key={iso}
              aria-label={`${formatFull(iso)}${day ? ` — ${day.location_name}` : ' — leeg'}${
                badge ? ` — ${badge.label}` : ''
              }`}
              className="block overflow-hidden p-2 text-left align-top"
              style={{
                height: CELL_HEIGHT,
                position: 'relative',
                background: isRangeSelected
                  ? 'color-mix(in srgb, var(--color-sage) 18%, var(--color-card))'
                  : 'var(--color-card)',
                color: 'var(--color-ink)',
                border: '1px solid var(--color-edge)',
                outline: isRangeSelected
                  ? '2px solid var(--color-sage)'
                  : isDragOver
                    ? '2px dashed var(--color-diesel)'
                    : isSelected
                      ? '2px solid var(--color-gold)'
                      : undefined,
                outlineOffset: -2,
                cursor: 'pointer',
              }}
              draggable={!!day}
              onMouseDown={(e) => {
                const modifier = e.shiftKey || e.ctrlKey || e.metaKey
                rangeSelectStartedRef.current = modifier
                if (modifier) {
                  e.preventDefault()
                  selection.beginRangeDrag(iso)
                }
              }}
              onMouseEnter={() => {
                if (selection.isDragging) selection.extendRangeDrag(iso)
              }}
              onClick={(e) => {
                if (rangeSelectStartedRef.current || e.shiftKey || e.ctrlKey || e.metaKey) {
                  rangeSelectStartedRef.current = false
                  return
                }
                setSelectedDate(iso)
                if (day) onOpenDay(day.id)
              }}
              onDoubleClick={() => {
                if (!day) setQuickAddDate(iso)
              }}
              onContextMenu={(e) => {
                e.preventDefault()
                setSelectedDate(iso)
                setContextMenu({ x: e.clientX, y: e.clientY, date: iso })
              }}
              onDragStart={(e) => {
                if (!day) return
                e.dataTransfer.setData('text/plain', day.id)
                e.dataTransfer.effectAllowed = 'move'
              }}
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                setDragOverDate(iso)
              }}
              onDragLeave={() => setDragOverDate((d) => (d === iso ? null : d))}
              onDrop={(e) => {
                e.preventDefault()
                setDragOverDate(null)
                const dayId = e.dataTransfer.getData('text/plain')
                if (dayId) void handleMove(dayId, iso)
              }}
            >
              <span className="font-mono text-[12px] opacity-75">{date.getDate()}</span>
              {stay && (
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={
                    badge ? `${badge.label} — klik om te wijzigen` : 'Nog niet geboekt — klik om te boeken'
                  }
                  className="absolute flex items-center justify-center font-mono text-[10px] font-bold"
                  style={{
                    top: 6,
                    right: 6,
                    height: 16,
                    width: 16,
                    background: badge ? badge.bg : 'transparent',
                    color: badge ? badge.fg : 'var(--color-muted)',
                    border: badge ? '1.5px solid var(--color-card)' : '1.5px solid var(--color-muted)',
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
              {day && (
                <span className="block">
                  <span className="block truncate text-[12.5px] font-bold leading-snug">
                    {day.location_name}
                  </span>
                  {stay && (
                    <span className="block truncate text-[11px] leading-snug opacity-85">
                      {stay.location_name}
                    </span>
                  )}
                  {day.activities.length > 0 && (
                    <span className="block truncate text-[11px] leading-snug opacity-75">
                      {day.activities.join(', ')}
                    </span>
                  )}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        {BOOKING_BADGES.map((b) => (
          <p
            key={b.status}
            className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-muted"
          >
            <span
              className="flex h-[15px] w-[15px] items-center justify-center text-[10px] font-bold"
              style={{ background: b.bg, color: b.fg }}
            >
              {b.glyph}
            </span>
            {b.label}
          </p>
        ))}
        <p className="font-mono text-[11px] italic text-muted">(geen vinkje = nog niet geboekt)</p>
      </div>

      {contextMenu && (
        <div
          className="fixed z-50 border-[1.5px] border-edge bg-card py-1 shadow-[0_4px_14px_rgba(42,36,32,0.18)]"
          style={{ left: contextMenu.x, top: contextMenu.y, minWidth: 160 }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {dayByDate.get(contextMenu.date) && (
            <button
              type="button"
              className="block w-full px-4 py-2 text-left text-[14px] text-ink hover:bg-sand"
              onClick={() => {
                const day = dayByDate.get(contextMenu.date)
                if (day) setClipboard(toClipboard(day))
                setContextMenu(null)
              }}
            >
              Kopieer dag
            </button>
          )}
          {dayByDate.get(contextMenu.date) && (
            <button
              type="button"
              className="block w-full px-4 py-2 text-left text-[14px] text-ink hover:bg-sand"
              onClick={() => {
                const day = dayByDate.get(contextMenu.date)
                setContextMenu(null)
                if (day) void mutations.deleteDay(day.id)
              }}
            >
              Verwijder dag
            </button>
          )}
          {clipboard && (
            <button
              type="button"
              className="block w-full px-4 py-2 text-left text-[14px] text-ink hover:bg-sand"
              onClick={() => {
                setPasteDate(contextMenu.date)
                setContextMenu(null)
              }}
            >
              Plak hier
            </button>
          )}
          {!dayByDate.get(contextMenu.date) && !clipboard && (
            <p className="px-4 py-2 font-mono text-[12px] text-muted">Niets te plakken</p>
          )}
        </div>
      )}

      {quickAddDate && (
        <QuickAddModal
          date={quickAddDate}
          onClose={() => setQuickAddDate(null)}
          onConfirm={async (location) => {
            await mutations.createDay({
              date: quickAddDate,
              location_name: location,
              activities: [],
            })
            setQuickAddDate(null)
          }}
        />
      )}

      {pasteDate && clipboard && (
        <PasteModal
          clipboard={clipboard}
          targetDate={pasteDate}
          targetDay={dayByDate.get(pasteDate) ?? null}
          onClose={() => setPasteDate(null)}
          onConfirm={async (patch) => {
            const target = dayByDate.get(pasteDate)
            if (target) {
              await mutations.updateDay(target.id, patch)
            } else {
              await mutations.createDay({
                date: pasteDate,
                location_name: clipboard.location_name,
                activities: [],
                ...patch,
              })
            }
            setPasteDate(null)
          }}
        />
      )}

      {selection.isRangeActive && (
        <SelectionActionBar
          count={selection.dates.length}
          canDetachStay={detachAdjustments.length > 0}
          onAddStay={() => {
            setStayFormPrefill({
              start_date: selection.dates[0],
              end_date: selection.dates[selection.dates.length - 1],
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
