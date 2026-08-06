-- ============================================================
-- Migratie: kosten per overnachting.
-- Draai dit eenmalig in de Supabase SQL-editor tegen de bestaande database
-- (schema.sql bevat deze kolom inmiddels ook, voor nieuwe installaties).
-- ============================================================

alter table trip_days
  add column accommodation_cost numeric;
