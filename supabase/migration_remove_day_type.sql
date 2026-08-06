-- ============================================================
-- Migratie: verwijder de dagtype-functionaliteit (chill/licht/gemiddeld/
-- zwaar/vertrek/aankomst) — puur een label-veld, niet meer relevant.
-- Draai dit eenmalig in de Supabase SQL-editor tegen de bestaande database
-- (schema.sql bevat deze kolom inmiddels niet meer, voor nieuwe installaties).
-- ============================================================

alter table trip_days
  drop column day_type;
