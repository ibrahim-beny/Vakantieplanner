import { useMemo, useState } from 'react'
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { formatDayMonth } from '../../lib/dates'
import type { TripDay } from '../../lib/types'

interface Stop {
  location_name: string
  lat: number
  lng: number
  days: TripDay[]
}

/** Opeenvolgende dagen op dezelfde locatie collapsen tot één pin. */
function buildStops(days: TripDay[]): Stop[] {
  const stops: Stop[] = []
  for (const day of days) {
    if (day.lat == null || day.lng == null) continue
    const last = stops[stops.length - 1]
    if (last && last.location_name === day.location_name) {
      last.days.push(day)
    } else {
      stops.push({ location_name: day.location_name, lat: day.lat, lng: day.lng, days: [day] })
    }
  }
  return stops
}

function pinIcon(name: string, active: boolean) {
  return L.divIcon({
    className: '',
    html: `<div class="map-pin${active ? ' map-pin--active' : ''}"><span class="map-pin-dot"></span><span class="map-pin-label">${name.replace(/</g, '&lt;')}</span></div>`,
    iconSize: [150, 46],
    iconAnchor: [75, 9],
  })
}

function MapSetup({ bounds }: { bounds: L.LatLngBounds }) {
  const map = useMap()
  map.attributionControl.setPrefix(false)
  useMemo(() => map.fitBounds(bounds, { padding: [40, 40] }), [map, bounds])
  return null
}

/**
 * Echte geografische kaart (bewuste afwijking van de posterkaart-mockup),
 * maar in dezelfde ontwerptaal: gestippelde diesel-routelijn, canyon-pins
 * met crème/diesel-ring, sobere Leaflet-UI.
 */
export function MapView({
  days,
  onOpenDay,
}: {
  days: TripDay[]
  onOpenDay: (id: string) => void
}) {
  const stops = useMemo(() => buildStops(days), [days])
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)

  const bounds = useMemo(() => {
    const b = L.latLngBounds(stops.map((s) => [s.lat, s.lng] as [number, number]))
    return b.isValid() ? b : L.latLngBounds([[36, -119]])
  }, [stops])

  function selectStop(stop: Stop) {
    setSelectedLocation(stop.location_name)
    onOpenDay(stop.days[0].id)
  }

  return (
    <section
      className="mx-auto flex w-full max-w-[1200px] flex-wrap gap-5"
      style={{ padding: 'clamp(16px, 4vw, 36px)' }}
    >
      <div className="min-w-[300px] flex-[2] border-[1.5px] border-edge" style={{ minHeight: 'min(78vh, 640px)' }}>
        {stops.length > 0 ? (
          <MapContainer
            className="h-full w-full"
            bounds={bounds}
            zoomControl={false}
            scrollWheelZoom
          >
            <MapSetup bounds={bounds} />
            <TileLayer
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <Polyline
              positions={stops.map((s) => [s.lat, s.lng] as [number, number])}
              pathOptions={{ color: '#2C3B4A', weight: 2, dashArray: '6 7', opacity: 0.55 }}
            />
            {stops.map((stop) => (
              <Marker
                key={`${stop.location_name}-${stop.days[0].id}`}
                position={[stop.lat, stop.lng]}
                icon={pinIcon(stop.location_name, selectedLocation === stop.location_name)}
                eventHandlers={{ click: () => selectStop(stop) }}
              />
            ))}
          </MapContainer>
        ) : (
          <p className="p-6 font-mono text-[13px] text-muted">
            Nog geen dagen met coördinaten — vul lat/lng in via het dag-detailpaneel.
          </p>
        )}
      </div>

      <div className="max-h-[min(78vh,640px)] min-w-[240px] flex-1 overflow-y-auto">
        <div className="flex flex-col gap-2">
          {days.map((day) => {
            const { day: dayNr, month } = formatDayMonth(day.date)
            const isSelected = selectedLocation === day.location_name
            return (
              <button
                key={day.id}
                type="button"
                onClick={() => {
                  setSelectedLocation(day.location_name)
                  onOpenDay(day.id)
                }}
                className="border-[1.5px] px-3.5 py-2.5 text-left"
                style={{
                  background: isSelected ? '#EFE6CC' : 'var(--color-card)',
                  borderColor: isSelected ? 'var(--color-gold)' : 'var(--color-edge)',
                }}
              >
                <span className="block font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
                  {dayNr} {month}
                </span>
                <span className="block text-[14.5px] font-bold text-ink">{day.location_name}</span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
