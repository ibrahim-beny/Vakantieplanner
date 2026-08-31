import { useMemo, useState } from 'react'
import { formatEuro } from '../../lib/format'
import { formatFull } from '../../lib/dates'
import { computeBalances, computeDirectSettlements, computeSettlementItems } from '../../lib/settlement'
import { nextShareReminder, reminderBadge } from '../../lib/shareReminder'
import type {
  Expense,
  ExpenseCategory,
  Profile,
  SettlementPayment,
  SettlementPaymentItem,
  TripStay,
} from '../../lib/types'
import type { TripMutations } from '../../hooks/useTripData'
import { ExpenseForm } from './ExpenseForm'
import { CategoryManager } from './CategoryManager'

/** Overzicht van alle kostenposten, het saldo per persoon en de voorgestelde afrekeningen. */
export function ExpensesView({
  expenses,
  categories,
  stays,
  members,
  settlementPayments,
  settlementPaymentItems,
  mutations,
}: {
  expenses: Expense[]
  categories: ExpenseCategory[]
  stays: TripStay[]
  members: Profile[]
  settlementPayments: SettlementPayment[]
  settlementPaymentItems: SettlementPaymentItem[]
  mutations: TripMutations
}) {
  const [editingExpense, setEditingExpense] = useState<Expense | null | undefined>(undefined)
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null)

  const memberName = (id: string) => members.find((m) => m.id === id)?.display_name ?? 'onbekend'
  const categoryName = (id: string | null) =>
    id ? (categories.find((c) => c.id === id)?.name ?? 'Geen categorie') : 'Geen categorie'

  const total = expenses.reduce((sum, e) => sum + e.amount, 0)

  const balances = useMemo(
    () => computeBalances(expenses, settlementPayments, members.map((m) => m.id)),
    [expenses, settlementPayments, members],
  )
  const transactions = useMemo(
    () => computeDirectSettlements(expenses, settlementPayments, members.map((m) => m.id)),
    [expenses, settlementPayments, members],
  )

  const filteredExpenses = useMemo(() => {
    const list =
      categoryFilter === 'all' ? expenses : expenses.filter((e) => e.category_id === categoryFilter)
    return [...list].sort((a, b) => b.expense_date.localeCompare(a.expense_date))
  }, [expenses, categoryFilter])

  async function markAsPaid(from: string, to: string, amount: number) {
    const items = computeSettlementItems(expenses, categories, from, to)
    await mutations.recordSettlementPayment({
      from_profile: from,
      to_profile: to,
      amount,
      paid_at: new Date().toISOString().slice(0, 10),
      items,
    })
  }

  return (
    <section className="mx-auto w-full max-w-[960px]" style={{ padding: 'clamp(16px, 4vw, 36px)' }}>
      <div className="mb-4 flex justify-end">
        <button type="button" className="btn-diesel" onClick={() => setEditingExpense(null)}>
          + Kosten toevoegen
        </button>
      </div>

      <div className="mb-5 flex flex-col gap-4 border-[1.5px] border-edge bg-card p-5">
        <div className="flex flex-wrap gap-x-10 gap-y-3">
          <p className="font-mono text-[13px] uppercase tracking-[0.1em] text-muted">
            Totale kosten
            <span className="mt-1 block text-[22px] font-bold normal-case tracking-normal text-ink">
              {formatEuro(total)}
            </span>
          </p>
        </div>

        {total > 0 && (
          <div className="flex flex-col gap-1.5 border-t border-edge pt-3">
            {balances.map((b) => (
              <p key={b.profileId} className="font-mono text-[13px] text-inkbody">
                {memberName(b.profileId)} betaalde {formatEuro(b.paid)}, aandeel {formatEuro(b.owed)}
                {Math.abs(b.net) > 0.005 && (
                  <span className={b.net > 0 ? 'text-sage-btn' : 'text-canyon'}>
                    {' '}
                    ({b.net > 0 ? '+' : ''}
                    {formatEuro(b.net)})
                  </span>
                )}
              </p>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2 border-t border-edge pt-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">Afrekenen</p>
          {transactions.length === 0 ? (
            <p className="font-mono text-[13px] text-inkbody">Alles is verrekend.</p>
          ) : (
            transactions.map((t, i) => (
              <div key={i} className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-[13px] text-inkbody">
                  {memberName(t.from)} betaalt {memberName(t.to)}{' '}
                  <span className="font-bold text-ink">{formatEuro(t.amount)}</span>
                </p>
                <button
                  type="button"
                  className="btn-outline shrink-0"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                  onClick={() => void markAsPaid(t.from, t.to, t.amount)}
                >
                  Markeer als betaald
                </button>
              </div>
            ))
          )}
        </div>

        {settlementPayments.length > 0 && (
          <div className="border-t border-edge pt-3">
            <button
              type="button"
              className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted hover:text-diesel"
              onClick={() => setHistoryOpen((v) => !v)}
            >
              {historyOpen ? '▾' : '▸'} Eerder afgerekend ({settlementPayments.length})
            </button>
            {historyOpen && (
              <div className="mt-2 flex flex-col gap-2">
                {[...settlementPayments]
                  .sort((a, b) => b.paid_at.localeCompare(a.paid_at))
                  .map((p) => {
                    const items = settlementPaymentItems
                      .filter((it) => it.payment_id === p.id)
                      .sort((a, b) => a.expense_date.localeCompare(b.expense_date))
                    const isExpanded = expandedPaymentId === p.id
                    return (
                      <div key={p.id} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            className={`flex-1 text-left font-mono text-[12px] text-muted ${
                              items.length > 0 ? 'hover:text-diesel' : 'cursor-default'
                            }`}
                            onClick={() =>
                              items.length > 0 && setExpandedPaymentId(isExpanded ? null : p.id)
                            }
                          >
                            {items.length > 0 ? (isExpanded ? '▾ ' : '▸ ') : ''}
                            {formatFull(p.paid_at)} · {memberName(p.from_profile)} →{' '}
                            {memberName(p.to_profile)} {formatEuro(p.amount)}
                          </button>
                          <button
                            type="button"
                            className="font-mono text-[11px] text-muted hover:text-canyon"
                            onClick={() => void mutations.deleteSettlementPayment(p.id)}
                          >
                            Ongedaan maken
                          </button>
                        </div>
                        {isExpanded && items.length > 0 && (
                          <div className="ml-4 flex flex-col gap-0.5 border-l-[1.5px] border-edge pl-3">
                            {items.map((it) => (
                              <p key={it.id} className="font-mono text-[11px] text-muted">
                                {formatFull(it.expense_date)} · {it.title}
                                {it.category_name ? ` · ${it.category_name}` : ''} ·{' '}
                                {formatEuro(it.amount)}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setCategoryFilter('all')}
          className={`border-[1.5px] px-3 py-1.5 font-mono text-[12px] uppercase tracking-[0.06em] ${
            categoryFilter === 'all'
              ? 'border-canyon bg-canyon text-card'
              : 'border-edge text-inkbody hover:border-diesel'
          }`}
        >
          Alles
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategoryFilter(c.id)}
            className={`border-[1.5px] px-3 py-1.5 font-mono text-[12px] uppercase tracking-[0.06em] ${
              categoryFilter === c.id
                ? 'border-canyon bg-canyon text-card'
                : 'border-edge text-inkbody hover:border-diesel'
            }`}
          >
            {c.name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCategoryManagerOpen(true)}
          className="ml-auto border-[1.5px] border-edge px-3 py-1.5 font-mono text-[12px] uppercase tracking-[0.06em] text-inkbody hover:border-diesel"
        >
          Categorieën beheren
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {filteredExpenses.length === 0 && (
          <p className="font-mono text-[13px] text-muted">Nog geen kosten toegevoegd.</p>
        )}
        {filteredExpenses.map((expense) => (
          <button
            key={expense.id}
            type="button"
            onClick={() => setEditingExpense(expense)}
            className="flex flex-wrap items-center gap-x-5 gap-y-2 border-[1.5px] border-edge bg-card px-[18px] py-4 text-left transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:shadow-[0_4px_14px_rgba(42,36,32,0.1)]"
          >
            <span className="min-w-[90px]">
              <span className="block font-mono text-[13px] font-bold leading-none text-ink">
                {formatFull(expense.expense_date).split(' ').slice(0, 2).join(' ')}
              </span>
              <span className="mt-1 block font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
                {categoryName(expense.category_id)}
              </span>
            </span>

            <span className="min-w-0 flex-[3] basis-52">
              <span className="text-[18px] font-bold leading-snug text-ink">{expense.title}</span>
              <span className="mt-1 block text-[13px] text-muted">
                Betaald door {memberName(expense.paid_by)} · {expense.shares.length}{' '}
                {expense.shares.length === 1 ? 'deelnemer' : 'deelnemers'}
              </span>
              {expense.shares.filter((s) => s.profile_id !== expense.paid_by).length > 0 && (
                <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {expense.shares
                    .filter((s) => s.profile_id !== expense.paid_by)
                    .map((s) => {
                      const badge = reminderBadge(s)
                      const name = memberName(s.profile_id)
                      return (
                        <span
                          key={s.profile_id}
                          role="button"
                          tabIndex={0}
                          title={
                            badge
                              ? `${name} heeft zijn aandeel terugbetaald aan ${memberName(expense.paid_by)} — klik om ongedaan te maken`
                              : `${name} heeft zijn aandeel nog niet terugbetaald aan ${memberName(expense.paid_by)} — klik om te markeren`
                          }
                          aria-label={
                            badge
                              ? `${name}: al terugbetaald, klik om te wijzigen`
                              : `${name}: nog niet terugbetaald, klik om te markeren`
                          }
                          className="flex h-[20px] min-w-[20px] items-center justify-center px-1 font-mono text-[10px] font-bold leading-none"
                          style={{
                            background: badge ? badge.bg : 'transparent',
                            color: badge ? badge.fg : 'var(--color-muted)',
                            border: badge
                              ? '1.5px solid var(--color-sage-btn)'
                              : '1.5px solid var(--color-edge)',
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            void mutations.toggleShareReminder(expense.id, s.profile_id, nextShareReminder(s))
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              e.stopPropagation()
                              void mutations.toggleShareReminder(expense.id, s.profile_id, nextShareReminder(s))
                            }
                          }}
                        >
                          {name.charAt(0).toUpperCase()}
                        </span>
                      )
                    })}
                </span>
              )}
            </span>

            <span className="flex-1 basis-36 text-right font-mono">
              <span className="block text-[16px] font-bold text-ink">{formatEuro(expense.amount)}</span>
            </span>
          </button>
        ))}
      </div>

      <button
        type="button"
        className="btn-diesel mt-4 w-full"
        onClick={() => setEditingExpense(null)}
      >
        + Kosten toevoegen
      </button>

      {editingExpense !== undefined && (
        <ExpenseForm
          expense={editingExpense}
          members={members}
          categories={categories}
          stays={stays}
          mutations={mutations}
          onClose={() => setEditingExpense(undefined)}
        />
      )}

      {categoryManagerOpen && (
        <CategoryManager
          categories={categories}
          mutations={mutations}
          onClose={() => setCategoryManagerOpen(false)}
        />
      )}
    </section>
  )
}
