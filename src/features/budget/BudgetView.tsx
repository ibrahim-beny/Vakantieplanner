import { formatDayMonth } from '../../lib/dates'
import { bookingBadge, nextBookingPatch } from '../../lib/bookingBadge'
import { getStoredProfileId } from '../../lib/identity'
import type { Profile, TripDay } from '../../lib/types'
import type { TripMutations } from '../../hooks/useTripData'

const formatEuro = (n: number) =>
  `€${n.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** Overzicht van alle overnachtingskosten en de onderlinge verrekening. */
export function BudgetView({
  days,
  members,
  mutations,
  onOpenDay,
}: {
  days: TripDay[]
  members: Profile[]
  mutations: TripMutations
  onOpenDay: (id: string) => void
}) {
  const memberName = (id: string | null) =>
    members.find((m) => m.id === id)?.display_name ?? 'onbekend'

  function cycleBooking(day: TripDay) {
    void mutations.updateDay(day.id, nextBookingPatch(day, getStoredProfileId()))
  }

  const rows = days.filter((d) => d.overnight_location || d.accommodation_cost != null)
  const total = rows.reduce((sum, d) => sum + (d.accommodation_cost ?? 0), 0)
  const perMember = members.map((m) => ({
    member: m,
    paid: rows
      .filter((d) => d.accommodation_booked_by === m.id)
      .reduce((sum, d) => sum + (d.accommodation_cost ?? 0), 0),
  }))
  const fairShare = members.length > 0 ? total / members.length : 0

  let settlementLabel: string | null = null
  if (members.length === 2 && total > 0) {
    const [a, b] = perMember
    const diff = a.paid - b.paid
    if (Math.abs(diff) > 0.005) {
      const owed = Math.abs(diff) / 2
      settlementLabel =
        diff > 0
          ? `${a.member.display_name} krijgt nog ${formatEuro(owed)} van ${b.member.display_name}`
          : `${b.member.display_name} krijgt nog ${formatEuro(owed)} van ${a.member.display_name}`
    } else {
      settlementLabel = 'Onderling verrekend — niemand hoeft nog iets te betalen'
    }
  }

  return (
    <section className="mx-auto w-full max-w-[960px]" style={{ padding: 'clamp(16px, 4vw, 36px)' }}>
      <div className="mb-5 flex flex-col gap-4 border-[1.5px] border-edge bg-card p-5">
        <div className="flex flex-wrap gap-x-10 gap-y-3">
          <p className="font-mono text-[13px] uppercase tracking-[0.1em] text-muted">
            Totale kosten verblijf
            <span className="mt-1 block text-[22px] font-bold normal-case tracking-normal text-ink">
              {formatEuro(total)}
            </span>
          </p>
          {perMember.map(({ member, paid }) => (
            <p key={member.id} className="font-mono text-[13px] uppercase tracking-[0.1em] text-muted">
              Voorgeschoten door {member.display_name}
              <span className="mt-1 block text-[22px] font-bold normal-case tracking-normal text-ink">
                {formatEuro(paid)}
              </span>
            </p>
          ))}
          {members.length !== 2 && total > 0 && (
            <p className="font-mono text-[13px] uppercase tracking-[0.1em] text-muted">
              Eerlijk aandeel per persoon
              <span className="mt-1 block text-[22px] font-bold normal-case tracking-normal text-ink">
                {formatEuro(fairShare)}
              </span>
            </p>
          )}
        </div>
        {settlementLabel && (
          <p className="border-t border-edge pt-3 font-mono text-[14px] text-diesel">
            {settlementLabel}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {rows.length === 0 && (
          <p className="font-mono text-[13px] text-muted">Nog geen overnachtingen met kosten of locatie.</p>
        )}
        {rows.map((day) => {
          const badge = bookingBadge(day)
          const { day: dayNr, month } = formatDayMonth(day.date)
          return (
            <button
              key={day.id}
              type="button"
              onClick={() => onOpenDay(day.id)}
              className="flex flex-wrap items-center gap-x-5 gap-y-2 border-[1.5px] border-edge bg-card px-[18px] py-4 text-left transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:shadow-[0_4px_14px_rgba(42,36,32,0.1)]"
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
                    {day.overnight_location || day.location_name}
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
                <span className="mt-1 block text-[13px] text-muted">
                  Betaald door {memberName(day.accommodation_booked_by)}
                </span>
              </span>

              <span className="flex-1 basis-36 text-right font-mono text-[16px] font-bold text-ink">
                {day.accommodation_cost != null ? formatEuro(day.accommodation_cost) : '—'}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
