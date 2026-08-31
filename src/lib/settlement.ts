import type { Expense, ExpenseCategory, ExpenseShare, SettlementPayment } from './types'

const round2 = (n: number): number => Math.round(n * 100) / 100

/**
 * Verdeelt `amount` gelijk over de deelnemers, in centen. Restcenten (bij
 * bijv. €100 / 3) gaan naar de eerste N deelnemers, zodat de shares altijd
 * exact optellen tot het totaalbedrag.
 */
export function computeEqualShares(amount: number, participantIds: string[]): ExpenseShare[] {
  if (participantIds.length === 0) return []
  const cents = Math.round(amount * 100)
  const base = Math.floor(cents / participantIds.length)
  const remainder = cents - base * participantIds.length
  return participantIds.map((profile_id, i) => ({
    profile_id,
    share_amount: (base + (i < remainder ? 1 : 0)) / 100,
  }))
}

export interface Balance {
  profileId: string
  /** Som van expense.amount waar deze persoon de betaler is. */
  paid: number
  /** Som van zijn/haar expense_shares over alle kostenposten. */
  owed: number
  /** (paid - owed), gecorrigeerd voor settlement_payments. + = krijgt geld, - = moet betalen. */
  net: number
}

/**
 * Berekent per deelnemer het saldo op basis van alle kostenposten, en trekt
 * daarna de al geregistreerde afrekeningen (settlement_payments) eraf zodat
 * een afgevinkte afrekening niet blijft terugkomen.
 */
export function computeBalances(
  expenses: Pick<Expense, 'amount' | 'paid_by' | 'shares'>[],
  payments: Pick<SettlementPayment, 'from_profile' | 'to_profile' | 'amount'>[],
  participantIds: string[],
): Balance[] {
  const paid = new Map(participantIds.map((id) => [id, 0]))
  const owed = new Map(participantIds.map((id) => [id, 0]))

  for (const exp of expenses) {
    paid.set(exp.paid_by, (paid.get(exp.paid_by) ?? 0) + exp.amount)
    for (const share of exp.shares) {
      owed.set(share.profile_id, (owed.get(share.profile_id) ?? 0) + share.share_amount)
    }
  }

  const net = new Map(participantIds.map((id) => [id, (paid.get(id) ?? 0) - (owed.get(id) ?? 0)]))
  for (const payment of payments) {
    // from_profile heeft al betaald: minder schuld / meer tegoed.
    net.set(payment.from_profile, (net.get(payment.from_profile) ?? 0) + payment.amount)
    // to_profile heeft dat bedrag al ontvangen: minder tegoed.
    net.set(payment.to_profile, (net.get(payment.to_profile) ?? 0) - payment.amount)
  }

  return participantIds.map((profileId) => ({
    profileId,
    paid: round2(paid.get(profileId) ?? 0),
    owed: round2(owed.get(profileId) ?? 0),
    net: round2(net.get(profileId) ?? 0),
  }))
}

export interface SettlementTransaction {
  from: string
  to: string
  amount: number
}

/**
 * Rekent per paar deelnemers hun eigen gedeelde kostenposten tegen elkaar
 * weg (in plaats van een netto-vereenvoudiging over de hele groep), zodat
 * een voorgestelde afrekening altijd exact herleidbaar is tot de
 * kostenposten tussen precies die twee personen — dat is nodig om bij
 * "Markeer als betaald" de juiste terugbetaal-vinkjes te kunnen afvinken en
 * een kloppende bon te tonen (zie computeSettlementItems).
 */
export function computeDirectSettlements(
  expenses: Pick<Expense, 'amount' | 'paid_by' | 'shares'>[],
  payments: Pick<SettlementPayment, 'from_profile' | 'to_profile' | 'amount'>[],
  participantIds: string[],
  epsilon = 0.01,
): SettlementTransaction[] {
  const transactions: SettlementTransaction[] = []
  for (let i = 0; i < participantIds.length; i++) {
    for (let j = i + 1; j < participantIds.length; j++) {
      const a = participantIds[i]
      const b = participantIds[j]
      // net > 0: a is b iets schuldig; net < 0: b is a iets schuldig.
      let net = 0
      for (const exp of expenses) {
        if (exp.paid_by === b) {
          net += exp.shares.find((s) => s.profile_id === a)?.share_amount ?? 0
        } else if (exp.paid_by === a) {
          net -= exp.shares.find((s) => s.profile_id === b)?.share_amount ?? 0
        }
      }
      for (const p of payments) {
        if (p.from_profile === a && p.to_profile === b) net -= p.amount
        else if (p.from_profile === b && p.to_profile === a) net += p.amount
      }
      net = round2(net)
      if (net > epsilon) transactions.push({ from: a, to: b, amount: net })
      else if (net < -epsilon) transactions.push({ from: b, to: a, amount: -net })
    }
  }
  return transactions
}

export interface SettlementItemDraft {
  expense_id: string
  profile_id: string
  title: string
  category_name: string | null
  amount: number
  expense_date: string
}

/**
 * Bepaalt welke kostenposten meetellen als "van" en "naar" hun onderlinge
 * saldo afrekenen: alle nog niet afgevinkte aandelen op elkaars
 * kostenposten, in beide richtingen — maar alleen kostenposten die zijn
 * aangemaakt ná de laatste eerdere afrekening tussen dit paar. Een eerdere
 * afrekening zet immers altijd het hele toenmalige saldo tussen die twee
 * personen op nul (zie computeDirectSettlements), dus alles wat toen al
 * bestond is daar al door gedekt — ook als dat destijds (bijv. vóór deze
 * bon-koppeling bestond) geen reminder_paid-vinkjes heeft gezet. Zonder
 * deze afkap zou een kleine correctie-afrekening onterecht de hele,
 * nooit-afgevinkte geschiedenis in haar bon "claimen".
 */
export function computeSettlementItems(
  expenses: Pick<
    Expense,
    'id' | 'title' | 'category_id' | 'expense_date' | 'paid_by' | 'shares' | 'created_at'
  >[],
  categories: Pick<ExpenseCategory, 'id' | 'name'>[],
  payments: Pick<SettlementPayment, 'from_profile' | 'to_profile' | 'created_at'>[],
  from: string,
  to: string,
): SettlementItemDraft[] {
  const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? null

  const lastSettledAt = payments
    .filter(
      (p) =>
        (p.from_profile === from && p.to_profile === to) ||
        (p.from_profile === to && p.to_profile === from),
    )
    .reduce((latest, p) => (p.created_at > latest ? p.created_at : latest), '')

  const items: SettlementItemDraft[] = []
  for (const exp of expenses) {
    if (exp.created_at <= lastSettledAt) continue
    const debtor = exp.paid_by === to ? from : exp.paid_by === from ? to : null
    if (!debtor) continue
    const share = exp.shares.find((s) => s.profile_id === debtor && !s.reminder_paid)
    if (!share || share.share_amount <= 0) continue
    items.push({
      expense_id: exp.id,
      profile_id: debtor,
      title: exp.title,
      category_name: categoryName(exp.category_id),
      amount: share.share_amount,
      expense_date: exp.expense_date,
    })
  }
  return items
}
