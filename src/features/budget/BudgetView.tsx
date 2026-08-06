import { useState } from 'react'
import { formatRange } from '../../lib/dates'
import { formatEuro } from '../../lib/format'
import { nightsOf } from '../../lib/stays'
import { bookingBadge, nextBookingPatch } from '../../lib/bookingBadge'
import { getStoredProfileId } from '../../lib/identity'
import type { Profile, TripStay } from '../../lib/types'
import type { TripMutations } from '../../hooks/useTripData'
import { StayForm } from './StayForm'

/** Overzicht van alle verblijven, hun kosten en de onderlinge verrekening. */
export function BudgetView({
  stays,
  members,
  mutations,
}: {
  stays: TripStay[]
  members: Profile[]
  mutations: TripMutations
}) {
  const [editingStay, setEditingStay] = useState<TripStay | null | undefined>(undefined)

  const memberName = (id: string | null) =>
    members.find((m) => m.id === id)?.display_name ?? 'onbekend'

  function cycleBooking(stay: TripStay) {
    void mutations.updateStay(stay.id, nextBookingPatch(stay, getStoredProfileId()))
  }

  const sortedStays = [...stays].sort((a, b) => a.start_date.localeCompare(b.start_date))
  const total = stays.reduce((sum, s) => sum + (s.cost ?? 0), 0)
  const perMember = members.map((m) => ({
    member: m,
    paid: stays.filter((s) => s.booked_by === m.id).reduce((sum, s) => sum + (s.cost ?? 0), 0),
  }))
  const fairShare = members.length > 0 ? total / members.length : 0

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
          {total > 0 && (
            <p className="font-mono text-[13px] uppercase tracking-[0.1em] text-muted">
              Eerlijk aandeel per persoon
              <span className="mt-1 block text-[22px] font-bold normal-case tracking-normal text-ink">
                {formatEuro(fairShare)}
              </span>
            </p>
          )}
        </div>
        {total > 0 && (
          <div className="flex flex-col gap-1.5 border-t border-edge pt-3">
            {perMember.map(({ member, paid }) => {
              const diff = paid - fairShare
              return (
                <p key={member.id} className="font-mono text-[13px] text-inkbody">
                  {member.display_name} betaalde {formatEuro(paid)}
                  {Math.abs(diff) > 0.005 && (
                    <span className={diff > 0 ? 'text-sage-btn' : 'text-canyon'}>
                      {' '}
                      ({diff > 0 ? '+' : ''}
                      {formatEuro(diff)} t.o.v. eerlijk aandeel)
                    </span>
                  )}
                </p>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {sortedStays.length === 0 && (
          <p className="font-mono text-[13px] text-muted">Nog geen verblijven toegevoegd.</p>
        )}
        {sortedStays.map((stay) => {
          const badge = bookingBadge(stay)
          const nights = nightsOf(stay)
          return (
            <button
              key={stay.id}
              type="button"
              onClick={() => setEditingStay(stay)}
              className="flex flex-wrap items-center gap-x-5 gap-y-2 border-[1.5px] border-edge bg-card px-[18px] py-4 text-left transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:shadow-[0_4px_14px_rgba(42,36,32,0.1)]"
            >
              <span className="min-w-[130px]">
                <span className="block font-mono text-[13px] font-bold leading-none text-ink">
                  {formatRange(stay.start_date, stay.end_date)}
                </span>
                <span className="mt-1 block font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
                  {nights} nacht{nights === 1 ? '' : 'en'}
                </span>
              </span>

              <span className="min-w-0 flex-[3] basis-52">
                <span className="flex flex-wrap items-center gap-2.5">
                  <span className="text-[18px] font-bold leading-snug text-ink">
                    {stay.location_name}
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
                </span>
                <span className="mt-1 block text-[13px] text-muted">
                  Betaald door {memberName(stay.booked_by)}
                </span>
              </span>

              <span className="flex-1 basis-36 text-right font-mono">
                <span className="block text-[16px] font-bold text-ink">
                  {stay.cost != null ? formatEuro(stay.cost) : '—'}
                </span>
                {stay.cost != null && (
                  <span className="block text-[11px] text-muted">
                    {formatEuro(stay.cost / nights)} / nacht
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>

      <button type="button" className="btn-diesel mt-4 w-full" onClick={() => setEditingStay(null)}>
        + Verblijf toevoegen
      </button>

      {editingStay !== undefined && (
        <StayForm
          stay={editingStay}
          members={members}
          mutations={mutations}
          onClose={() => setEditingStay(undefined)}
        />
      )}
    </section>
  )
}
