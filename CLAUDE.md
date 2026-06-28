# Big Five Fantasy — Project Guide

Fantasy football platform for Europe's top 5 leagues. Vanilla HTML/JS frontend, Node.js/Express backend, Supabase (Postgres) database.

## Start Here — Session Orientation (read this first, then stop exploring)

> Purpose: let a new session act immediately without re-scanning the repo. The facts below
> are current and authoritative — trust them over broad exploration. **Open a file only when
> you must edit it, and jump to the line anchors below instead of reading whole files.**

**Stack in one line:** React + Vite + TypeScript SPA (`web/`) + Express backend
(`server/`) + Supabase/Postgres. Frontend builds to `web/dist`; **Vercel hosts the build,
Railway runs the API, Supabase is the DB.** (The legacy single-file `index.html` at the repo
root is the pre-React app, kept until visual parity is signed off — do not edit it for new work.)

### Codebase map — where everything is
| Area | File(s) | Key facts / line anchors |
|---|---|---|
| Frontend (React app) | `web/src/**` | Vite + React + TS. Entry `web/src/main.tsx` (QueryClient + Router) → `App.tsx` (routes). Screens in `web/src/screens/*`, shared components in `web/src/components/**`, each with a co-located `*.module.css`. Global tokens/animations in `web/src/styles/theme.css`. |
| Frontend API client | `web/src/lib/api.ts` | Typed `apiGet`/`apiPost`. `resolveApiBase()`: `VITE_API_URL` → else relative `/api` (Vite proxy in dev) → else hostname switch (canonical Vercel host → prod Railway, else test). |
| Server state | `web/src/sim/*` (TanStack Query) | `SimProvider`/`useSim` rehydrates `/dev/state` on load; `useLiveState` polls `/dev/live-state` (`refetchInterval`); `useSimActions` mutates + invalidates. `DevPanel` (localhost or `?sim`). |
| Frontend tests | `web/src/**/*.test.tsx` (Vitest + RTL) | `npm --prefix web test`. Cover api resolver, sim rehydration, layout/DevPanel, Draft board. |
| Legacy frontend | `index.html` (~2039 lines) | Pre-React single-file app. Superseded by `web/`; retained for parity diffing, slated for removal. |
| Backend entry | `server/index.js` | Routes under `/api`; serves `web/dist` if built (SPA fallback) else legacy `index.html`. Dev sim routes (`/api/dev`) mounted only when `NODE_ENV !== production`. |
| Supabase client | `server/lib/supabase.js` | `initSupabase()` → `req.supabase` (read routes); `getSupabaseAdmin()` used by draft/waiver/trade/notifications. **Both use the anon key — there is NO service-role key.** |
| API routes | `server/routes/*.js` | One file each: league, team, player, gameweek, matchup, draft, waiver, trade, notifications. Reads are GET; draft/waiver/trade have POST/PUT mutations. **No auth on any route.** |
| Scoring engine | `server/lib/scoring.js` | `computePlayerScore`, `computeMatchupScore`, `getDefaultScoringSettings`. Scores clamp at 0 (no negatives). |
| Live / finalize | `server/scripts/syncLive.js`, `syncPlayerStats.js` | API-Football → `player_stats` → finalize. CLI scripts, not HTTP. |
| DB schema | `supabase/migrations/20240101000000_initial_schema.sql` | The **only** migration. 21 tables. Full prose docs in `DATA_MODEL.md`. |
| Local seed | `supabase/seed.sql` (wired via `supabase/config.toml`) | Deterministic: 21 clubs, 60 players, 25 fixtures, 1 league, 10 GWs (GW1 active). **Creates NO teams/rosters/lineups/matchups.** |
| Local boot | `scripts/fb4-test.sh` (`npm run fb4-test`) | Docker → `supabase db reset` (incl. `seed_sim.sql`) → write `.env.local` → start **backend :3001 + Vite dev :5173** (HMR). Opens :5173. `scripts/dev-local.sh` is the older backend-only boot. |
| Sim/test harness | `SIM_FRAMEWORK_SPEC.md` | Spec for the dev simulation framework (phases, `/api/dev` API, `fb4-test`). Read before touching that feature. |

