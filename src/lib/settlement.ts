import type { Expense, ExpenseShare, SettlementPayment } from './types'

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
 * Standaard greedy schuld-vereenvoudiging: koppel telkens de grootste
 * crediteur aan de grootste debiteur, tot alle saldo's binnen `epsilon` van
 * nul zitten.
 */
export function simplifyDebts(balances: Balance[], epsilon = 0.01): SettlementTransaction[] {
  const creditors = balances
    .filter((b) => b.net > epsilon)
    .map((b) => ({ id: b.profileId, amount: b.net }))
    .sort((a, b) => b.amount - a.amount)
  const debtors = balances
    .filter((b) => b.net < -epsilon)
    .map((b) => ({ id: b.profileId, amount: -b.net }))
    .sort((a, b) => b.amount - a.amount)

  const transactions: SettlementTransaction[] = []
  let i = 0
  let j = 0
  while (i < debtors.length && j < creditors.length) {
    const amount = round2(Math.min(debtors[i].amount, creditors[j].amount))
    if (amount > epsilon) transactions.push({ from: debtors[i].id, to: creditors[j].id, amount })
    debtors[i].amount -= amount
    creditors[j].amount -= amount
    if (debtors[i].amount <= epsilon) i++
    if (creditors[j].amount <= epsilon) j++
  }
  return transactions
}
