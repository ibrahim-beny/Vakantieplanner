-- ============================================================
-- Migratie: end_date van trip_stays wordt de checkoutdag (exclusief)
-- in plaats van de laatste overnachting (inclusief).
--
-- Vóór deze migratie: 'Van 10 aug' + 'Tot en met 12 aug' = 3 nachten,
-- waarbij 12 aug zelf de laatste overnachting was.
-- Na deze migratie: 'Van 10 aug' + 'Tot 13 aug' = dezelfde 3 nachten,
-- waarbij 13 aug de vertrek-/checkoutdag is (telt niet als overnachting).
--
-- Verhoogt dus simpelweg elke bestaande end_date met 1 dag zodat het
-- aantal nachten van bestaande verblijven ongewijzigd blijft.
--
-- Draai dit EENMALIG in de Supabase SQL-editor. Niet idempotent: een
-- tweede keer draaien telt nog een dag bij op en klopt dan niet meer.
-- ============================================================

update trip_stays
set end_date = end_date + 1;
