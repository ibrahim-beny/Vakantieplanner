import { useMemo } from 'react'
import { DAY_TYPES } from '../../lib/dayTypes'
import { formatDayMonth } from '../../lib/dates'
import type { TripDay } from '../../lib/types'

const HEIGHT = 56

/**
 * De signature handgetekende routelijn boven de tijdlijn: een golvende,
 * gestippelde lijn met per dag een klikbare tick in de dagtype-kleur.
 * De ticks staan als HTML-knoppen bovenop de SVG zodat ze rond blijven
 * (de SVG rekt mee met de viewport) en toetsenbord-focusbaar zijn.
 */
export function ProgressLine({
  days,
  onOpenDay,
}: {
  days: TripDay[]
  onOpenDay: (id: string) => void
}) {
  const points = useMemo(
    () =>
      days.map((day, i) => {
        const x = days.length === 1 ? 50 : 3 + (94 * i) / (days.length - 1)
        // alternerende hoogte + kleine deterministische jitter = handgeplot gevoel
        const y = 28 + (i % 2 === 0 ? -9 : 7) + ((i * 7) % 5) - 2
        return { day, x, y }
      }),
    [days],
  )

  const path = useMemo(() => {
    if (points.length < 2) return ''
    const px = (p: { x: number; y: number }) => `${p.x * 10} ${p.y}`
    let d = `M ${px(points[0])}`
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]
      const curr = points[i]
      const midX = ((prev.x + curr.x) / 2) * 10
      const midY = (prev.y + curr.y) / 2
      d += ` Q ${px(prev)}, ${midX} ${midY}`
    }
    d += ` L ${px(points[points.length - 1])}`
    return d
  }, [points])

  if (days.length === 0) return null

  return (
    <div className="relative" style={{ height: HEIGHT }}>
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 1000 ${HEIGHT}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d={path} fill="none" stroke="#2C3B4A" strokeWidth="2" strokeDasharray="5 6" opacity="0.4" />
      </svg>
      {points.map(({ day, x, y }) => {
        const dt = DAY_TYPES[day.day_type]
        const { day: dayNr, month } = formatDayMonth(day.date)
        return (
          <button
            key={day.id}
            type="button"
            title={`${dayNr} ${month} — ${day.location_name}`}
            aria-label={`${dayNr} ${month} — ${day.location_name}`}
            onClick={() => onOpenDay(day.id)}
            className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform hover:scale-125"
            style={{ left: `${x}%`, top: y, background: dt.bg, border: `2px solid ${dt.fg}` }}
          />
        )
      })}
    </div>
  )
}
