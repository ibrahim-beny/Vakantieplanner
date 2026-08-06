-- ============================================================
-- Migratie: verblijven als eigen entiteit i.p.v. kosten per dag.
-- Eén boeking (hotel/motel/cabin) kan meerdere nachten beslaan; het
-- totaalbedrag hoeft niet meer per dag verdeeld en apart ingevoerd te
-- worden. Draai dit eenmalig in de Supabase SQL-editor tegen de bestaande
-- database (schema.sql bevat dit inmiddels al, voor nieuwe installaties).
--
-- Idempotent: elke stap gebruikt IF (NOT) EXISTS, dus dit script kan
-- probleemloos opnieuw gedraaid worden (bijv. na een eerdere gedeeltelijke
-- of mislukte poging).
-- ============================================================

create table if not exists trip_stays (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  location_name text not null,
  start_date date not null,
  end_date date not null,
  lat double precision,
  lng double precision,
  cost numeric,
  booked boolean not null default false,
  booked_by uuid references profiles(id),
  paid_back boolean not null default false,
  updated_by uuid references profiles(id),
  updated_at timestamptz default now()
);

create or replace trigger trip_stays_updated_at
  before update on trip_stays
  for each row execute function set_trip_day_updated_at();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'trip_stays'
  ) then
    alter publication supabase_realtime add table trip_stays;
  end if;
end $$;

alter table trip_days
  drop column if exists overnight_location,
  drop column if exists overnight_lat,
  drop column if exists overnight_lng,
  drop column if exists accommodation_booked,
  drop column if exists accommodation_booked_by,
  drop column if exists accommodation_paid_back,
  drop column if exists accommodation_cost;
