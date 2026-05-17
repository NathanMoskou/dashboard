# Life OS

Persoonlijk dashboard dat biologische data (Apple Health) en productiviteit (Notion + Google Calendar + Dyme) integreert. PWA — werkt op telefoon en desktop.

Built per `SPEC.md`. Stack: **Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Supabase (Postgres + Auth) · Vercel**.

## Wat zit erin

| Module | Routes |
| --- | --- |
| Today View + Life Score | `/today` |
| Health & Gym | `/gym`, `/gym/active`, `/gym/templates`, `/gym/exercises`, `/gym/log`, `/gym/progress` |
| Productiviteit | `/focus`, `/focus/active`, `/focus/sessions`, `/focus/billable`, `/focus/clients` |
| Habits & Bio-stack | `/habits`, `/habits/heatmap`, `/habits/manage` |
| Financiën | `/finance`, `/finance/import`, `/finance/category/[name]`, `/finance/bucket` |
| Reflectie | `/reflection`, `/reflection/weekly`, `/reflection/history` |
| Instellingen | `/settings` |
| Apple Health Shortcut endpoint | `POST /api/health-sync` |
| Notion OAuth | `/api/integrations/notion/{authorize,callback}` |
| Google Calendar OAuth | `/api/integrations/google/{authorize,callback}` |

