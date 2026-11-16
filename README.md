# EveryBeday

A community map of toilets with bidets in Seoul. Open the site, see what's near you, check the
details, and add the ones you know.

Built with Next.js 16 (App Router, TypeScript), Kakao Maps, PostgreSQL + PostGIS (Supabase),
Drizzle ORM, Auth.js and Tailwind CSS.

## Features

- Map of Seoul with clustered pins, loaded only for the area on screen
- "Nearest bidet" button and a "my location" button
- Filters: open 24h, free, wheelchair accessible, men's / women's, verified only
- Detail sheet and a shareable detail page for every toilet, with directions in Kakao Map
- Sign in with Kakao or Google
- Add a toilet: pick the spot on the map, the address is filled in automatically
- "Is the bidet still here?" confirmations, and problem reports
- Moderation page for approving submissions and handling reports
- English and Korean

## Getting started

You need Node.js 20 or newer.

```bash
git clone https://github.com/joshuavg25/EveryBeday.git
cd EveryBeday
npm install
cp .env.example .env.local   # then fill in the values, see below
npm run db:migrate           # creates / updates the database tables
npm run dev
```

Open http://localhost:3000.

### Environment variables

Ask a teammate for the shared values, or create your own. Never commit `.env.local`.

| Variable                                | Where it comes from                                                       |
| --------------------------------------- | ------------------------------------------------------------------------- |
| `NEXT_PUBLIC_KAKAO_JS_KEY`              | Kakao Developers > app > 플랫폼 키 > JavaScript 키                        |
| `KAKAO_REST_KEY`                        | Same page, REST API 키. Also the client id for Kakao Login                |
| `DATABASE_URL`                          | Supabase > Connect > Session pooler URI                                   |
| `AUTH_SECRET`                           | Run `npx auth secret`, or any long random string                          |
| `AUTH_KAKAO_SECRET`                     | Kakao Developers > app > 카카오 로그인 > 보안 > Client Secret             |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google Cloud Console > APIs & Services > Credentials > OAuth client (Web) |
| `ADMIN_EMAILS` (optional)               | Google accounts that become admins on sign-in, comma separated            |
| `NEXT_PUBLIC_CONTACT_EMAIL` (optional)  | Contact address shown on the privacy policy page                          |

### One-time setup for login

**Kakao** (developers.kakao.com > your app):

1. 카카오 로그인 > 사용 설정: ON
2. 카카오 로그인 > Redirect URI: add `http://localhost:3000/api/auth/callback/kakao`
   (and `https://YOUR-DOMAIN/api/auth/callback/kakao` after deploying)
3. 동의항목: enable 닉네임 and 프로필 사진
4. 보안 > Client Secret: generate it, set 활성화 상태 to 사용함, copy it to `AUTH_KAKAO_SECRET`

**Google** (console.cloud.google.com):

1. Create an OAuth client of type "Web application"
2. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
   (and `https://YOUR-DOMAIN/api/auth/callback/google` after deploying)

### Making someone a moderator

Moderators can open `/admin`. Either list a Google address in `ADMIN_EMAILS` before that person
signs in, or run this in the Supabase SQL Editor after they have signed in once:

```sql
update users set role = 'moderator' where name = 'Their display name';
```

## Commands

| Command                      | What it does                                                      |
| ---------------------------- | ----------------------------------------------------------------- |
| `npm run dev`                | Start the development server                                      |
| `npm run build`              | Production build                                                  |
| `npm run lint`               | ESLint                                                            |
| `npm run typecheck`          | TypeScript check                                                  |
| `npm run format`             | Format everything with Prettier                                   |
| `npm run db:generate`        | Create a migration file after editing `server/db/schema.ts`       |
| `npm run db:migrate`         | Apply migrations to the database in `DATABASE_URL`                |
| `npm run db:seed`            | Replace the `[TEST]` toilets with a fresh set (safe to run again) |
| `npm run db:seed -- --clear` | Remove the `[TEST]` toilets (do this before launch)               |

