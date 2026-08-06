import { useState, type FormEvent } from 'react'
import { Modal } from '../../components/Modal'
import { DAY_TYPES, DAY_TYPE_KEYS } from '../../lib/dayTypes'
import { formatFull } from '../../lib/dates'
import type { DayType } from '../../lib/types'

/** Dubbelklik op een lege kalendercel: snel inplannen met alleen locatie + dagtype. */
export function QuickAddModal({
  date,
  onConfirm,
  onClose,
}: {
  date: string
  onConfirm: (location: string, dayType: DayType) => Promise<void>
  onClose: () => void
}) {
  const [location, setLocation] = useState('')
  const [dayType, setDayType] = useState<DayType>('chill')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!location.trim()) return
    setBusy(true)
    try {
      await onConfirm(location.trim(), dayType)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Dag inplannen" onClose={onClose}>
      <p className="mb-4 font-mono text-[12px] text-muted">{formatFull(date)}</p>
      <form onSubmit={submit}>
        <label htmlFor="quickadd-location" className="field-label">
          Locatie
        </label>
        <input
          id="quickadd-location"
          autoFocus
          required
          className="field-input"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <label htmlFor="quickadd-daytype" className="field-label mt-4">
          Dagtype
        </label>
        <select
          id="quickadd-daytype"
          className="field-input"
          value={dayType}
          onChange={(e) => setDayType(e.target.value as DayType)}
        >
          {DAY_TYPE_KEYS.map((key) => (
            <option key={key} value={key}>
              {DAY_TYPES[key].label}
            </option>
          ))}
        </select>
        <button type="submit" disabled={busy} className="btn-primary mt-5 w-full text-[15px]">
          {busy ? 'Inplannen…' : 'Inplannen'}
        </button>
      </form>
    </Modal>
  )
}
