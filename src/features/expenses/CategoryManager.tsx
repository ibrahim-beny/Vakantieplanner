import { useState } from 'react'
import { Modal } from '../../components/Modal'
import type { ExpenseCategory } from '../../lib/types'
import type { TripMutations } from '../../hooks/useTripData'

/** Categorieën zelf beheren (toevoegen/hernoemen/verwijderen) — geen codewijziging nodig. */
export function CategoryManager({
  categories,
  mutations,
  onClose,
}: {
  categories: ExpenseCategory[]
  mutations: TripMutations
  onClose: () => void
}) {
  const [newName, setNewName] = useState('')
  const [renaming, setRenaming] = useState<Record<string, string>>({})

  async function addCategory() {
    const name = newName.trim()
    if (!name) return
    setNewName('')
    await mutations.createCategory(name)
  }

  return (
    <Modal title="Categorieën beheren" onClose={onClose} maxWidth={420}>
      <div className="flex flex-col gap-2">
        {categories.length === 0 && (
          <p className="font-mono text-[13px] text-muted">Nog geen categorieën.</p>
        )}
        {categories.map((c) => (
          <div key={c.id} className="flex items-center gap-2">
            <input
              type="text"
              className="field-input flex-1"
              value={renaming[c.id] ?? c.name}
              onChange={(e) => setRenaming((r) => ({ ...r, [c.id]: e.target.value }))}
              onBlur={() => {
                const value = renaming[c.id]?.trim()
                if (value && value !== c.name) void mutations.renameCategory(c.id, value)
              }}
            />
            <button
              type="button"
              onClick={() => void mutations.deleteCategory(c.id)}
              aria-label={`${c.name} verwijderen`}
              className="flex h-9 w-9 shrink-0 items-center justify-center border-[1.5px] border-edge text-[16px] leading-none text-inkbody hover:border-canyon hover:text-canyon"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-edge pt-4">
        <input
          type="text"
          className="field-input flex-1"
          placeholder="Nieuwe categorie..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void addCategory()
          }}
        />
        <button type="button" className="btn-diesel" onClick={() => void addCategory()}>
          + Toevoegen
        </button>
      </div>
    </Modal>
  )
}
