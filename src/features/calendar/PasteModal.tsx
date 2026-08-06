import { useState } from 'react'
import { Modal } from '../../components/Modal'
import { formatFull } from '../../lib/dates'
import type { ClipboardDay, DayPatch, TripDay } from '../../lib/types'

type PasteField = 'locatie' | 'activiteiten' | 'rijinfo' | 'notitie'

const FIELDS: { key: PasteField; label: string; preview: (c: ClipboardDay) => string }[] = [
  { key: 'locatie', label: 'Locatie', preview: (c) => c.location_name },
  { key: 'activiteiten', label: 'Activiteiten', preview: (c) => c.activities.join(', ') || '—' },
  {
    key: 'rijinfo',
    label: 'Rijinfo',
    preview: (c) =>
      c.drive_time_hours || c.drive_distance_km
        ? `${c.drive_time_hours ?? 0}u · ${c.drive_distance_km ?? 0}km`
        : '—',
  },
  { key: 'notitie', label: 'Notitie', preview: (c) => c.notes ?? '—' },
]

/** Plakken met per-veld selectie (via ⌘V of rechtsklik "Plak hier"). */
export function PasteModal({
  clipboard,
  targetDate,
  targetDay,
  onConfirm,
  onClose,
}: {
  clipboard: ClipboardDay
  targetDate: string
  targetDay: TripDay | null
  onConfirm: (patch: DayPatch) => Promise<void>
  onClose: () => void
}) {
  // Alles standaard aangevinkt. Bij een lege doelcel is Locatie verplicht
  // (een dag zonder locatie kan niet bestaan).
  const [checked, setChecked] = useState<Record<PasteField, boolean>>({
    locatie: true,
    activiteiten: true,
    rijinfo: true,
    notitie: true,
  })
  const [busy, setBusy] = useState(false)

  function buildPatch(): DayPatch {
    const patch: DayPatch = {}
    if (checked.locatie) {
      patch.location_name = clipboard.location_name
      patch.lat = clipboard.lat
      patch.lng = clipboard.lng
    }
    if (checked.activiteiten) patch.activities = [...clipboard.activities]
    if (checked.rijinfo) {
      patch.drive_distance_km = clipboard.drive_distance_km
      patch.drive_time_hours = clipboard.drive_time_hours
    }
    if (checked.notitie) patch.notes = clipboard.notes
    return patch
  }

  return (
    <Modal title="Plak dag" onClose={onClose}>
      <p className="mb-4 font-mono text-[12px] text-muted">
        Naar {formatFull(targetDate)}
        {targetDay ? ` — overschrijft "${targetDay.location_name}"` : ''}
      </p>
      <div className="flex flex-col gap-2.5">
        {FIELDS.map(({ key, label, preview }) => {
          const locationRequired = key === 'locatie' && !targetDay
          return (
            <label key={key} className="flex cursor-pointer items-baseline gap-2.5">
              <input
                type="checkbox"
                className="translate-y-px accent-(--color-canyon)"
                checked={checked[key]}
                disabled={locationRequired}
                onChange={(e) => setChecked((c) => ({ ...c, [key]: e.target.checked }))}
              />
              <span className="w-[110px] shrink-0 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
                {label}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13.5px] text-inkbody">
                {preview(clipboard)}
              </span>
            </label>
          )
        })}
      </div>
      <button
        type="button"
        disabled={busy || Object.values(checked).every((v) => !v)}
        className="btn-primary mt-5 w-full text-[15px]"
        onClick={async () => {
          setBusy(true)
          try {
            await onConfirm(buildPatch())
          } finally {
            setBusy(false)
          }
        }}
      >
        {busy ? 'Plakken…' : 'Plakken'}
      </button>
    </Modal>
  )
}
