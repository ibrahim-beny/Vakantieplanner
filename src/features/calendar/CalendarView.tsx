import { useEffect, useMemo, useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { DAY_TYPES } from '../../lib/dayTypes'
import { formatFull, formatMonthTitle, parseLocalISO, toLocalISO } from '../../lib/dates'
import type { ClipboardDay, TripDay } from '../../lib/types'
import type { TripMutations } from '../../hooks/useTripData'
import { QuickAddModal } from './QuickAddModal'
import { PasteModal } from './PasteModal'

const WEEKDAYS = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']
const CELL_HEIGHT = 'clamp(96px, 13vw, 126px)' // vast — grid moet uitgelijnd blijven

function toClipboard(day: TripDay): ClipboardDay {
  return {
    location_name: day.location_name,
    lat: day.lat,
    lng: day.lng,
    day_type: day.day_type,
    overnight_location: day.overnight_location,
    activities: [...day.activities],
    drive_distance_km: day.drive_distance_km,
    drive_time_hours: day.drive_time_hours,
    notes: day.notes,
  }
}

export function CalendarView({
  days,
  onOpenDay,
  mutations,
}: {
  days: TripDay[]
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

  async function handleMove(dayId: string, targetDate: string) {
    const source = days.find((d) => d.id === dayId)
    if (!source || source.date === targetDate) return
    const existing = dayByDate.get(targetDate)
    if (
      existing &&
      !window.confirm(`Dag op ${formatFull(targetDate)} bevat al gegevens. Overschrijven?`)
    ) {
      return
    }
    await mutations.moveDay(dayId, targetDate)
  }

  return (
    <section className="mx-auto w-full max-w-[1200px]" style={{ padding: 'clamp(16px, 4vw, 36px)' }}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[12px] text-muted">
          Rechtermuisklik voor kopiëren/plakken · dubbelklik op een leeg vakje om in te plannen ·
          sleep om te verplaatsen
        </p>
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
          const dt = day ? DAY_TYPES[day.day_type] : null
          const isSelected = selectedDate === iso
          const isDragOver = dragOverDate === iso

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
              aria-label={`${formatFull(iso)}${day ? ` — ${day.location_name}` : ' — leeg'}`}
              className="block overflow-hidden p-2 text-left align-top"
              style={{
                height: CELL_HEIGHT,
                background: dt ? dt.bg : 'var(--color-card)',
                color: dt ? dt.fg : 'var(--color-ink)',
                border: dt
                  ? `1px solid color-mix(in srgb, ${dt.fg} 30%, transparent)`
                  : '1px solid var(--color-edge)',
                outline: isDragOver
                  ? '2px dashed var(--color-diesel)'
                  : isSelected
                    ? '2px solid var(--color-gold)'
                    : undefined,
                outlineOffset: -2,
                cursor: 'pointer',
              }}
              draggable={!!day}
              onClick={() => {
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
              {day && (
                <span className="block">
                  <span className="block truncate text-[12.5px] font-bold leading-snug">
                    {day.location_name}
                  </span>
                  <span className="block font-mono text-[10px] uppercase tracking-[0.06em]">
                    {DAY_TYPES[day.day_type].label}
                  </span>
                  {day.overnight_location && (
                    <span className="block truncate text-[11px] leading-snug opacity-85">
                      {day.overnight_location}
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

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
        {Object.values(DAY_TYPES).map((dt) => (
          <p key={dt.label} className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-muted">
            <span
              className="inline-block h-[13px] w-[13px]"
              style={{ background: dt.bg, border: `1px solid ${dt.fg}` }}
            />
            {dt.label}
          </p>
        ))}
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
          onConfirm={async (location, dayType) => {
            await mutations.createDay({
              date: quickAddDate,
              location_name: location,
              day_type: dayType,
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
              if (
                !window.confirm(
                  `Dag op ${formatFull(pasteDate)} bevat al gegevens. Overschrijven?`,
                )
              ) {
                return
              }
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
    </section>
  )
}
