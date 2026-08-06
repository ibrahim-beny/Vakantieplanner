import { api } from '../api'
import { formatRange } from '../lib/dates'
import type { Profile, TripData } from '../lib/types'

export type View = 'kalender' | 'tijdlijn' | 'kaart'

const NAV: { key: View; label: string }[] = [
  { key: 'kalender', label: 'Kalender' },
  { key: 'tijdlijn', label: 'Tijdlijn' },
  { key: 'kaart', label: 'Kaart' },
]

export function Header({
  data,
  currentProfile,
  view,
  onViewChange,
}: {
  data: TripData
  currentProfile: Profile
  view: View
  onViewChange: (v: View) => void
}) {
  const { trip, days, members } = data
  const rangeLabel =
    days.length > 0
      ? `${days.length} dagen · ${formatRange(days[0].date, days[days.length - 1].date)}`
      : formatRange(trip.start_date, trip.end_date)

  return (
    <header
      className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-edge bg-cream py-3.5"
      style={{ paddingInline: 'clamp(16px, 4vw, 36px)' }}
    >
      <div className="min-w-0">
        <h1 className="font-display text-[26px] font-extrabold leading-tight text-ink">
          {trip.name}
        </h1>
        <p className="font-mono text-[12px] text-muted">{rangeLabel}</p>
      </div>

      <nav className="mx-auto flex gap-5" aria-label="Weergave">
        {NAV.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => onViewChange(key)}
            aria-current={view === key ? 'page' : undefined}
            className={`border-b-[3px] pb-1 font-display text-[15px] font-bold uppercase tracking-[0.06em] ${
              view === key
                ? 'border-canyon text-canyon'
                : 'border-transparent text-inkbody hover:text-canyon'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="flex items-center gap-2.5">
        {members.map((member) => {
          const isCurrent = member.id === currentProfile.id
          return (
            <button
              key={member.id}
              type="button"
              title={isCurrent ? `${member.display_name} (jij) — klik om uit te loggen` : member.display_name}
              aria-label={
                isCurrent ? `${member.display_name} (jij) — uitloggen` : member.display_name
              }
              onClick={() => {
                if (isCurrent && window.confirm('Uitloggen?')) void api.signOut()
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full font-display text-[15px] font-bold text-card"
              style={{
                background: member.color,
                cursor: isCurrent ? 'pointer' : 'default',
                boxShadow: isCurrent
                  ? '0 0 0 2px var(--color-cream), 0 0 0 4.5px var(--color-gold)'
                  : 'none',
              }}
            >
              {member.display_name.charAt(0).toUpperCase()}
            </button>
          )
        })}
      </div>
    </header>
  )
}

export function SummaryBar({ data }: { data: TripData }) {
  const totalKm = data.days.reduce((sum, d) => sum + (d.drive_distance_km ?? 0), 0)
  const totalHours = data.days.reduce((sum, d) => sum + (d.drive_time_hours ?? 0), 0)
  const hoursLabel = Number.isInteger(totalHours) ? String(totalHours) : totalHours.toFixed(1)

  return (
    <div
      className="flex flex-wrap gap-x-10 gap-y-1 bg-sand py-3.5"
      style={{ paddingInline: 'clamp(16px, 4vw, 36px)' }}
    >
      <p className="font-mono text-[13px] uppercase tracking-[0.1em] text-muted">
        Totale afstand{' '}
        <span className="ml-1.5 font-medium normal-case tracking-normal text-ink">{totalKm}km</span>
      </p>
      <p className="font-mono text-[13px] uppercase tracking-[0.1em] text-muted">
        Totale rijtijd{' '}
        <span className="ml-1.5 font-medium normal-case tracking-normal text-ink">
          {hoursLabel}u
        </span>
      </p>
    </div>
  )
}
