import { useState } from 'react'
import { Modal } from '../../components/Modal'
import { addDaysISO, formatFull } from '../../lib/dates'
import type { TripDay } from '../../lib/types'

/**
 * Verschuift (een reeks) dagen: alle dagen vanaf een gekozen datum gaan
 * N dagen vooruit of terug — voor als de trip opschuift of langer wordt.
 */
export function ShiftDaysModal({
  days,
  onConfirm,
  onClose,
}: {
  days: TripDay[]
  onConfirm: (fromDate: string, deltaDays: number) => Promise<void>
  onClose: () => void
}) {
  const [fromDate, setFromDate] = useState(days[0]?.date ?? '')
  const [delta, setDelta] = useState(1)
  const [busy, setBusy] = useState(false)

  const affected = days.filter((d) => d.date >= fromDate)
  const valid = delta !== 0 && affected.length > 0

  return (
    <Modal title="Dagen verschuiven" onClose={onClose}>
      <label htmlFor="shift-from" className="field-label">
        Alle dagen vanaf
      </label>
      <select
        id="shift-from"
        className="field-input font-mono text-[14px]"
        value={fromDate}
        onChange={(e) => setFromDate(e.target.value)}
      >
        {days.map((d) => (
          <option key={d.id} value={d.date}>
            {formatFull(d.date)} — {d.location_name}
          </option>
        ))}
      </select>

      <label htmlFor="shift-delta" className="field-label mt-4">
        Verschuif met (dagen, negatief = eerder)
      </label>
      <input
        id="shift-delta"
        type="number"
        className="field-input font-mono text-[14px]"
        value={delta}
        onChange={(e) => setDelta(Number(e.target.value))}
      />

      {valid && (
        <p className="mt-4 border border-edge bg-sand px-3 py-2 font-mono text-[12px] leading-relaxed text-ink">
          {affected.length} {affected.length === 1 ? 'dag schuift' : 'dagen schuiven'}{' '}
          {delta > 0 ? `${delta} vooruit` : `${Math.abs(delta)} terug`}:{' '}
          {formatFull(fromDate)} wordt {formatFull(addDaysISO(fromDate, delta))}.
        </p>
      )}

      <button
        type="button"
        disabled={!valid || busy}
        className="btn-primary mt-5 w-full text-[15px] disabled:cursor-not-allowed disabled:opacity-50"
        onClick={async () => {
          setBusy(true)
          try {
            await onConfirm(fromDate, delta)
            onClose()
          } finally {
            setBusy(false)
          }
        }}
      >
        {busy ? 'Verschuiven…' : 'Verschuiven'}
      </button>
    </Modal>
  )
}
