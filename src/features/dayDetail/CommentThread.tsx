import { useState } from 'react'
import type { Profile, TripDay } from '../../lib/types'

/** Simpele, ongeneste reactie-thread onderaan het dag-detailpaneel. */
export function CommentThread({
  day,
  members,
  onAdd,
}: {
  day: TripDay
  members: Profile[]
  onAdd: (body: string) => Promise<void>
}) {
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  const authorName = (id: string) =>
    members.find((m) => m.id === id)?.display_name ?? 'onbekend'

  async function submit() {
    const body = draft.trim()
    if (!body) return
    setBusy(true)
    try {
      await onAdd(body)
      setDraft('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <h3 className="font-display text-[15px] font-bold uppercase tracking-[0.06em] text-ink">
        Reacties
      </h3>
      <div className="mt-3 flex flex-col gap-2">
        {day.comments.length === 0 && (
          <p className="font-mono text-[12px] text-muted">Nog geen reacties.</p>
        )}
        {day.comments.map((comment) => (
          <div key={comment.id} className="bg-[#EFE6CC] px-3 py-2.5">
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#756639]">
              {authorName(comment.author_id)}
            </p>
            <p className="mt-0.5 text-[13.5px] leading-relaxed text-ink">{comment.body}</p>
          </div>
        ))}
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <input
          className="field-input flex-1 text-[14px]"
          placeholder="Schrijf een reactie…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button
          type="submit"
          disabled={busy || !draft.trim()}
          className="shrink-0 bg-sage-btn px-4 font-display text-[14px] font-bold uppercase tracking-[0.06em] text-card hover:bg-sage-btn-dark disabled:opacity-50"
        >
          Plaats
        </button>
      </form>
    </div>
  )
}
