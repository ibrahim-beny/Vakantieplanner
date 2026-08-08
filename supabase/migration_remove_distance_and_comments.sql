-- ============================================================
-- Migratie: verwijder reisafstand/rijtijd-functionaliteit en de
-- reacties-sectie per dag — niet meer in gebruik.
-- Draai dit eenmalig in de Supabase SQL-editor tegen de bestaande database
-- (schema.sql bevat deze kolommen/tabel inmiddels niet meer, voor nieuwe
-- installaties).
-- ============================================================

alter publication supabase_realtime drop table trip_day_comments;

drop table trip_day_comments;

alter table trip_days
  drop column drive_distance_km,
  drop column drive_time_hours;