### Facts that save you a search
- **Local league id:** `11111111-1111-1111-1111-111111111111`; commissioner / human user id `00000000-0000-0000-0000-000000000001`; season `2024-25`.
- `teams.user_id` and `leagues.commissioner_id` are plain UUIDs (**not FKs**) → synthetic users are fine; no Supabase Auth needed to create teams.
- There is **no league "phase"/status enum**; lifecycle is inferred from `draft_sessions.status` + `gameweeks.status` (+ `matchups.status`, `fixtures.status`).
- "Active gameweek" lookups in routes are **global** (`.eq('status','active').limit(1)`), not league-scoped — fine for the single local league.
- `syncPlayerStats.js` calls an RPC `sum_team_player_points` that **does not exist** in the schema — don't depend on it.
- Draft is a server-enforced **snake draft** in `server/routes/draft.js`; `is_auto`/`pick_timer_secs` columns exist but autopick is **not** implemented.

### Don't waste tokens on
- Re-reading the legacy `index.html` — it's superseded by `web/`; work in `web/src/**` instead.
- Re-deriving the schema by querying the live DB — read `DATA_MODEL.md` or the single migration.
- Re-listing endpoints — they are one-per-file under `server/routes/`.

## Project Status

Core infrastructure is in place. Schema (21 tables) is live in both prod and test Supabase instances. Backend API runs on Railway, frontend is served statically via Vercel. Active development happens on `main`; the `test` branch mirrors the full stack in isolated sub-instances.

**Current state (as of 2026-06-27): all instances are sleeping/paused to save costs.**

### Waking everything up before working

Both Railway environments are set to sleep mode and both Supabase projects are paused. Do this before starting any dev work:

