import { useEffect, type ReactNode } from 'react'

/** Gecentreerde modal met scrim, in de vormtaal van het ontwerp (vierkant, flat). */
export function Modal({
  title,
  onClose,
  children,
  maxWidth = 380,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  maxWidth?: number
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden' // body niet mee laten scrollen achter de modal
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      className="animate-scrim fixed inset-0 z-50 flex items-center justify-center bg-[rgba(42,36,32,0.35)] p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-panel w-full border-[1.5px] border-edge bg-card p-6"
        style={{ maxWidth }}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="font-display text-[19px] font-extrabold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className="flex h-8 w-8 shrink-0 items-center justify-center border-[1.5px] border-edge text-[18px] leading-none text-inkbody hover:border-canyon hover:text-canyon"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
