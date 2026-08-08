import { Modal } from './Modal'

/** Generieke bevestigingsdialoog voor destructieve/onomkeerbare bulk-acties. */
export function ConfirmModal({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="mb-5 whitespace-pre-line text-[14px] text-inkbody">{message}</p>
      <div className="flex justify-end gap-3">
        <button type="button" className="btn-outline" onClick={onCancel}>
          Annuleren
        </button>
        <button type="button" className="btn-danger-outline" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
