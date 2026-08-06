import { useState, type FormEvent } from 'react'
import { Modal } from '../../components/Modal'
import { formatFull } from '../../lib/dates'

/** Dubbelklik op een lege kalendercel: snel inplannen met alleen een locatie. */
export function QuickAddModal({
  date,
  onConfirm,
  onClose,
}: {
  date: string
  onConfirm: (location: string) => Promise<void>
  onClose: () => void
}) {
  const [location, setLocation] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!location.trim()) return
    setBusy(true)
    try {
      await onConfirm(location.trim())
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
        <button type="submit" disabled={busy} className="btn-primary mt-5 w-full text-[15px]">
          {busy ? 'Inplannen…' : 'Inplannen'}
        </button>
      </form>
    </Modal>
  )
}
