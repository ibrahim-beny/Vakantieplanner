/** Zwevende actiebalk die verschijnt zodra een sleep-selectie 2 of meer dagen omvat. */
export function SelectionActionBar({
  count,
  canDetachStay,
  onAddStay,
  onDeleteDays,
  onDetachStay,
  onCancel,
}: {
  count: number
  canDetachStay: boolean
  onAddStay: () => void
  onDeleteDays: () => void
  onDetachStay: () => void
  onCancel: () => void
}) {
  return (
    <div
      role="toolbar"
      aria-label="Acties voor geselecteerde dagen"
      className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 flex-wrap items-center gap-2 border-[1.5px] border-edge bg-card px-4 py-3 shadow-[0_4px_14px_rgba(42,36,32,0.18)]"
    >
      <span className="mr-1 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
        {count} {count === 1 ? 'dag' : 'dagen'} geselecteerd
      </span>
      <button type="button" className="btn-diesel" onClick={onAddStay}>
        Verblijf toevoegen
      </button>
      <button type="button" className="btn-outline" onClick={onDeleteDays}>
        Dagen verwijderen
      </button>
      <button
        type="button"
        className="btn-outline"
        disabled={!canDetachStay}
        onClick={onDetachStay}
      >
        Verblijf loskoppelen
      </button>
      <button
        type="button"
        aria-label="Selectie annuleren"
        className="ml-1 flex h-8 w-8 items-center justify-center border-[1.5px] border-edge text-[18px] leading-none text-inkbody hover:border-canyon hover:text-canyon"
        onClick={onCancel}
      >
        ×
      </button>
    </div>
  )
}
