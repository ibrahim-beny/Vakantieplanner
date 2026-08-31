import { clearStoredProfileId } from '../lib/identity'
import { formatRange } from '../lib/dates'
import type { Profile, TripData } from '../lib/types'

export type View = 'kalender' | 'tijdlijn' | 'kaart' | 'kosten'

const NAV: { key: View; label: string }[] = [
  { key: 'kalender', label: 'Kalender' },
  { key: 'tijdlijn', label: 'Tijdlijn' },
  { key: 'kaart', label: 'Kaart' },
  { key: 'kosten', label: 'Kosten' },
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
              title={isCurrent ? `${member.display_name} (jij) — klik om te wisselen` : member.display_name}
              aria-label={
                isCurrent ? `${member.display_name} (jij) — wisselen` : member.display_name
              }
              onClick={() => {
                if (isCurrent) clearStoredProfileId()
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
