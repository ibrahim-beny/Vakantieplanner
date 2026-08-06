-- ============================================================
-- Roadtrip Planner — databaseschema + Row Level Security
-- Draai dit eenmalig in de Supabase SQL-editor (of via supabase db push).
-- ============================================================

-- Gebruikersprofiel — geen login, gewoon een naam + kleur om bij te houden
-- wie een dag heeft bewerkt.
create table profiles (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  color text not null -- avatarkleur, bijv. #B5502F / #2C3B4A
);

-- Een trip (later kunnen er meerdere zijn, van verschillende gebruikers)
create table trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- Wie mag een trip zien/bewerken
create table trip_members (
  trip_id uuid references trips(id) on delete cascade,
  user_id uuid references profiles(id),
  role text default 'editor', -- 'owner' | 'editor'
  primary key (trip_id, user_id)
);

-- De losse dagen van een trip
-- (geen order_index: een datum kan maar 1 dag hebben, sorteer op `date`)
create table trip_days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  date date not null,
  location_name text not null,
  lat double precision,
  lng double precision,
  activities text[], -- losse activiteiten, in de UI als tags toe te voegen/verwijderen
  drive_distance_km numeric,
  drive_time_hours numeric, -- in uren (bijv. 3.5, 8.5), matcht "Rijtijd (u)" 1-op-1
  notes text,
  updated_by uuid references profiles(id),
  updated_at timestamptz default now(),
  unique (trip_id, date)
);

-- Een verblijf (hotel/motel/cabin) dat één of meerdere aaneengesloten nachten
-- beslaat, met één totaalbedrag — losstaand van de losse dagen.
create table trip_stays (
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

-- Reacties per dag (simpel, ongenest)
create table trip_day_comments (
  id uuid primary key default gen_random_uuid(),
  trip_day_id uuid references trip_days(id) on delete cascade,
  author_id uuid references profiles(id),
  body text not null,
  created_at timestamptz default now()
);

-- updated_at automatisch bijwerken bij elke wijziging aan een dag/verblijf
create or replace function set_trip_day_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trip_days_updated_at
  before update on trip_days
  for each row execute function set_trip_day_updated_at();

create trigger trip_stays_updated_at
  before update on trip_stays
  for each row execute function set_trip_day_updated_at();

-- ============================================================
-- Geen Row Level Security: de planner is bewust volledig open —
-- iedereen met de link mag alles lezen en bewerken, zonder login.
-- Supabase geeft standaard (via de default privileges op het
-- public-schema) volledige toegang aan de anon-rol zolang er geen RLS
-- actief is, dus dat is voldoende.
-- ============================================================

-- ============================================================
-- Realtime: laat de app wijzigingen van andere gebruikers direct
-- binnenkrijgen (via websockets), zonder dat iemand hoeft te verversen.
-- ============================================================
alter publication supabase_realtime add table trip_days, trip_day_comments, trip_stays;
