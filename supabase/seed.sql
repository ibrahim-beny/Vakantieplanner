-- ============================================================
-- Seed: "USA Roadtrip september 2026" (19 dagen, 1 t/m 19 september)
--
-- Draai dit script in de Supabase SQL-editor, ná schema.sql. Geen
-- accounts of UUID's nodig — die worden hier gewoon gegenereerd.
-- ============================================================

do $$
declare
  user1 uuid := gen_random_uuid();
  user2 uuid := gen_random_uuid();
  v_trip uuid;
begin
  insert into profiles (id, display_name, color) values
    (user1, 'Ibrahim', '#B5502F'),
    (user2, 'Zaid', '#2C3B4A');

  insert into trips (name, start_date, end_date, created_by)
  values ('USA Roadtrip september 2026', '2026-09-01', '2026-09-19', user1)
  returning id into v_trip;

  insert into trip_members (trip_id, user_id, role) values
    (v_trip, user1, 'owner'),
    (v_trip, user2, 'editor');

  insert into trip_days
    (trip_id, date, location_name, lat, lng, activities, drive_distance_km, drive_time_hours, notes, updated_by)
  values
    (v_trip, '2026-09-01', 'San Francisco', 37.7749, -122.4194,
      array['Aankomst', 'Wandeling Golden Gate Bridge'], 0, 0,
      'Vlucht landt 14:20, motel check-in vanaf 16:00.', user1),
    (v_trip, '2026-09-02', 'San Francisco', 37.7749, -122.4194,
      array['Alcatraz (ochtend)', 'Fisherman''s Wharf'], 0, 0,
      'Alcatraz-tickets vooraf boeken, vaak uitverkocht.', user2),
    (v_trip, '2026-09-03', 'San Francisco', 37.7749, -122.4194,
      array['Chinatown', 'Twin Peaks uitzicht'], 0, 0,
      'Derde dag in San Francisco — extra tijd voor wat je zelf nog wilt zien.', user1),
    (v_trip, '2026-09-04', 'South Lake Tahoe', 38.9399, -119.9772,
      array['Kajakken op het meer'], 340, 3.5, null, user1),
    (v_trip, '2026-09-05', 'South Lake Tahoe', 38.9399, -119.9772,
      array['Wandeling Emerald Bay'], 0, 0, null, user1),
    (v_trip, '2026-09-06', 'Reno', 39.5296, -119.8138,
      array['Downtown Reno', 'Vroeg slapen voor lange rit'], 70, 1,
      'Tank volgooien voor morgen — volgende benzinestation is ver.', user2),
    (v_trip, '2026-09-07', 'Salt Lake City', 40.7608, -111.8910,
      array['Temple Square (bij aankomst, laat)'], 830, 8.5,
      'Lange rit — om 6:00 vertrekken, twee stops onderweg inplannen.', user2),
    (v_trip, '2026-09-08', 'Salt Lake City', 40.7608, -111.8910,
      array['Rustdag', 'Great Salt Lake'], 0, 0, 'Herstellen van gisteren.', user1),
    (v_trip, '2026-09-09', 'Bryce Canyon', 37.6283, -112.1676,
      array['Sunset Point bij aankomst'], 430, 4.5, 'Parkpas $35, geldt ook voor Zion.', user1),
    (v_trip, '2026-09-10', 'Bryce Canyon', 37.6283, -112.1676,
      array['Navajo Loop hike'], 0, 0, null, user2),
    (v_trip, '2026-09-11', 'Springdale (Zion)', 37.1889, -112.9986,
      array['Intocht Zion Canyon'], 120, 1.5, null, user2),
    (v_trip, '2026-09-12', 'Springdale (Zion)', 37.1889, -112.9986,
      array['Angels Landing hike'], 0, 0, 'Permit voor Angels Landing nodig — vooraf geregeld.', user1),
    (v_trip, '2026-09-13', 'Springdale (Zion)', 37.1889, -112.9986,
      array['The Narrows'], 0, 0, null, user1),
    (v_trip, '2026-09-14', 'Springdale (Zion)', 37.1889, -112.9986,
      array['Kolob Canyons (optioneel)', 'Rustdag'], 0, 0,
      'Extra dag in Zion — lekker rustig aan of nog een hike erbij.', user2),
    (v_trip, '2026-09-15', 'Las Vegas', 36.1699, -115.1398,
      array['Valley of Fire State Park onderweg'], 270, 3,
      'Valley of Fire dagpas $10, contant meenemen.', user2),
    (v_trip, '2026-09-16', 'Las Vegas', 36.1699, -115.1398,
      array['The Strip ''s avonds'], 0, 0, null, user2),
    (v_trip, '2026-09-17', 'Las Vegas', 36.1699, -115.1398,
      array['Dagtrip Hoover Dam'], 100, 2,
      'Geen check-out nodig, gewoon een dagtrip vanuit hetzelfde motel.', user1),
    (v_trip, '2026-09-18', 'Los Angeles', 34.0522, -118.2437,
      array['Aankomst', 'Santa Monica Pier'], 430, 4.5, null, user1),
    (v_trip, '2026-09-19', 'Los Angeles', 34.0522, -118.2437,
      array['Laatste ochtend', 'Vlucht terug (LAX)'], 0, 0,
      'Auto inleveren bij verhuurbedrijf vóór 10:00, vlucht om 14:40.', user1);

  insert into trip_stays (trip_id, location_name, start_date, end_date) values
    (v_trip, 'Budget motel, San Francisco', '2026-09-01', '2026-09-03'),
    (v_trip, 'Lakeside cabin, South Lake Tahoe', '2026-09-04', '2026-09-05'),
    (v_trip, 'Budget motel, Reno', '2026-09-06', '2026-09-06'),
    (v_trip, 'Budget motel, Salt Lake City', '2026-09-07', '2026-09-08'),
    (v_trip, 'Lodge bij Bryce Canyon', '2026-09-09', '2026-09-10'),
    (v_trip, 'Cabin Springdale', '2026-09-11', '2026-09-14'),
    (v_trip, 'Budget motel, Las Vegas', '2026-09-15', '2026-09-17'),
    (v_trip, 'Budget motel, Los Angeles', '2026-09-18', '2026-09-18');

  -- Reacties (uit de design-handoff seed-data)
  insert into trip_day_comments (trip_day_id, author_id, body)
  select id, user2, 'Zullen we bij aankomst meteen naar de brug lopen of eerst uitchecken bij het motel?'
  from trip_days where trip_id = v_trip and date = '2026-09-01';

  insert into trip_day_comments (trip_day_id, author_id, body)
  select id, user1, 'Eerst motel, dan lopen — anders slepen we met bagage.'
  from trip_days where trip_id = v_trip and date = '2026-09-01';

  insert into trip_day_comments (trip_day_id, author_id, body)
  select id, user2, 'Dit wordt de zwaarste dag. Stop bij Wendover voor koffie?'
  from trip_days where trip_id = v_trip and date = '2026-09-07';

  insert into trip_day_comments (trip_day_id, author_id, body)
  select id, user1, 'Ja graag, en laten we om 6 uur echt vertrekken dit keer.'
  from trip_days where trip_id = v_trip and date = '2026-09-07';
end $$;
