import { useEffect, useMemo, useState } from 'react'
import { useIdentity } from './features/identity/useIdentity'
import { WhoAmIScreen } from './features/identity/WhoAmIScreen'
import { Header, type View } from './components/Header'
import { CalendarView } from './features/calendar/CalendarView'
import { TimelineView } from './features/timeline/TimelineView'
import { MapView } from './features/map/MapView'
import { BudgetView } from './features/budget/BudgetView'
import { DayDetailPanel } from './features/dayDetail/DayDetailPanel'
import { ShiftDaysModal } from './features/shift/ShiftDaysModal'
import { useTripData } from './hooks/useTripData'
import { addDaysISO, toLocalISO } from './lib/dates'
import { buildCityColorMap } from './lib/cityColors'

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-cream p-6">
      <p className="text-center font-mono text-[13px] text-muted">{children}</p>
    </div>
  )
}

export default function App() {
  const profileId = useIdentity()
  const { data, loading, error, mutations } = useTripData()
  // Tijdlijn is de primaire weergave op mobiel; kalender op desktop.
  const [view, setView] = useState<View>(() =>
    window.matchMedia('(max-width: 767px)').matches ? 'tijdlijn' : 'kalender',
  )
  const [openDayId, setOpenDayId] = useState<string | null>(null)

  // Herbevestig de startweergave zodra de viewport definitief is — sommige
  // omgevingen laden de pagina eerst in een (te) smal venster.
  useEffect(() => {
    setView(window.matchMedia('(max-width: 767px)').matches ? 'tijdlijn' : 'kalender')
  }, [])
  const [shiftOpen, setShiftOpen] = useState(false)

  const cityColorMap = useMemo(
    () => buildCityColorMap(data?.days ?? [], data?.stays ?? []),
    [data],
  )

  if (loading && !data) return <CenteredMessage>Trip laden…</CenteredMessage>
  if (!data) {
    return (
      <CenteredMessage>
        {error ? `Er ging iets mis: ${error}` : 'Geen trip gevonden.'}
        <button
          type="button"
          className="mt-4 block w-full border-[1.5px] border-edge bg-card px-4 py-2 text-inkbody hover:border-diesel"
          onClick={() => window.location.reload()}
        >
          Opnieuw proberen
        </button>
      </CenteredMessage>
    )
  }

  const currentProfile = data.members.find((m) => m.id === profileId) ?? null
  if (!currentProfile) return <WhoAmIScreen members={data.members} />

  const openDay = data.days.find((d) => d.id === openDayId) ?? null

  async function addDay() {
    if (!data) return
    const lastDay = data.days[data.days.length - 1]
    const date = lastDay ? addDaysISO(lastDay.date, 1) : toLocalISO(new Date())
    const newId = await mutations.createDay({
      date,
      location_name: lastDay?.location_name ?? 'Nieuwe stop',
      activities: [],
    })
    if (newId) setOpenDayId(newId)
  }

  return (
    <div className="min-h-dvh bg-cream">
      <Header data={data} currentProfile={currentProfile} view={view} onViewChange={setView} />

      {error && (
        <p
          className="border-b border-canyon bg-[#E8C4B4] py-2 font-mono text-[12.5px] text-canyon-dark"
          style={{ paddingInline: 'clamp(16px, 4vw, 36px)' }}
        >
          {error}
        </p>
      )}

      {view === 'kalender' && (
        <CalendarView
          days={data.days}
          stays={data.stays}
          members={data.members}
          onOpenDay={setOpenDayId}
          mutations={mutations}
          cityColorMap={cityColorMap}
        />
      )}
      {view === 'tijdlijn' && (
        <TimelineView
          days={data.days}
          stays={data.stays}
          members={data.members}
          mutations={mutations}
          cityColorMap={cityColorMap}
          onOpenDay={setOpenDayId}
          onAddDay={() => void addDay()}
          onShift={() => setShiftOpen(true)}
        />
      )}
      {view === 'kaart' && <MapView days={data.days} onOpenDay={setOpenDayId} />}
      {view === 'budget' && (
        <BudgetView stays={data.stays} members={data.members} mutations={mutations} />
      )}

      {openDay && (
        <DayDetailPanel
          day={openDay}
          members={data.members}
          stays={data.stays}
          mutations={mutations}
          onClose={() => setOpenDayId(null)}
        />
      )}

      {shiftOpen && (
        <ShiftDaysModal
          days={data.days}
          onConfirm={mutations.shiftDays}
          onClose={() => setShiftOpen(false)}
        />
      )}
    </div>
  )
}
