import { DAY_TYPES } from '../../lib/dayTypes'
import { formatDayMonth } from '../../lib/dates'
import { bookingBadge, nextBookingPatch } from '../../lib/bookingBadge'
import { getStoredProfileId } from '../../lib/identity'
import type { Profile, TripDay } from '../../lib/types'
import type { TripMutations } from '../../hooks/useTripData'
import { ProgressLine } from './ProgressLine'

/** Lineaire dag-voor-dag lijst — de primaire weergave op mobiel. */
export function TimelineView({
  days,
  members,
  mutations,
  onOpenDay,
  onAddDay,
  onShift,
}: {
  days: TripDay[]
  members: Profile[]
  mutations: TripMutations
  onOpenDay: (id: string) => void
  onAddDay: () => void
  onShift: () => void
}) {
  const memberName = (id: string | null) =>
    members.find((m) => m.id === id)?.display_name ?? 'onbekend'

  function cycleBooking(day: TripDay) {
    void mutations.updateDay(day.id, nextBookingPatch(day, getStoredProfileId()))
  }

  return (
    <section className="mx-auto w-full max-w-[960px]" style={{ padding: 'clamp(16px, 4vw, 36px)' }}>
      <ProgressLine days={days} onOpenDay={onOpenDay} />

      <div className="mb-4 mt-5 flex flex-wrap justify-end gap-3">
        <button type="button" className="btn-outline" onClick={onShift}>
          Dagen verschuiven
        </button>
        <button type="button" className="btn-diesel" onClick={onAddDay}>
          + Dag toevoegen
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {days.map((day) => {
          const dt = DAY_TYPES[day.day_type]
          const badge = bookingBadge(day)
          const { day: dayNr, month } = formatDayMonth(day.date)
          const hasDrive = (day.drive_time_hours ?? 0) > 0 || (day.drive_distance_km ?? 0) > 0
          return (
            <button
              key={day.id}
              type="button"
              onClick={() => onOpenDay(day.id)}
              className="flex flex-wrap gap-x-5 gap-y-2 border-[1.5px] border-edge bg-card px-[18px] py-4 text-left transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:shadow-[0_4px_14px_rgba(42,36,32,0.1)]"
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
                  <span
                    className="px-1.5 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.05em]"
                    style={{ background: dt.bg, color: dt.fg }}
                  >
                    {dt.label}
                  </span>
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
                      cycleBooking(day)
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        e.stopPropagation()
                        cycleBooking(day)
                      }
                    }}
                  >
                    {badge ? badge.glyph : ''}
                  </span>
                </span>
                {day.overnight_location && (
                  <span className="mt-1 block text-[14px] text-inkbody">
                    {day.overnight_location}
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
                {hasDrive && (
                  <span className="block text-[14px] text-diesel">
                    {day.drive_time_hours ?? 0}u · {day.drive_distance_km ?? 0}km
                  </span>
                )}
                <span className="mt-1 block text-[11.5px] leading-relaxed text-muted">
                  Laatst bewerkt door {memberName(day.updated_by)}
                  {day.comments.length > 0 && (
                    <>
                      <br />
                      {day.comments.length} {day.comments.length === 1 ? 'reactie' : 'reacties'}
                    </>
                  )}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
