import { useState } from 'react'

/**
 * Activiteiten als losse tags (bewuste afwijking van de mockup, die één
 * tekstveld toont): enter of komma voegt toe, × of backspace verwijdert.
 * Muteert via onAdd/onRemoveAt/onPop zodat de eigenaar snelle opeenvolgende
 * wijzigingen veilig kan stapelen.
 */
export function ActivityTagInput({
  value,
  onAdd,
  onRemoveAt,
  onPop,
}: {
  value: string[]
  onAdd: (text: string) => void
  onRemoveAt: (index: number) => void
  onPop: () => void
}) {
  const [draft, setDraft] = useState('')

  function add() {
    const text = draft.trim()
    if (!text) return
    setDraft('')
    onAdd(text)
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-[1.5px] border-edge bg-white px-2 py-1.5">
      {value.map((activity, i) => (
        <span
          key={`${activity}-${i}`}
          className="flex items-center gap-1.5 bg-sand py-0.5 pl-2 pr-1 text-[13px] text-ink"
        >
          {activity}
          <button
            type="button"
            aria-label={`Verwijder ${activity}`}
            className="px-0.5 text-[14px] leading-none text-muted hover:text-canyon"
            onClick={() => onRemoveAt(i)}
          >
            ×
          </button>
        </span>
      ))}
      <input
        className="min-w-[120px] flex-1 border-none bg-transparent py-1 text-[14px] outline-none"
        placeholder={value.length === 0 ? 'Activiteit + enter' : ''}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={add}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            add()
          } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
            onPop()
          }
        }}
      />
    </div>
  )
}
