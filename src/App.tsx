import { useEffect, useState } from 'react'
import { api } from './api'
import { useAuth } from './features/auth/AuthProvider'
import { LoginScreen } from './features/auth/LoginScreen'
import { Header, SummaryBar, type View } from './components/Header'
import { CalendarView } from './features/calendar/CalendarView'
import { TimelineView } from './features/timeline/TimelineView'
import { MapView } from './features/map/MapView'
import { DayDetailPanel } from './features/dayDetail/DayDetailPanel'
import { ShiftDaysModal } from './features/shift/ShiftDaysModal'
import { useTripData } from './hooks/useTripData'
import { addDaysISO, toLocalISO } from './lib/dates'

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-cream p-6">
      <p className="text-center font-mono text-[13px] text-muted">{children}</p>
    </div>
  )
}

export default function App() {
  const { profile, loading: authLoading } = useAuth()
  const { data, loading, error, mutations } = useTripData(profile)
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

  if (authLoading) return <CenteredMessage>Laden…</CenteredMessage>
  if (!profile) return <LoginScreen />
  if (loading && !data) return <CenteredMessage>Trip laden…</CenteredMessage>
  if (!data) {
    return (
      <CenteredMessage>
        {error ? `Er ging iets mis: ${error}` : 'Geen trip gevonden voor dit account.'}
        <button
          type="button"
          className="mt-4 block w-full border-[1.5px] border-edge bg-card px-4 py-2 text-inkbody hover:border-diesel"
          onClick={() => void api.signOut()}
        >
          Uitloggen
        </button>
      </CenteredMessage>
    )
  }

  const openDay = data.days.find((d) => d.id === openDayId) ?? null

  async function addDay() {
    if (!data) return
    const lastDay = data.days[data.days.length - 1]
    const date = lastDay ? addDaysISO(lastDay.date, 1) : toLocalISO(new Date())
    const newId = await mutations.createDay({
      date,
      location_name: lastDay?.location_name ?? 'Nieuwe stop',
      day_type: 'chill',
      activities: [],
    })
    if (newId) setOpenDayId(newId)
  }

  return (
    <div className="min-h-dvh bg-cream">
      <Header data={data} currentProfile={profile} view={view} onViewChange={setView} />
      <SummaryBar data={data} />

      {error && (
        <p
          className="border-b border-canyon bg-[#E8C4B4] py-2 font-mono text-[12.5px] text-canyon-dark"
          style={{ paddingInline: 'clamp(16px, 4vw, 36px)' }}
        >
          {error}
        </p>
      )}

      {view === 'kalender' && (
        <CalendarView days={data.days} onOpenDay={setOpenDayId} mutations={mutations} />
      )}
      {view === 'tijdlijn' && (
        <TimelineView
          days={data.days}
          members={data.members}
          onOpenDay={setOpenDayId}
          onAddDay={() => void addDay()}
          onShift={() => setShiftOpen(true)}
        />
      )}
      {view === 'kaart' && <MapView days={data.days} onOpenDay={setOpenDayId} />}

      {openDay && (
        <DayDetailPanel
          day={openDay}
          days={data.days}
          members={data.members}
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