Auth is Supabase email/password (via `proxy.ts` — Next 16's renamed middleware). RLS is enabled op alle per-user tabellen. De exercise library is globaal; alles anders is owner-scoped.

## Lokaal draaien

```powershell
cd life-os
npm install
npm run dev
```

`.env.local` is al ingevuld met de Supabase URL en publishable key voor het project dat is aangemaakt (region eu-west-1, project ref `soqeviadadylgbvnggqn`).

Open [http://localhost:3000](http://localhost:3000), maak een account aan via "Nog geen account? Maak er een aan". Bij signup roept de app `seed_user_defaults()` aan; je krijgt automatisch:

- 11 habits per SPEC (Vroeg opstaan, 8 uur slaap, Creatine, …, Magnesium)
- 4 klanten (PGS, TIP Drachten, VitalScan, Het Tuintheater @ €45/uur)
- Een rij in `rest_config` met de SPEC-defaults

## Apple Health → /api/health-sync

1. Open `/settings` → "Apple Health API key" → klik **Genereer key**.
2. Bouw een iOS Shortcut die elke ochtend POST't:

```
POST https://<jouw-domein>/api/health-sync
Authorization: Bearer <key uit settings>
Content-Type: application/json

{
  "date": "2026-05-10",
  "hrv_ms": 64,
  "sleep_duration_min": 432,
  "resting_heart_rate": 52,
  "wake_time": "07:15"
}
```

De server berekent `readiness_score` op basis van een 30-daags HRV/RHR-gemiddelde en upsert in `health_entries`. **Vereist `SUPABASE_SERVICE_ROLE_KEY` in env vars** (zie hieronder).

## Service-role key (verplicht voor health-sync)

Pak deze uit het Supabase dashboard → Project Settings → API → `service_role` key. Voeg toe aan `.env.local`:

```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

Op Vercel: Project Settings → Environment Variables. **Nooit committen.**

## Notion koppelen

1. [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations) → **New integration** → kies "Public integration".
2. Redirect URI = `https://<jouw-domein>/api/integrations/notion/callback` (en lokaal: `http://localhost:3000/api/integrations/notion/callback`).
3. Vul `NOTION_OAUTH_CLIENT_ID` + `NOTION_OAUTH_CLIENT_SECRET` + `NOTION_OAUTH_REDIRECT_URI` in `.env.local`.
4. Open `/settings` → **Verbind Notion**.
5. Plak je taken-DB ID in het veld "Taken-database ID". De DB moet `Wanneer` (select met o.a. "Vandaag"), `Status`, `Prioriteit`, `Project`, `Deadline` properties hebben.
6. Voor billable uren-sync: zet per klant in `/focus/clients` de **Notion uren-DB ID** met properties `Datum, Taak, Uren, Bedrag, Type` (en optioneel `Notitie`).

## Google Calendar koppelen

1. Google Cloud Console → APIs & Services → Credentials → **OAuth client (Web)**.
2. Authorized redirect URI = `https://<jouw-domein>/api/integrations/google/callback` + `http://localhost:3000/api/integrations/google/callback`.
3. Enable "Google Calendar API".
4. Vul `GOOGLE_OAUTH_CLIENT_ID` + `GOOGLE_OAUTH_CLIENT_SECRET` + `GOOGLE_OAUTH_REDIRECT_URI`.
5. Open `/settings` → **Verbind Google Calendar**.

Refresh-tokens worden opgeslagen; de app refresht zelf wanneer het access-token verloopt.

## Deploy naar Vercel

1. Push de `life-os/` map naar GitHub.
2. [vercel.com/new](https://vercel.com/new) → Import → kies de repo → root directory `life-os`.
3. Voeg env vars toe (Production + Preview):

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://soqeviadadylgbvnggqn.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_t1OAlDxgBa0QZxchGxZ-rg_fILxvj6S
   SUPABASE_SERVICE_ROLE_KEY=<haal uit Supabase dashboard>
   NOTION_OAUTH_CLIENT_ID=...
   NOTION_OAUTH_CLIENT_SECRET=...
   NOTION_OAUTH_REDIRECT_URI=https://<jouw-vercel-domein>/api/integrations/notion/callback
   GOOGLE_OAUTH_CLIENT_ID=...
   GOOGLE_OAUTH_CLIENT_SECRET=...
   GOOGLE_OAUTH_REDIRECT_URI=https://<jouw-vercel-domein>/api/integrations/google/callback
   ```

4. Deploy. Op iOS: open de site in Safari → "Add to Home Screen" om als PWA te installeren.

### Supabase ↔ Vercel marketplace integratie (optioneel)

Vercel dashboard → Storage → Add → Supabase. Dit pusht automatisch `NEXT_PUBLIC_SUPABASE_URL` en `NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars. Let op: de marketplace-integratie zet `*_ANON_KEY`, niet `*_PUBLISHABLE_KEY`. Hernoem de var in Vercel naar `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, of update de drie Supabase client-files (`lib/supabase/{client,server,middleware}.ts`) om beide namen te accepteren.

## Wat nog handmatig kan / ontbreekt

- **Push notificaties** voor de zondag-avond wekelijkse review trigger — de PWA ondersteunt notifs maar er is nog geen scheduled push (vereist VAPID keys + een cron). Voor nu: bouw een iOS Shortcut die je elke zondag om 20:00 herinnert om naar `/reflection/weekly` te gaan.
- **App-icoontjes** zijn een eenvoudige SVG (`public/icons/icon.svg`). Vervang door een betere maskable PNG voor mooie home-screen iconen.
- **Deload-detectie** is gespecificeerd in SPEC maar nog niet als kaart op `/gym` getoond. Volume per spiergroep per week zit wel in `/gym/progress`.
- **Notion taken-DB property mapping** verwacht NL-namen (Wanneer, Status, Prioriteit, Project, Deadline). Pas aan in `lib/notion.ts` als jouw schema afwijkt.

## Architectuur kort

- `proxy.ts` (Next 16's middleware) refresht de Supabase-sessie en leidt onbeschermde routes naar `/login`.
- `lib/supabase/server.ts` — server-side client met async `cookies()`.
- `lib/supabase/client.ts` — browser client.
- `lib/supabase/admin.ts` — service-role client (alléén in `/api/health-sync` waar we via API key authenticeren).
- `lib/dal.ts` — `verifySession()` Data Access Layer; React `cache()` voor request-deduplication.
- `lib/readiness.ts`, `lib/life-score.ts`, `lib/rest.ts` — pure berekeningen per SPEC.
- Alles onder `app/(app)/...` is auth-protected via de proxy + de `(app)/layout.tsx` die `verifySession()` aanroept.
- Server Actions in elke module's `actions.ts` voor mutaties (en `revalidatePath`).
