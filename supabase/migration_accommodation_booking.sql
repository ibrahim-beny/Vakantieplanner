-- ============================================================
-- Migratie: slaapplek-boeking & terugbetaling per dag.
-- Draai dit eenmalig in de Supabase SQL-editor tegen de bestaande database
-- (schema.sql bevat deze kolommen inmiddels ook, voor nieuwe installaties).
-- ============================================================

alter table trip_days
  add column accommodation_booked boolean not null default false,
  add column accommodation_booked_by uuid references profiles(id),
  add column accommodation_paid_back boolean not null default false;