1. **Supabase (manual — dashboard only):**
   - [supabase.com/dashboard](https://supabase.com/dashboard) → open each project → Settings → General → **Unpause project**
   - Prod: `erkwiyftgyclqctykiad` (dwraj's Project)
   - Test: `wjpjxjameuottcwpidgk` (FB4-Test)
   - Wait ~30–60s for the DB to come online before deploying

2. **Railway (automatic on deploy):**
   - Sleep mode disables itself as soon as a deployment is triggered
   - Just push to `main` or `test` and Railway will wake up automatically

## Infrastructure

### Branches
| Branch | Purpose |
|---|---|
| `main` | Production — auto-deploys to Railway `production` + Vercel production |
| `test` | Test — auto-deploys to Railway `test` environment + Vercel preview |

### Production
| Service | URL / Ref |
|---|---|
| Vercel (frontend) | https://big-five-fantasy.vercel.app |
| Railway (backend API) | https://big-five-fantasy-production.up.railway.app |
| Supabase (database) | Project ref: `erkwiyftgyclqctykiad` |

### Test
| Service | URL / Ref |
|---|---|
| Vercel (preview) | Regenerated per-push; pattern: `big-five-fantasy-*-dhinesh-rajs-projects.vercel.app` |
| Railway (backend API) | https://big-five-fantasy-test.up.railway.app |
| Supabase (database) | Project ref: `wjpjxjameuottcwpidgk` (FB4-Test) |

## How Deploys Work

- **Push to `main`** → Railway `production` environment redeploys → Vercel production rebuilds automatically
- **Push to `test`** → Railway `test` environment redeploys → Vercel generates a new preview URL
- Vercel preview URLs automatically hit the test Railway backend (any non-`big-five-fantasy.vercel.app` hostname routes to the test API — see `resolveApiBase()` in `web/src/lib/api.ts`). Optionally set `VITE_API_URL` per Vercel environment to override.
- **Vercel builds the React app** via `vercel.json` (`npm run build` → `web/dist`). One-time: ensure the Vercel project has no conflicting Root Directory override.

## Railway — How to Operate

```bash
# Link to the project locally (run once)
railway link --project f3e09cde-e6d0-4cf3-8ac6-3f61e2540f30

# Deploy current directory to production
railway up --environment production

# Deploy current directory to test
railway up --environment test

# View logs
railway logs --environment production
railway logs --environment test

# Set a variable in test
railway variable set KEY=value --environment test --service big-five-fantasy

# Set a variable in production
railway variable set KEY=value --environment production --service big-five-fantasy
```

Railway project: `exciting-sparkle` (id: `f3e09cde-e6d0-4cf3-8ac6-3f61e2540f30`)
Railway service: `big-five-fantasy` (id: `04bb7b2c-c8f9-4f88-bd44-541408158a7a`)

## Supabase — How to Operate

```bash
# Link to production DB
supabase link --project-ref erkwiyftgyclqctykiad

# Link to test DB
supabase link --project-ref wjpjxjameuottcwpidgk

# Dump schema from production
pg_dump "postgresql://postgres:PASSWORD@db.erkwiyftgyclqctykiad.supabase.co:5432/postgres" \
  --schema-only --no-owner --no-privileges -f schema.sql

# Push schema to test
psql "postgresql://postgres:PASSWORD@db.wjpjxjameuottcwpidgk.supabase.co:5432/postgres" \
  -f schema.sql
```

Note: the `.env` file in the project root is not standard KEY=VALUE format — the Supabase CLI will fail to parse it. Use `--db-url` flags directly or `pg_dump`/`psql` instead.

## Vercel — How to Operate

```bash
# Link CLI to project
vercel link --yes --project big-five-fantasy

# Deploy a preview (from test branch)
vercel

# Deploy to production
vercel --prod

# Manage env vars
vercel env ls
vercel env add VARIABLE_NAME
```

## Local Development

### One-command startup

```bash
npm run fb4-test
```

This single command:
1. Starts Docker Desktop if it isn't running
2. Runs `supabase db reset` — wipes, applies the migration, seeds the DB (incl. `seed_sim.sql`: 8 teams, 4 matchups, `sim_state`)
3. Writes `.env.local` with the local Supabase credentials
4. Installs `web/` deps if missing
5. Starts the **backend (`:3001`, `--watch`) and the Vite dev server (`:5173`, HMR)** together, and opens `:5173`

Once running:
| Service | URL |
|---|---|
| Frontend (React + Vite, dev panel, HMR) | http://localhost:5173 |
| Backend API | http://localhost:3001/api |
| Supabase Studio | http://localhost:54323 |
| Supabase API | http://127.0.0.1:54321 |

Vite proxies `/api` → `:3001`, so the app uses relative `/api` paths in dev (no CORS).
Seed data: 21 clubs, 60 players, 25 fixtures, 1 league, 10 gameweeks, **8 sim teams + 4 matchups**.

For just the React app against an already-running backend: `npm run web:dev`.
For a production-style build: `npm run build` (→ `web/dist`, then served by the backend on `:3001`).

### Important quirks

- **`.env` is not standard KEY=VALUE** — it's a notes file. The Supabase CLI will fail if it sees it. The startup script temporarily renames it to `.env.notes` during Supabase commands.
- **ESM import order** — `dotenv.config()` in `server/index.js` runs after imports in ESM, so route files see empty env vars. We bypass this with `node --env-file=.env.local` (Node 20+), which loads the file before any module runs.
- **Supabase runs on branch `test`** locally (that's just what `supabase init` picked up from the linked project). It has no effect on the local stack.

### Stopping

```bash
supabase stop --workdir .   # stops containers, preserves data
supabase stop --workdir . --no-backup  # stops and wipes data
```

## Key Files

See the **Codebase map** in "Start Here" above for the full file→purpose table with line
anchors. Other references:

| File | Purpose |
|---|---|
| `web/` | React + Vite + TypeScript frontend (the app). `web/src/{screens,components,sim,lib}`, builds to `web/dist`. |
| `vercel.json` | Vercel build config: `buildCommand: npm run build`, `outputDirectory: web/dist`, SPA rewrites. |
| `index.html` | **Legacy** pre-React single-file app (~2039 lines), kept for parity diffing; slated for removal. |
| `server/index.js` | Express backend entrypoint (serves `web/dist` if built, else legacy `index.html`) |
| `server/lib/` | `supabase.js` (clients), `scoring.js` (scoring engine), `apiFootball.js` |
| `server/routes/` | One router per domain, mounted under `/api` |
| `server/scripts/` | DB setup, seeding, and API-Football sync scripts |
| `supabase/migrations/` | The single schema migration (21 tables) |
| `supabase/seed.sql` | Deterministic local seed data |
| `.env.local` | Local dev secrets (auto-generated, not committed) |
| `DATA_MODEL.md` | Full schema documentation |
| `SIM_FRAMEWORK_SPEC.md` | Dev simulation/testing framework spec |
| `DEPLOY.md` | Original deployment notes |
