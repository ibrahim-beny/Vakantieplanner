# USA Roadtrip Planner

Gedeelde roadtrip-planner voor twee reisgenoten: maandkalender, dag-voor-dag tijdlijn en een kaart met de route. Vervangt het screenshot-van-de-agenda-met-pen-proces. Gebouwd met React + Vite + TypeScript + Tailwind, data in Supabase (Postgres, zonder login), kaart via react-leaflet/OpenStreetMap.

Bewust geen accounts of wachtwoorden: iedereen met de link kan de planning zien en aanpassen. Bij het openen kies je alleen even "wie ben jij" (puur om bij te houden wie een dag bewerkte).

## Lokaal draaien

```bash
npm install
cp .env.example .env   # vul de Supabase-waarden in (zie hieronder)
npm run dev
```

Zonder Supabase-project kun je de UI alvast bekijken met de in-memory dev-mock: zet `VITE_USE_MOCK=1` in `.env`. De mock werkt **alleen** onder `npm run dev` (de check zit achter `import.meta.env.DEV`) en kan dus nooit in een productie-build actief zijn.

## Supabase opzetten (eenmalig)

Geen accounts, geen auth-configuratie — gewoon een database.

1. **Project aanmaken** op [supabase.com](https://supabase.com) (gratis tier volstaat).
2. **Schema draaien**: open de SQL-editor in het dashboard en voer [supabase/schema.sql](supabase/schema.sql) uit (tabellen, geen Row Level Security — de planner is bewust volledig open).
3. **Seed draaien**: voer [supabase/seed.sql](supabase/seed.sql) uit in de SQL-editor. Dit zet de profielen (Ibrahim + Zaid), de trip (1–19 september 2026), alle 19 dagen en de eerste reacties klaar.
4. **Env-variabelen**: kopieer uit Settings → API de *Project URL* en *anon/public key* naar `.env`:

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

De anon key is bewust vrij te gebruiken: er is geen RLS, dus iedereen met de link kan alles lezen en bewerken (dat is de gekozen opzet, geen lek).

## Deployen naar Vercel

1. Push de repo naar GitHub (of gebruik `vercel` CLI).
2. Importeer het project in [vercel.com](https://vercel.com) — Vite wordt automatisch herkend (build: `npm run build`, output: `dist`).
3. Zet bij *Environment Variables* dezelfde `VITE_SUPABASE_URL` en `VITE_SUPABASE_ANON_KEY`.

Er is geen server nodig: de statische build praat rechtstreeks met Supabase.

## Hoe het werkt

- **Sync**: bewust simpel — elke wijziging wordt direct opgeslagen en daarna wordt alles opnieuw opgehaald (geen realtime/websockets). Ververs de pagina om wijzigingen van de ander te zien.
- **Datums**: dagen hangen aan echte datums (`trip_days.date`, uniek per trip), niet aan dag-nummers. Verschuiven kan per dag (slepen in de kalender, datumveld in het detailpaneel) of als reeks ("Dagen verschuiven" in de tijdlijn).
- **Kalender-interacties**: klik = selecteren/openen · dubbelklik op een leeg vakje = snel inplannen · rechtsklik = kopiëren/plakken (met per-veld selectie) · ⌘C/⌘V werkt ook · slepen = verplaatsen. Overschrijven vraagt altijd eerst om bevestiging.
- **Wie ben jij**: geen login — bij het openen kies je uit de ledenlijst wie je bent (opgeslagen in `localStorage` van je eigen browser). Elke wijziging stampt `updated_by`; de tijdlijn en het detailpaneel tonen "Laatst bewerkt door …". Klik op je eigen avatar om te wisselen van profiel.
- **Toegankelijkheid**: zichtbare focus-stijlen op alle interactieve elementen; de gedempte tekstkleuren zijn licht verdonkerd t.o.v. de design-handoff zodat kleine tekst overal WCAG AA (≥ 4.5:1) haalt.

## Structuur

```
supabase/schema.sql   tabellen (geen RLS — bewust volledig open)
supabase/seed.sql     eerste trip (Ibrahim + Zaid, 19 dagen)
src/api/              datalaag: Supabase-implementatie + dev-mock achter één interface
src/features/         wie-ben-jij, kalender, tijdlijn, kaart, dag-detailpaneel, dagen verschuiven
src/lib/identity.ts   lokaal onthouden wie je bent (localStorage, geen auth)
src/lib/dates.ts      datumhelpers — altijd lokale tijdzone, nooit toISOString()
```

Het datamodel is voorbereid op meerdere trips en meerdere gebruikers (tabellen `trips` + `trip_members`); de UI toont nu gewoon de eerste trip.
