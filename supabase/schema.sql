-- ============================================================
-- Roadtrip Planner — databaseschema + Row Level Security
-- Draai dit eenmalig in de Supabase SQL-editor (of via supabase db push).
-- ============================================================

-- Gebruikersprofiel — geen login, gewoon een naam + kleur om bij te houden
-- wie een dag heeft bewerkt.
create table profiles (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  color text not null, -- avatarkleur, bijv. #B5502F / #2C3B4A
  -- gast-deelnemer: telt mee in kostenverdeling, kan zichzelf niet kiezen
  -- als "wie ben jij" (zie WhoAmIScreen) — geen echte auth, dus puur UI-regel.
  is_guest boolean not null default false
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
  notes text,
  updated_by uuid references profiles(id),
  updated_at timestamptz default now(),
  unique (trip_id, date)
);

-- Een verblijf (hotel/motel/cabin) dat één of meerdere aaneengesloten nachten
-- beslaat — losstaand van de losse dagen. Kosten lopen via `expenses`
-- (gekoppeld via expenses.stay_id), `booked` is puur een reserverings-vinkje.
create table trip_stays (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  location_name text not null,
  start_date date not null,
  end_date date not null,
  lat double precision,
  lng double precision,
  booked boolean not null default false,
  updated_by uuid references profiles(id),
  updated_at timestamptz default now()
);

-- Zelf-beheerbare categorieën voor kostenposten (verblijf/auto/vlucht/eten/...),
-- per trip aan te passen via de app, geen hardcoded lijst.
create table expense_categories (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  name text not null,
  color text not null default '#8A8577',
  sort_order int not null default 0,
  created_at timestamptz default now()
);

-- Eén kostenpost (verblijf, autohuur, vliegticket, eten, ...). `paid_by` is de
-- ene betaler; hoe het bedrag verdeeld wordt staat expliciet in expense_shares.
create table expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  title text not null,
  category_id uuid references expense_categories(id) on delete set null,
  amount numeric not null check (amount > 0),
  expense_date date not null,
  paid_by uuid references profiles(id) not null,
  split_type text not null default 'equal' check (split_type in ('equal', 'custom')),
  -- optionele koppeling aan een verblijf; blijft bestaan als los bedrag als
  -- het verblijf ooit verwijderd wordt (geen geld laten verdwijnen).
  stay_id uuid references trip_stays(id) on delete set null,
  notes text,
  updated_by uuid references profiles(id),
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Wie voor welk bedrag meedoet in een kostenpost. Altijd expliciet opgeslagen,
-- ook bij een gelijke verdeling — wie hier geen rij heeft, deelt niet mee.
create table expense_shares (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid references expenses(id) on delete cascade,
  profile_id uuid references profiles(id),
  share_amount numeric not null check (share_amount >= 0),
  -- Puur cosmetische persoonlijke herinnering ("heb ik dit al terugbetaald
  -- aan de betaler?"), losgekoppeld van settlement_payments en de
  -- saldoberekening in src/lib/settlement.ts.
  reminder_paid boolean not null default false,
  unique (expense_id, profile_id)
);

-- Registratie van een daadwerkelijke betaling tussen twee personen om een
-- (deel van het) saldo te vereffenen — los van welke kostenpost dat saldo
-- veroorzaakte. Hiermee kan een voorgestelde afrekening "afgevinkt" worden.
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

-- Snapshot van de kostenposten die in één settlement_payment zijn meegenomen
-- ("bon" in de geschiedenis). Titel/categorie/bedrag/datum staan hier
-- bevroren op het moment van afrekenen, zodat de bon klopt blijft ook als de
-- kostenpost later wijzigt of verwijderd wordt (expense_id wordt dan null).
create table settlement_payment_items (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid references settlement_payments(id) on delete cascade,
  expense_id uuid references expenses(id) on delete set null,
  profile_id uuid references profiles(id) not null,
  title text not null,
  category_name text,
  amount numeric not null check (amount >= 0),
  expense_date date not null
);

create index expenses_trip_id_idx on expenses(trip_id);
create index expense_shares_expense_id_idx on expense_shares(expense_id);
create index expense_categories_trip_id_idx on expense_categories(trip_id);
create index settlement_payments_trip_id_idx on settlement_payments(trip_id);
create index settlement_payment_items_payment_id_idx on settlement_payment_items(payment_id);

-- updated_at automatisch bijwerken bij elke wijziging aan een dag/verblijf/kostenpost
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

create trigger expenses_updated_at
  before update on expenses
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
alter publication supabase_realtime add table trip_days, trip_stays, expenses, expense_categories, settlement_payments, expense_shares, settlement_payment_items;
