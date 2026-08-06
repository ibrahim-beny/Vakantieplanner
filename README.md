# USA Roadtrip Planner

Gedeelde roadtrip-planner voor twee reisgenoten: maandkalender, dag-voor-dag tijdlijn en een kaart met de route. Vervangt het screenshot-van-de-agenda-met-pen-proces. Gebouwd met React + Vite + TypeScript + Tailwind, data in Supabase (Postgres + magic-link auth), kaart via react-leaflet/OpenStreetMap.

## Lokaal draaien

```bash
npm install
cp .env.example .env   # vul de Supabase-waarden in (zie hieronder)
npm run dev
```

Zonder Supabase-project kun je de UI alvast bekijken met de in-memory dev-mock: zet `VITE_USE_MOCK=1` in `.env`. De mock werkt **alleen** onder `npm run dev` (de check zit achter `import.meta.env.DEV`) en kan dus nooit in een productie-build actief zijn.

## Supabase opzetten (eenmalig)

1. **Project aanmaken** op [supabase.com](https://supabase.com) (gratis tier volstaat).
2. **Schema draaien**: open de SQL-editor in het dashboard en voer [supabase/schema.sql](supabase/schema.sql) uit (tabellen + Row Level Security).
3. **Registratie dichtzetten**: Authentication → Sign In / Up → zet *"Allow new users to sign up"* **uit**. De app stuurt magic links met `shouldCreateUser: false`, dus er is geen publieke registratie.
4. **De 2 gebruikers handmatig aanmaken**: Authentication → Users → *Add user* → *Create new user*. Maak beide accounts aan op e-mailadres (geen wachtwoord nodig; inloggen gaat via magic link):
   - `i.benyahya1995@gmail.com` (Ibrahim)
   - het e-mailadres van de tweede reisgenoot
5. **Seed draaien**: open [supabase/seed.sql](supabase/seed.sql), plak bovenaan de twee user-UUID's (te kopiëren uit Authentication → Users) en vervang `REISGENOOT_NAAM` door de echte naam. Voer het script uit in de SQL-editor. Dit zet de profielen, de trip (3–18 september 2026), alle 16 dagen en de eerste reacties klaar.
6. **Redirect URL instellen**: Authentication → URL Configuration → zet de *Site URL* op je app-URL (lokaal `http://localhost:5173`, later de Vercel-URL) en voeg beide toe aan *Redirect URLs*. De magic link stuurt de gebruiker daarheen terug.
7. **Env-variabelen**: kopieer uit Settings → API de *Project URL* en *anon/public key* naar `.env`:

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

De anon key is veilig om in de frontend te gebruiken: Row Level Security zorgt dat gebruikers alleen trips zien en bewerken waar ze via `trip_members` lid van zijn.

## Deployen naar Vercel

1. Push de repo naar GitHub (of gebruik `vercel` CLI).
2. Importeer het project in [vercel.com](https://vercel.com) — Vite wordt automatisch herkend (build: `npm run build`, output: `dist`).
3. Zet bij *Environment Variables* dezelfde `VITE_SUPABASE_URL` en `VITE_SUPABASE_ANON_KEY`.
4. Voeg na de eerste deploy de Vercel-URL toe aan de Supabase *Redirect URLs* (stap 6 hierboven), anders komt de magic link op localhost uit.

Er is geen server nodig: de statische build praat rechtstreeks met Supabase.

## Hoe het werkt

- **Sync**: bewust simpel — elke wijziging wordt direct opgeslagen en daarna wordt alles opnieuw opgehaald (geen realtime/websockets). Ververs de pagina om wijzigingen van de ander te zien.
- **Datums**: dagen hangen aan echte datums (`trip_days.date`, uniek per trip), niet aan dag-nummers. Verschuiven kan per dag (slepen in de kalender, datumveld in het detailpaneel) of als reeks ("Dagen verschuiven" in de tijdlijn).
- **Kalender-interacties**: klik = selecteren/openen · dubbelklik op een leeg vakje = snel inplannen · rechtsklik = kopiëren/plakken (met per-veld selectie) · ⌘C/⌘V werkt ook · slepen = verplaatsen. Overschrijven vraagt altijd eerst om bevestiging.
- **Wie bewerkte wat**: elke wijziging stampt `updated_by`; de tijdlijn en het detailpaneel tonen "Laatst bewerkt door …".
- **Toegankelijkheid**: zichtbare focus-stijlen op alle interactieve elementen; de gedempte tekstkleuren zijn licht verdonkerd t.o.v. de design-handoff zodat kleine tekst overal WCAG AA (≥ 4.5:1) haalt.

## Structuur

```
supabase/schema.sql   tabellen + RLS-policies
supabase/seed.sql     eerste trip (UUID's invullen vóór het draaien)
src/api/              datalaag: Supabase-implementatie + dev-mock achter één interface
src/features/         login, kalender, tijdlijn, kaart, dag-detailpaneel, dagen verschuiven
src/lib/dates.ts      datumhelpers — altijd lokale tijdzone, nooit toISOString()
```

Het datamodel is voorbereid op meerdere trips en meerdere gebruikers (tabellen `trips` + `trip_members`); de UI toont nu de eerste trip van de ingelogde gebruiker.
