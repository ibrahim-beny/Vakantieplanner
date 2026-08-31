-- ============================================================
-- Migratie: "bon" bij een afrekening + automatisch afvinken van
-- terugbetaal-herinneringen (Kosten-tab).
-- Draai dit eenmalig in de Supabase SQL-editor tegen de bestaande database
-- (schema.sql bevat deze tabel inmiddels ook, voor nieuwe installaties).
--
-- Wat dit doet:
--   Nieuwe tabel settlement_payment_items: een snapshot van welke
--   kostenposten in één settlement_payment zijn meegenomen, zodat de
--   geschiedenis een bonnetje kan tonen (titel/categorie/bedrag/datum) en
--   "Ongedaan maken" precies weet welke expense_shares.reminder_paid weer
--   terug moeten naar false.
-- ============================================================

create table settlement_payment_items (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid references settlement_payments(id) on delete cascade,
  expense_id uuid references expenses(id) on delete set null,
  profile_id uuid references profiles(id) not null,
  title text not null,
  category_name text,
  amount numeric not null check (amount >= 0),
  expense_date date not null
);

create index settlement_payment_items_payment_id_idx on settlement_payment_items(payment_id);

alter publication supabase_realtime add table settlement_payment_items;
