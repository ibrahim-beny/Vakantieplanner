-- ============================================================
-- Migratie: volledige kostenverdeling (Kosten-tab).
-- Draai dit eenmalig in de Supabase SQL-editor tegen de bestaande database
-- (schema.sql bevat deze tabellen/kolommen inmiddels ook, voor nieuwe
-- installaties). Idempotent noch herhaalbaar — één keer draaien.
--
-- Wat dit doet:
--   1. profiles.is_guest toevoegen + Younes seeden als gast-deelnemer.
--   2. Nieuwe tabellen: expense_categories, expenses, expense_shares,
--      settlement_payments (+ indexes, trigger, realtime).
--   3. 5 standaardcategorieën seeden per bestaande trip.
--   4. Bestaande trip_stays.cost terugvertalen naar expenses (gelijk verdeeld
--      over de toenmalige trip_members), zodat er geen geld "verdwijnt".
--   5. trip_stays.cost / booked_by / paid_back blijven hier nog bestaan —
--      die worden pas in migration_drop_stay_costs.sql verwijderd, ná
--      verificatie dat de nieuwe Kosten-tab het overneemt.
-- ============================================================

alter table profiles add column is_guest boolean not null default false;

create table expense_categories (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  name text not null,
  color text not null default '#8A8577',
  sort_order int not null default 0,
  created_at timestamptz default now()
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  title text not null,
  category_id uuid references expense_categories(id) on delete set null,
  amount numeric not null check (amount > 0),
  expense_date date not null,
  paid_by uuid references profiles(id) not null,
  split_type text not null default 'equal' check (split_type in ('equal', 'custom')),
  stay_id uuid references trip_stays(id) on delete set null,
  notes text,
  updated_by uuid references profiles(id),
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

create table expense_shares (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid references expenses(id) on delete cascade,
  profile_id uuid references profiles(id),
  share_amount numeric not null check (share_amount >= 0),
  unique (expense_id, profile_id)
);

create table settlement_payments (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  from_profile uuid references profiles(id) not null,
  to_profile uuid references profiles(id) not null,
  amount numeric not null check (amount > 0),
  paid_at date not null default current_date,
  updated_by uuid references profiles(id),
  created_at timestamptz default now()
);

create index expenses_trip_id_idx on expenses(trip_id);
create index expense_shares_expense_id_idx on expense_shares(expense_id);
create index expense_categories_trip_id_idx on expense_categories(trip_id);
create index settlement_payments_trip_id_idx on settlement_payments(trip_id);

create trigger expenses_updated_at
  before update on expenses
  for each row execute function set_trip_day_updated_at();

alter publication supabase_realtime add table expenses, expense_categories, settlement_payments;

-- ------------------------------------------------------------
-- Data: Younes toevoegen als gast-deelnemer, standaardcategorieën seeden,
-- en bestaande verblijfkosten terugvertalen naar expenses.
-- ------------------------------------------------------------
do $$
declare
  younes uuid := gen_random_uuid();
  v_trip record;
  cat_verblijf uuid;
  cat_auto uuid;
  cat_vlucht uuid;
  cat_eten uuid;
  cat_overig uuid;
  s record;
  new_expense uuid;
  member_count int;
begin
  -- Younes toevoegen aan elke bestaande trip.
  insert into profiles (id, display_name, color, is_guest)
  values (younes, 'Younes', '#7A8B69', true);

  for v_trip in select id from trips loop
    insert into trip_members (trip_id, user_id, role) values (v_trip.id, younes, 'editor');

    insert into expense_categories (trip_id, name, sort_order) values
      (v_trip.id, 'Verblijf', 0),
      (v_trip.id, 'Auto', 1),
      (v_trip.id, 'Vlucht', 2),
      (v_trip.id, 'Eten', 3),
      (v_trip.id, 'Overig', 4);

    select id into cat_verblijf from expense_categories where trip_id = v_trip.id and name = 'Verblijf';

    select count(*) into member_count from trip_members where trip_id = v_trip.id;

    for s in select * from trip_stays where trip_id = v_trip.id and cost is not null loop
      insert into expenses (trip_id, title, category_id, amount, expense_date, paid_by, split_type, stay_id, updated_by)
      values (
        v_trip.id, s.location_name, cat_verblijf, s.cost, s.start_date,
        coalesce(s.booked_by, (select user_id from trip_members where trip_id = v_trip.id limit 1)),
        'equal', s.id, s.booked_by
      )
      returning id into new_expense;

      insert into expense_shares (expense_id, profile_id, share_amount)
      select new_expense, tm.user_id, round(s.cost / member_count, 2)
      from trip_members tm where tm.trip_id = v_trip.id;
    end loop;
  end loop;
end $$;
