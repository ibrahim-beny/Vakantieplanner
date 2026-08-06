-- ============================================================
-- Roadtrip Planner — databaseschema + Row Level Security
-- Draai dit eenmalig in de Supabase SQL-editor (of via supabase db push).
-- ============================================================

-- Gebruikersprofiel gekoppeld aan Supabase auth.users
create table profiles (
  id uuid primary key references auth.users(id),
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
  day_type text not null check (day_type in ('chill', 'licht', 'gemiddeld', 'zwaar', 'vertrek')),
  overnight_location text,
  activities text[], -- losse activiteiten, in de UI als tags toe te voegen/verwijderen
  drive_distance_km numeric,
  drive_time_hours numeric, -- in uren (bijv. 3.5, 8.5), matcht "Rijtijd (u)" 1-op-1
  notes text,
  updated_by uuid references profiles(id),
  updated_at timestamptz default now(),
  unique (trip_id, date)
);

-- Reacties per dag (simpel, ongenest)
create table trip_day_comments (
  id uuid primary key default gen_random_uuid(),
  trip_day_id uuid references trip_days(id) on delete cascade,
  author_id uuid references profiles(id),
  body text not null,
  created_at timestamptz default now()
);

-- updated_at automatisch bijwerken bij elke wijziging aan een dag
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

-- ============================================================
-- Row Level Security
-- ============================================================

-- Helpers als SECURITY DEFINER zodat policies op trip_members niet
-- recursief naar zichzelf verwijzen (dat geeft in Postgres een
-- infinite-recursion fout).
create or replace function is_trip_member(t_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from trip_members
    where trip_id = t_id and user_id = auth.uid()
  );
$$;

create or replace function is_trip_creator(t_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from trips
    where id = t_id and created_by = auth.uid()
  );
$$;

create or replace function is_day_member(d_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1
    from trip_days d
    join trip_members m on m.trip_id = d.trip_id
    where d.id = d_id and m.user_id = auth.uid()
  );
$$;

alter table profiles enable row level security;
alter table trips enable row level security;
alter table trip_members enable row level security;
alter table trip_days enable row level security;
alter table trip_day_comments enable row level security;

-- profiles: alle ingelogde gebruikers kunnen profielen lezen (nodig voor
-- avatars/"laatst bewerkt door"); alleen je eigen profiel is bewerkbaar.
create policy "profiles: lezen voor ingelogd" on profiles
  for select to authenticated using (true);
create policy "profiles: eigen profiel bewerken" on profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- trips: alleen zichtbaar/bewerkbaar voor leden.
create policy "trips: lezen voor leden" on trips
  for select to authenticated using (is_trip_member(id));
create policy "trips: bewerken voor leden" on trips
  for update to authenticated using (is_trip_member(id)) with check (is_trip_member(id));
create policy "trips: aanmaken als jezelf" on trips
  for insert to authenticated with check (created_by = auth.uid());
create policy "trips: verwijderen door maker" on trips
  for delete to authenticated using (created_by = auth.uid());

-- trip_members: je ziet lidmaatschappen van trips waar je zelf lid van bent;
-- alleen de maker van een trip beheert de ledenlijst.
create policy "members: lezen voor leden" on trip_members
  for select to authenticated using (user_id = auth.uid() or is_trip_member(trip_id));
create policy "members: toevoegen door maker" on trip_members
  for insert to authenticated with check (is_trip_creator(trip_id));
create policy "members: verwijderen door maker of jezelf" on trip_members
  for delete to authenticated using (is_trip_creator(trip_id) or user_id = auth.uid());

-- trip_days: volledige CRUD, alleen voor leden van de trip.
create policy "days: lezen voor leden" on trip_days
  for select to authenticated using (is_trip_member(trip_id));
create policy "days: aanmaken voor leden" on trip_days
  for insert to authenticated with check (is_trip_member(trip_id));
create policy "days: bewerken voor leden" on trip_days
  for update to authenticated using (is_trip_member(trip_id)) with check (is_trip_member(trip_id));
create policy "days: verwijderen voor leden" on trip_days
  for delete to authenticated using (is_trip_member(trip_id));

-- trip_day_comments: leden van de trip (via join op trip_days) lezen;
-- plaatsen alleen als jezelf; eigen reacties bewerken/verwijderen.
create policy "comments: lezen voor leden" on trip_day_comments
  for select to authenticated using (is_day_member(trip_day_id));
create policy "comments: plaatsen als jezelf" on trip_day_comments
  for insert to authenticated with check (author_id = auth.uid() and is_day_member(trip_day_id));
create policy "comments: eigen reactie bewerken" on trip_day_comments
  for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "comments: eigen reactie verwijderen" on trip_day_comments
  for delete to authenticated using (author_id = auth.uid());