After changing `server/db/schema.ts`, always run `db:generate` then `db:migrate`, and commit the
new files in `server/db/migrations/`.

## Project structure

```text
app/
  [locale]/            pages, under /en and /ko
    page.tsx           the map
    toilets/[id]/      detail page
    add/               add a toilet
    admin/             moderation
    login/  privacy/
  api/                 route handlers (the backend)
features/
  map/                 map screen, bottom sheet, Kakao helpers
  toilets/             forms, shared Zod schemas, types
  auth/  moderation/  api/
components/            small shared UI pieces
i18n/                  language config and translation helpers
messages/              en.json, ko.json (all UI text)
server/
  db/                  Drizzle schema, client, migrations, seed
  services/toilets.ts  all database logic and the rules below
  auth.ts  http.ts     login config, API helpers
proxy.ts               redirects / to /en or /ko
```

Components in `features/` never import from `server/`. They call the API instead, so database
code stays out of the browser bundle.

## API

Read endpoints are public. Write endpoints need a signed-in user.

| Method | Path                                            | Who                    | What                                                                                                              |
| ------ | ----------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/toilets?bbox=minLng,minLat,maxLng,maxLat` | anyone                 | Toilets in an area (max 500). Filters: `open24h=1`, `free=1`, `wheelchair=1`, `verified=1`, `gender=male\|female` |
| GET    | `/api/toilets/nearest?lat=&lng=&limit=`         | anyone                 | Closest toilets with distance in meters                                                                           |
| GET    | `/api/toilets/:id`                              | anyone                 | One toilet                                                                                                        |
| POST   | `/api/toilets`                                  | user                   | Add a toilet                                                                                                      |
| PATCH  | `/api/toilets/:id`                              | submitter or moderator | Edit details                                                                                                      |
| POST   | `/api/toilets/:id/confirm`                      | user                   | `{ hasBidet }`                                                                                                    |
| POST   | `/api/toilets/:id/report`                       | user                   | `{ reason, note? }`                                                                                               |
| GET    | `/api/admin/queue`                              | moderator              | Unverified toilets, hidden toilets, open reports                                                                  |
| POST   | `/api/admin/toilets/:id/review`                 | moderator              | `{ action: "approve" \| "hide" }`                                                                                 |
| POST   | `/api/admin/reports/:id/resolve`                | moderator              | Close a report                                                                                                    |

Errors come back as `{ "error": "code" }`. The codes are translated in `messages/*.json` under
`errors`.

## Data quality rules

All of these live in `RULES` at the top of `server/services/toilets.ts`.

- A new toilet starts as **unverified**. It shows on the map with a dashed pin.
- It becomes **verified** when 2 other users confirm the bidet, or a moderator approves it.
- A toilet is **hidden** when at least 3 users in 30 days say the bidet is gone and they outnumber
  the confirmations. Moderators can restore it.
- Adding a toilet within 30 m of an existing one shows an "is it one of these?" warning first.
- Per user per day: 5 new toilets, 30 confirmations (one per toilet), 10 reports.
- Submissions must be inside Seoul.

## Adding a language

1. Copy `messages/en.json` to `messages/xx.json` and translate the values.
2. Add the code to `locales` and `localeNames` in `i18n/config.ts`.
3. Add the loader to `i18n/dictionaries.ts`.

## Deploying to Vercel

1. Import the repository at vercel.com/new.
2. Add every variable from `.env.local` under Settings > Environment Variables.
3. Settings > Functions > Function Region: Seoul (`icn1`), so the server is close to the database.
4. Deploy, then register the production domain in three places:
   - Kakao Developers > JavaScript 키 > JavaScript SDK 도메인
   - Kakao Developers > 카카오 로그인 > Redirect URI
   - Google Cloud Console > OAuth client > Authorized redirect URIs
5. Run `npm run db:seed -- --clear` once to remove the test toilets.

## Working together

`main` is protected: create a branch, open a pull request, and get one approval. A pre-commit
hook formats and lints the files you commit.
