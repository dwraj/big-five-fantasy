# Big Five Fantasy

A fantasy football platform for the European top 5 leagues (EPL, La Liga, Serie A, Bundesliga, Ligue 1) with cross-league player pooling, head-to-head competition, and holistic FPL-style scoring.

## Features

- **Cross-league roster building** — pick players from all 5 leagues
- **Head-to-head matchups** — compete weekly with other managers
- **Snake draft** — server-enforced draft with bot auto-picks (in sim mode)
- **Waivers & trades** — claim free agents and trade with other managers
- **Real-time scoring** — live match updates and gameweek scoring
- **Dev simulation framework** — drive the whole game locally with a dev panel

## Tech Stack

**Frontend** — React 19 + Vite + TypeScript SPA (in `web/`)
- React Router, TanStack Query, CSS Modules, Tabler Icons
- Builds to `web/dist`; hosted on Vercel

**Backend** — Node.js + Express (in `server/`)
- One router per domain under `/api`; hosted on Railway

**Database** — Supabase (Postgres)

**External data** — API-Football (api-sports.io)

## Quick Start

### Prerequisites
- Node.js 20+
- Docker Desktop + the [Supabase CLI](https://supabase.com/docs/guides/cli) (for the local database)

### One-command local stack

```bash
npm run fb4-test
```

This boots everything: Docker → `supabase db reset` (migrate + seed) → writes `.env.local`
→ starts the **backend on :3001** and the **Vite dev server on :5173** (with HMR), then opens
the app. Vite proxies `/api` to the backend.

| Service | URL |
|---|---|
| Frontend (React, dev panel, HMR) | http://localhost:5173 |
| Backend API | http://localhost:3001/api |
| Supabase Studio | http://localhost:54323 |

Other handy commands:

```bash
npm run web:dev      # frontend only, against an already-running backend
npm run dev          # backend only (node --watch server/index.js)
npm run build        # type-check + build web/ -> web/dist
```

### Environment

`npm run fb4-test` generates `.env.local` for you. For production (Railway/Vercel), set:

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_API_FOOTBALL_KEY=<your-api-football-key>
# Frontend (Vercel): optional — overrides the API base URL per environment
VITE_API_URL=https://<your-railway-app>.up.railway.app/api
```

## Testing

### Frontend unit/component tests (Vitest + React Testing Library)

The React app lives in `web/` and has automated tests:

```bash
npm --prefix web test            # run the suite once
npm --prefix web run test:watch  # watch mode while developing
```

Coverage includes:
- **API client** (`web/src/lib/api.ts`) — base-URL resolution across dev/preview/prod.
- **Sim state** — `useSim` rehydrates from `/api/dev/state` on load.
- **Layout + dev panel** — renders the shell and phase controls; a phase button hits the API.
- **Draft board** — snake-grid rendering and the click-to-draft action.

### Type-check / build

```bash
npm run build                    # runs tsc + builds web/ -> web/dist
```

### End-to-end simulation (manual)

Boot the full local stack and exercise the game via the dev panel:

```bash
npm run fb4-test                 # Supabase + backend :3001 + Vite :5173 (HMR)
```

Use the 🧪 **SIM** panel (bottom-right) to walk the phases. The acceptance criteria
and their concrete checks are documented in [`SIM_FRAMEWORK_SPEC.md`](./SIM_FRAMEWORK_SPEC.md) §7:

- **Phase switching** — `PRE_SEASON → DRAFTING → LIVE_ACTION → MID_WEEK → POST_SEASON`
- **Solo draft** — your pick triggers bot auto-picks up to your next turn
- **Live scoring** — auto-sim + manual events update the scoreboard; mid-week advance finalizes the gameweek
- **HMR preserves place** — editing code mid-session keeps your spot (state lives in the DB)

Quick API smoke checks:

```bash
curl localhost:3001/api/health
curl localhost:3001/api/dev/state
```

> Dev/sim routes (`/api/dev/*`) are only mounted when `NODE_ENV !== production`.

## Project Structure

```
.
├── web/                       # React + Vite + TypeScript frontend (the app)
│   ├── src/
│   │   ├── screens/           # the 7 screens (Dashboard, MyTeam, Standings, …)
│   │   ├── components/        # shared UI, each with a co-located *.module.css
│   │   ├── sim/               # dev simulation: SimContext, polling, DevPanel
│   │   ├── lib/api.ts         # typed API client
│   │   ├── App.tsx / main.tsx # routes + providers
│   │   └── styles/theme.css   # global design tokens
│   └── vite.config.ts         # dev proxy (/api -> :3001), build config
├── server/
│   ├── index.js               # Express entry (serves web/dist if built, else legacy)
│   ├── lib/                   # supabase.js, scoring.js, draftEngine.js, simEngine.js
│   ├── routes/                # API endpoints (incl. dev.js sim routes)
│   └── scripts/               # DB seeding + API-Football sync
├── supabase/                  # migrations, seed.sql, seed_sim.sql, config.toml
├── scripts/                   # fb4-test.sh (local stack), dev-local.sh
├── legacy/index.html          # pre-React single-file app (retained for reference)
├── vercel.json                # Vercel build: npm run build -> web/dist (SPA rewrites)
├── SIM_FRAMEWORK_SPEC.md      # dev simulation framework spec
├── DEPLOY.md                  # hosting guide
└── CLAUDE.md                  # contributor/agent orientation
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/leagues/:id` | GET | League details |
| `/api/leagues/:id/standings` | GET | League standings |
| `/api/teams/:id` | GET | Team details |
| `/api/teams/:id/roster` | GET | Team roster |
| `/api/players` | GET | Search players |
| `/api/players/available` | GET | Free agents |
| `/api/gameweeks/current` | GET | Current gameweek |
| `/api/matchups/:teamId/current` | GET | Current matchup |
| `/api/drafts/:leagueId` | GET / POST | Draft session + picks |
| `/api/dev/*` | GET / POST | Dev simulation (local only) |

## Database Schema

**Core tables:** `leagues`, `teams`, `players`, `gameweeks`, `rosters`, `lineups`,
`player_stats`, `matchups`, `waivers`, `trades` (full schema in
`supabase/migrations/`, prose docs in `DATA_MODEL.md`).

## Deployment

See [DEPLOY.md](./DEPLOY.md) for the full guide.

- **Push to `main`** → Railway `production` redeploys + Vercel production rebuilds.
- **Push to `test`** → Railway `test` redeploys + Vercel preview.
- Vercel builds the frontend via `vercel.json` (`npm run build` → `web/dist`).
- The frontend picks its API base from `VITE_API_URL`, falling back to a hostname
  switch (canonical Vercel host → prod Railway, otherwise the test API).

## Data Sync

```bash
npm run sync:players    # players from all 5 leagues
npm run sync:fixtures   # current gameweek fixtures
npm run sync:live       # live scores (run during matchdays)
```

## UI Screens

- **Dashboard** — stats, current matchup, top performers
- **My Team** — roster, starters/bench
- **Standings** — league table
- **Matchup** — head-to-head comparison
- **Waivers** — free agents, priority queue
- **Trades** — trade inbox & history
- **Draft** — draft board + available players (live in sim mode)

## Design Tokens

- EPL: `#6D28D9` · La Liga: `#DC2626` · Serie A: `#1D4ED8` · Bundesliga: `#D97706` · Ligue 1: `#059669`

## License

MIT
