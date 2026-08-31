-- ============================================================
-- Migratie: per-share terugbetaal-herinnering (Kosten-tab).
-- Draai dit eenmalig in de Supabase SQL-editor tegen de bestaande database
-- (schema.sql bevat deze kolom inmiddels ook, voor nieuwe installaties).
--
-- Puur cosmetisch: telt niet mee in expenses/settlement_payments of in
-- computeBalances/simplifyDebts (src/lib/settlement.ts) — alleen een
-- persoonlijk vinkje per (expense, deelnemer) om te onthouden of iemand
-- zijn aandeel al informeel heeft terugbetaald aan de betaler.
-- ============================================================

alter table expense_shares
  add column reminder_paid boolean not null default false;

alter publication supabase_realtime add table expense_shares;
