-- ============================================================
-- Migratie: oude verblijf-kostenvelden opruimen.
--
-- PAS DRAAIEN nadat migration_add_expenses.sql is uitgevoerd én de nieuwe
-- Kosten-tab geverifieerd is tegen productiedata — vanaf dat moment lopen
-- alle kosten via `expenses`/`expense_shares`, en zijn deze kolommen op
-- trip_stays overbodig. `booked` blijft bestaan, puur als reserverings-
-- vinkje, losgekoppeld van geld.
-- ============================================================

alter table trip_stays
  drop column cost,
  drop column booked_by,
  drop column paid_back;
