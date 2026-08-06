-- ============================================================
-- Migratie: coördinaten voor de overnachtingslocatie (los van
-- location_name's lat/lng), gevuld via OpenStreetMap Nominatim-zoeken.
-- Draai dit eenmalig in de Supabase SQL-editor tegen de bestaande database
-- (schema.sql bevat deze kolommen inmiddels ook, voor nieuwe installaties).
-- ============================================================

alter table trip_days
  add column overnight_lat double precision,
  add column overnight_lng double precision;
