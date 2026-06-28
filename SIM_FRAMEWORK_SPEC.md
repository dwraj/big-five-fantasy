# League Simulation & Testing Framework — Implementation Spec

> **Audience:** an engineer implementing this end-to-end. This document is the spec.
> Follow it top to bottom. Where it says "VERIFY against the file", open that file and
> confirm exact column/selector names before writing code — do not guess.
> Code blocks are copy-paste starting points, not necessarily final.

---

## 0. What we are building & why

Big Five Fantasy has no fast way to exercise the game by hand. Most of the UI is a static
mockup, there is no draft interaction, no live scoring, no league "phase" concept, and no
dev tooling. We are adding a **dev-only Simulation & Testing Framework** so one person can:

- Boot the whole local stack with one command (`fb4-test`).
- Instantly switch the league between phases: `PRE_SEASON`, `DRAFTING`, `LIVE_ACTION`, `MID_WEEK`, `POST_SEASON`.
- Run a full draft solo (you pick; bots auto-pick around you).
- Watch live scoring update the scoreboard in real time (auto-sim + manually fired events).
- Edit frontend code and reload without losing your place in the simulation.

**Core design principle (memorize this):** *All simulation state lives in the database.*
The frontend holds **no** authoritative state — on every load it calls `GET /api/dev/state`
and rebuilds the UI from the DB. This is what makes hot-reloading safe (AC-5): a browser
refresh re-reads the DB and puts you back exactly where you were (e.g. draft round 3).

### Decisions already made (chosen for lowest maintenance)
- **HMR:** no build tool. Use the `livereload` package to auto-refresh the browser on file
  save; DB rehydration restores state. (Do **not** introduce Vite/Webpack.)
- **Live transport:** short-interval **polling** (reuses the existing GET `fetchAPI` pattern).
  No WebSockets/SSE.
- **Frontend wiring scope:** wire only the **core sim screens** — Draft board, Live
  scoreboard, Standings, Matchup. Leave Waivers/Trades UIs static.

---

## 0a. Acceptance Criteria (the build is done when all pass)

These are the contract. Section 7 maps each to a concrete verification step.

- **[AC-1] One-command boot.** Running `fb4-test` must automatically boot the test
  environment: verify Docker is running (start it if not), start the local Supabase
  container, run migrations, run database seeding (incl. sim participants), and spin up the
  backend API + frontend.
- **[AC-2] Instant state switching.** Switching states (`PRE_SEASON`, `DRAFTING`,
  `LIVE_ACTION`, `MID_WEEK`, `POST_SEASON`) must happen instantly via an easy developer UI
  helper (the dev panel).
- **[AC-3] Solo draft with bots.** In draft mode, clicking "Draft Player" must process your
  pick and instantly auto-draft players for all subsequent computer-controlled teams until it
  is your turn again.
- **[AC-4] Real-time live action + mid-week.** In live action mode, scoreboards and league
  metrics must update dynamically in real time — responding both to automated mock event
  intervals and manually triggered mock API events via the pollers — without forcing manual
  page refreshes. Mid-week processing (lock lineups, finalize scoring, process waivers,
  advance the gameweek) must work without relying on actual calendar time.
- **[AC-5] HMR preserves place.** Any code changes and hot reloads must not reset your active
  test place (e.g. editing a CSS class mid-draft at round 3 must not send the draft back to
  round 1). Guaranteed because all sim state lives in the DB and the frontend rehydrates from
  `/api/dev/state` on every load.

---

## 1. Current-state facts (so you don't have to re-explore)

### 1.1 Repo layout
- `index.html` — entire frontend, **single file ~1768 lines**, no framework, no build step.
  All JS is one inline `<script>` at lines **1537–1766**.
- `server/index.js` — Express entrypoint (~81 lines).
- `server/routes/*.js` — one router per domain (league, team, player, gameweek, matchup,
  draft, waiver, trade, notifications), all mounted under `/api`.
- `server/lib/supabase.js` — `initSupabase()` (anon client, used as `req.supabase`) and
  `getSupabaseAdmin()` (also anon key — there is **no service-role key**; both factories
  read `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`).
- `server/lib/scoring.js` — pure scoring: `computePlayerScore(stats, settings)`,
  `computeMatchupScore(...)`, `getDefaultScoringSettings()`.
- `server/scripts/` — CLI scripts: `seedDb.js`, `syncLive.js`, `syncPlayerStats.js`,
  `processWaivers.js`, etc. (run on invoke; not HTTP).
- `supabase/migrations/20240101000000_initial_schema.sql` — the 21-table schema (only migration).
- `supabase/seed.sql` — **deterministic** local seed, wired via `supabase/config.toml`
  `[db.seed].sql_paths = ["./seed.sql"]`.
- `scripts/dev-local.sh` — the existing one-command local boot (basis for `fb4-test`).

### 1.2 Frontend mechanics that already exist (reuse these)
- API base resolver, `index.html:1539-1543`:
  ```js
  const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3001/api'
    : window.location.hostname === 'big-five-fantasy.vercel.app'
      ? 'https://big-five-fantasy-production.up.railway.app/api'
      : 'https://big-five-fantasy-test.up.railway.app/api';
  ```
- `fetchAPI(endpoint)` GET-only wrapper, `index.html:1546-1558`. Returns parsed JSON or `null`.
- `showScreen(id, navEl)` view switcher, `index.html:1702-1735`; titles map at `1691-1699`;
  screens are `<div class="screen" id="screen-<id>">` toggled by the `visible` class.
  Screen ids: `dashboard, myteam, standings, matchup, waivers, trades, draft`.
- `populatePlayerCards()` (`1596`) and `populateRosterRows()` (`1637`) show the DOM-render
  pattern to copy (querySelector into existing markup and set textContent/innerHTML).
- `loadStandings(leagueId)` defined at `1570` but **never called** — wire it up.
- Static blocks you will replace with data-driven renders:
  - Scoreboard list: `index.html:1135-1174`
  - Draft board table (`<table class="draft-tbl">`): `index.html:1475-1527`
  - Standings + Matchup screens (read the file to get exact containers).
- **No** localStorage, **no** query-param handling, **no** polling, **no** POST helper today.

### 1.3 Backend draft logic (already correct — we will refactor, not rewrite)
`server/routes/draft.js` implements a snake draft:
- Snake slot for a pick: odd round → `((pick-1) % N) + 1`; even round → `N - ((pick-1) % N)`.
- Turn check: compares the on-clock team to the submitted `teamId`, else `403 "Not your turn"`.
- On pick: insert `draft_picks`, insert `rosters` (`acquisition_type:'draft'`), advance
  `current_pick`/`current_round` (`draft.js:218-229`). **No autopick/bot logic exists.**

### 1.4 Database schema — columns you will touch
(From `supabase/migrations/20240101000000_initial_schema.sql`. VERIFY exact names there
and in `server/lib/scoring.js` before writing — especially `player_stats` stat columns.)

- `leagues(id uuid, name, commissioner_id uuid, season text, draft_status text default 'pending',
  scoring_settings jsonb, waiver_day, trade_deadline_gw, max_teams, roster_size, starting_xi_size,
  waiver_type, faab_budget)`
- `teams(id uuid, league_id uuid→leagues, user_id uuid /*unconstrained*/, name, logo_url,
  wins, losses, gameweek_points, total_points, created_at)`
- `players(id uuid, external_api_id, name, position text 'G'|'D'|'M'|'F', club_id int→clubs,
  league_api_id, nationality, status 'active', form, season_points, ownership_pct)`
- `clubs(id int, name, short_name, league_api_id, season)`
- `gameweeks(id, league_id, number int, start_date, end_date, deadline, status
  'upcoming'|'active'|'complete')` — **per league**.
- `rosters(team_id, player_id, acquisition_type 'draft'|'waiver'|'free_agent'|'trade',
  acquired_at)`, UNIQUE`(team_id, player_id)`.
- `lineups(team_id, gameweek_id, player_id, is_starter bool)`, UNIQUE`(team_id, gameweek_id, player_id)`.
- `player_stats(player_id, gameweek_id, fixture_id, minutes, goals, assists, clean_sheet,
  saves, ... cards/own_goals/penalties ..., rating, raw_points, is_live)`,
  UNIQUE`(player_id, fixture_id)`. **`fixture_id` is required.**
- `matchups(id, gameweek_id, home_team_id, away_team_id, home_score, away_score,
  status 'upcoming'|'active'|'complete', winner_team_id)`, UNIQUE`(gameweek_id, home_team_id, away_team_id)`.
- `fixtures(id int, league_api_id, season, home_club_id int, away_club_id int, kickoff_at,
  status 'NS'|'LIVE'|'HT'|'FT'|..., elapsed, home_score, away_score, gameweek_number)`.
- `draft_sessions(id, league_id UNIQUE, status 'pending'|'active'|'paused'|'complete',
  current_round, current_pick, pick_timer_secs default 90, started_at, completed_at)`.
- `draft_order(id, draft_id, team_id, slot)`, UNIQUE`(draft_id, slot)`.
- `draft_picks(id, draft_id, team_id, player_id, round, pick_number, is_auto, picked_at)`,
  UNIQUE`(draft_id, pick_number)` and `(draft_id, player_id)`.
- `waivers`, `waiver_priorities`, `trade_offers`, `trade_players`, `transactions`, `notifications`,
  `profiles`, `league_gameweek_fixtures` — see migration if needed.

### 1.5 Seed gaps (critical)
`supabase/seed.sql` creates: 21 clubs, 60 players, 25 fixtures, **1 league**
(`id = '11111111-1111-1111-1111-111111111111'`, `commissioner_id = '00000000-0000-0000-0000-000000000001'`,
`season = '2024-25'`), and 10 gameweeks (GW1 `active`, rest `upcoming`).
It creates **NO** `teams`, `rosters`, `lineups`, `player_stats`, `matchups`, or `draft_*`.
The simulation must create participants — done in a new local-only seed (Section 3).

### 1.6 Known traps (account for these)
- `teams.user_id` and `leagues.commissioner_id` are **plain UUIDs, not FKs** → synthetic
  users are fine; no Supabase Auth needed.
- "active gameweek" lookups in existing routes are **global** (`.eq('status','active').limit(1)`),
  not league-scoped. For local sim with one league this is fine; do not rely on it for multi-league.
- `server/scripts/syncPlayerStats.js` calls an RPC `sum_team_player_points` that **does not exist**
  in the schema. Do **not** depend on it — compute team totals with an inline aggregation.
- `computePlayerScore` clamps to `Math.max(0, round(score))` (no negative scores).
- `getSupabaseAdmin()` uses the anon key; if local RLS blocked writes you'd see failures, but
  `seed_sim.sql` runs `GRANT ALL` and local dev disables RLS, so writes succeed.

---

## 2. Phase model (the state machine)

Phase is stored in the `sim_state` table (`key='current_phase'`). Each phase is **orchestrated**
by writing the existing status columns. The dev API exposes one button per phase.

| Phase | draft_sessions.status | active gameweek | matchups (active GW) | fixtures | live sim |
|---|---|---|---|---|---|
| `PRE_SEASON` | (none/`pending`) | GW1 `upcoming` | `upcoming`, scores 0 | `NS` | off |
| `DRAFTING` | `active` (+order) | GW1 `upcoming` | `upcoming` | `NS` | off |
| `LIVE_ACTION` | `complete` | GW_n `active` | `active` (+lineups+stats) | sim fixture `LIVE` | available |
| `MID_WEEK` | `complete` | GW_n `complete`+finalized; GW_n+1 `active` | finalized→`complete` | `FT` | off |
| `POST_SEASON` | `complete` | all `complete` | all `complete` | `FT` | off |

Allowed transitions are linear but the dev panel lets you jump to any phase (it's a test tool).
Each phase setup function is **idempotent** (safe to click twice).

---

## 3. Database changes

### 3.1 New file: `supabase/seed_sim.sql` (local-only)
Runs after `seed.sql`. Creates the dev scratch table, 8 fantasy teams (team 1 = human), and
GW1 H2H matchups. **Idempotent** (guards on existing rows).

```sql
-- supabase/seed_sim.sql
-- Local-only simulation seed. Loaded after seed.sql via config.toml.

-- 1) Dev scratch table: holds the current phase and runtime flags.
CREATE TABLE IF NOT EXISTS sim_state (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON sim_state TO anon, authenticated;

INSERT INTO sim_state (key, value) VALUES
  ('current_phase',   '"PRE_SEASON"'::jsonb),
  ('live_sim_running', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2) Make the Local Dev League hold 8 teams.
UPDATE leagues SET max_teams = 8
WHERE id = '11111111-1111-1111-1111-111111111111';

-- 3) Create 8 teams (team 1 = human) and GW1 matchups, only if not already seeded.
DO $$
DECLARE
  v_league uuid := '11111111-1111-1111-1111-111111111111';
  v_human  uuid := '00000000-0000-0000-0000-000000000001';
  v_gw1    uuid;
  v_ids    uuid[];
  i        int;
  v_uid    uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM teams WHERE league_id = v_league) THEN
    RETURN; -- already seeded
  END IF;

  FOR i IN 1..8 LOOP
    IF i = 1 THEN v_uid := v_human; ELSE v_uid := gen_random_uuid(); END IF;
    INSERT INTO teams (league_id, user_id, name, wins, losses, gameweek_points, total_points)
    VALUES (v_league, v_uid,
            CASE WHEN i = 1 THEN 'My Team' ELSE 'Bot ' || (i-1) END,
            0, 0, 0, 0);
  END LOOP;

  -- Stable order. If teams has no created_at column, order by id instead.
  SELECT array_agg(id ORDER BY created_at, id) INTO v_ids
  FROM teams WHERE league_id = v_league;

  SELECT id INTO v_gw1 FROM gameweeks
  WHERE league_id = v_league AND number = 1 LIMIT 1;

  IF v_gw1 IS NOT NULL THEN
    FOR i IN 1..4 LOOP  -- 8 teams → 4 matchups
      INSERT INTO matchups (gameweek_id, home_team_id, away_team_id, home_score, away_score, status)
      VALUES (v_gw1, v_ids[2*i-1], v_ids[2*i], 0, 0, 'upcoming');
    END LOOP;
  END IF;
END $$;
```
> VERIFY: `teams` has `created_at`. If not, change the `array_agg` ordering to `ORDER BY id`.

### 3.2 Edit `supabase/config.toml`
Add the new seed to the existing `[db.seed]` block:
```toml
[db.seed]
enabled = true
sql_paths = ["./seed.sql", "./seed_sim.sql"]
```

---

## 4. Backend

### 4.1 New file: `server/lib/draftEngine.js` (shared snake/pick/bot logic)
Extract the snake math from `routes/draft.js` and add bot logic. `routes/draft.js` will be
refactored to call these (Section 4.4) so prod and sim share one implementation.

```js
import { getSupabaseAdmin } from './supabase.js';

const supabase = getSupabaseAdmin();

// Default draft length. Bots fill a balanced squad; keep small for fast sim.
export const DRAFT_ROUNDS = 15;

export function slotForPick(round, pickNumber, numTeams) {
  return round % 2 === 1
    ? ((pickNumber - 1) % numTeams) + 1
    : numTeams - ((pickNumber - 1) % numTeams);
}

export function nextPointer(currentPick, currentRound, numTeams) {
  let nextPick = currentPick + 1;
  let nextRound = currentRound;
  if (nextPick > numTeams * currentRound) {
    nextRound += 1;
    nextPick = numTeams * (nextRound - 1) + 1;
  }
  return { nextPick, nextRound };
}

export async function getDraftContext(leagueId) {
  const { data: draft } = await supabase
    .from('draft_sessions').select('*').eq('league_id', leagueId).single();
  if (!draft) return null;
  const { data: order } = await supabase
    .from('draft_order').select('*').eq('draft_id', draft.id)
    .order('slot', { ascending: true });
  const numTeams = order?.length || 0;
  const slot = numTeams ? slotForPick(draft.current_round, draft.current_pick, numTeams) : null;
  const onClockTeamId = order?.find(o => o.slot === slot)?.team_id || null;
  const complete = draft.current_round > DRAFT_ROUNDS || draft.status === 'complete';
  return { draft, order, numTeams, onClockTeamId, complete };
}

// Records a single pick for the team currently on the clock. isAuto=true for bots.
export async function recordPick(leagueId, teamId, playerId, isAuto = false) {
  const ctx = await getDraftContext(leagueId);
  if (!ctx) return { ok: false, error: 'Draft not found' };
  if (ctx.complete) return { ok: false, error: 'Draft complete' };
  if (ctx.onClockTeamId !== teamId) return { ok: false, error: 'Not your turn' };

  const { data: dupe } = await supabase
    .from('draft_picks').select('id').eq('draft_id', ctx.draft.id)
    .eq('player_id', playerId).maybeSingle();
  if (dupe) return { ok: false, error: 'Player already drafted' };

  const { data: pick, error: pickErr } = await supabase.from('draft_picks').insert({
    draft_id: ctx.draft.id, team_id: teamId, player_id: playerId,
    round: ctx.draft.current_round, pick_number: ctx.draft.current_pick,
    is_auto: isAuto, picked_at: new Date().toISOString(),
  }).select().single();
  if (pickErr) return { ok: false, error: pickErr.message };

  const { error: rErr } = await supabase.from('rosters')
    .insert({ team_id: teamId, player_id: playerId, acquisition_type: 'draft' });
  if (rErr && !rErr.message.includes('duplicate')) console.error('roster insert:', rErr);

  const { nextPick, nextRound } =
    nextPointer(ctx.draft.current_pick, ctx.draft.current_round, ctx.numTeams);
  await supabase.from('draft_sessions')
    .update({ current_pick: nextPick, current_round: nextRound })
    .eq('id', ctx.draft.id);

  return { ok: true, pick, nextPick, nextRound };
}

// Best available player for a team, weighted by positional need then season_points.
export async function pickBestAvailable(leagueId, teamId) {
  const ctx = await getDraftContext(leagueId);
  const { data: picks } = await supabase
    .from('draft_picks').select('player_id').eq('draft_id', ctx.draft.id);
  const taken = new Set((picks || []).map(p => p.player_id));

  const { data: roster } = await supabase
    .from('rosters').select('player_id, players(position)').eq('team_id', teamId);
  const counts = { G: 0, D: 0, M: 0, F: 0 };
  (roster || []).forEach(r => { const p = r.players?.position; if (p) counts[p] += 1; });

  const targets = { G: 2, D: 5, M: 5, F: 3 };
  const needOrder = Object.keys(targets)
    .sort((a, b) => (targets[b] - counts[b]) - (targets[a] - counts[a]));

  const { data: players } = await supabase
    .from('players').select('id, position, season_points')
    .eq('status', 'active').order('season_points', { ascending: false }).limit(500);
  const available = (players || []).filter(p => !taken.has(p.id));

  for (const pos of needOrder) {
    const hit = available.find(p => p.position === pos);
    if (hit) return hit.id;
  }
  return available[0]?.id || null;
}

// Auto-pick for every bot until it's the human's turn (or the draft finishes).
export async function autoDraftUntilHuman(leagueId, humanTeamId, maxPicks = 300) {
  const log = [];
  for (let n = 0; n < maxPicks; n++) {
    const ctx = await getDraftContext(leagueId);
    if (!ctx || ctx.complete || !ctx.onClockTeamId) break;
    if (ctx.onClockTeamId === humanTeamId) break;
    const playerId = await pickBestAvailable(leagueId, ctx.onClockTeamId);
    if (!playerId) break;
    const res = await recordPick(leagueId, ctx.onClockTeamId, playerId, true);
    if (!res.ok) break;
    log.push({ teamId: ctx.onClockTeamId, playerId });
  }
  return log;
}
```

### 4.2 New file: `server/lib/simEngine.js` (live scoring)
Generates lineups, baseline stats, applies events, recomputes matchup scores. Reuses
`scoring.js`. Uses a **synthetic "sim fixture"** so we don't have to map players to real
fixtures (avoids the `player_stats.fixture_id` FK problem).

```js
import { getSupabaseAdmin } from './supabase.js';
import { computePlayerScore, getDefaultScoringSettings } from './scoring.js';

const supabase = getSupabaseAdmin();
let liveTimer = null; // in-memory interval handle (single local process)

// Deterministic synthetic fixture id per gameweek number.
const simFixtureId = (gwNumber) => 99000 + gwNumber;

// Event → stat delta. VERIFY field names against player_stats columns + scoring.js.
const EVENT_EFFECTS = {
  goal:        s => ({ goals: (s.goals || 0) + 1 }),
  assist:      s => ({ assists: (s.assists || 0) + 1 }),
  save:        s => ({ saves: (s.saves || 0) + 1 }),
  yellow_card: s => ({ yellow_cards: (s.yellow_cards || 0) + 1 }),
  red_card:    s => ({ red_cards: (s.red_cards || 0) + 1 }),
  minutes:     s => ({ minutes: Math.min(90, (s.minutes || 0) + 15) }),
};

export async function getActiveGameweek(leagueId) {
  const { data } = await supabase.from('gameweeks').select('*')
    .eq('league_id', leagueId).eq('status', 'active').order('number').limit(1);
  return data?.[0] || null;
}

// Ensure a sim fixture row exists (FK target for player_stats).
async function ensureSimFixture(gwNumber) {
  const id = simFixtureId(gwNumber);
  const { data: existing } = await supabase.from('fixtures').select('id').eq('id', id).maybeSingle();
  if (existing) return id;
  const { data: clubs } = await supabase.from('clubs').select('id, league_api_id, season').limit(2);
  await supabase.from('fixtures').insert({
    id,
    league_api_id: clubs?.[0]?.league_api_id ?? null,
    season: clubs?.[0]?.season ?? null,
    home_club_id: clubs?.[0]?.id ?? null,
    away_club_id: clubs?.[1]?.id ?? null,
    kickoff_at: new Date().toISOString(),
    status: 'LIVE',
    gameweek_number: gwNumber,
  });
  return id;
}

// Create starting XI (first 11 of roster) + bench for every team in the gameweek.
export async function generateLineups(leagueId, gameweek) {
  const { data: teams } = await supabase.from('teams').select('id').eq('league_id', leagueId);
  for (const t of teams || []) {
    const { data: roster } = await supabase.from('rosters')
      .select('player_id').eq('team_id', t.id);
    const rows = (roster || []).map((r, idx) => ({
      team_id: t.id, gameweek_id: gameweek.id, player_id: r.player_id,
      is_starter: idx < 11,
    }));
    if (rows.length) {
      await supabase.from('lineups')
        .upsert(rows, { onConflict: 'team_id,gameweek_id,player_id' });
    }
  }
}

// Baseline player_stats (0 pts) for every starter so events can accumulate.
export async function initLiveStats(leagueId, gameweek) {
  const fixtureId = await ensureSimFixture(gameweek.number);
  const { data: starters } = await supabase.from('lineups')
    .select('player_id, teams!inner(league_id)')
    .eq('gameweek_id', gameweek.id).eq('is_starter', true)
    .eq('teams.league_id', leagueId);
  const seen = new Set();
  const rows = [];
  for (const s of starters || []) {
    if (seen.has(s.player_id)) continue;
    seen.add(s.player_id);
    rows.push({
      player_id: s.player_id, gameweek_id: gameweek.id, fixture_id: fixtureId,
      minutes: 0, goals: 0, assists: 0, saves: 0, raw_points: 0, is_live: true,
    });
  }
  if (rows.length) {
    await supabase.from('player_stats')
      .upsert(rows, { onConflict: 'player_id,fixture_id' });
  }
  return fixtureId;
}

// Apply one scoring event to a player, recompute their raw_points, then matchups.
export async function fireEvent(leagueId, playerId, type) {
  const gw = await getActiveGameweek(leagueId);
  if (!gw) return { ok: false, error: 'No active gameweek' };
  const effect = EVENT_EFFECTS[type];
  if (!effect) return { ok: false, error: `Unknown event type: ${type}` };

  const fixtureId = simFixtureId(gw.number);
  const { data: stat } = await supabase.from('player_stats').select('*')
    .eq('player_id', playerId).eq('fixture_id', fixtureId).maybeSingle();
  const base = stat || { player_id: playerId, gameweek_id: gw.id, fixture_id: fixtureId,
    minutes: 0, goals: 0, assists: 0, saves: 0, raw_points: 0, is_live: true };

  const merged = { ...base, ...effect(base) };
  const { data: player } = await supabase.from('players')
    .select('position').eq('id', playerId).single();

  const settings = await getLeagueScoringSettings(leagueId);
  merged.raw_points = computePlayerScore({ ...merged, position: player?.position }, settings);

  await supabase.from('player_stats')
    .upsert(merged, { onConflict: 'player_id,fixture_id' });
  await recomputeMatchupScores(gw.id);
  return { ok: true, raw_points: merged.raw_points };
}

export async function getLeagueScoringSettings(leagueId) {
  const { data } = await supabase.from('leagues')
    .select('scoring_settings').eq('id', leagueId).single();
  return data?.scoring_settings || getDefaultScoringSettings();
}

async function teamGwScore(teamId, gameweekId) {
  const { data: lineup } = await supabase.from('lineups')
    .select('player_id').eq('team_id', teamId)
    .eq('gameweek_id', gameweekId).eq('is_starter', true);
  const ids = (lineup || []).map(l => l.player_id);
  if (!ids.length) return 0;
  const { data: stats } = await supabase.from('player_stats')
    .select('raw_points').in('player_id', ids).eq('gameweek_id', gameweekId);
  return (stats || []).reduce((sum, s) => sum + (s.raw_points || 0), 0);
}

export async function recomputeMatchupScores(gameweekId) {
  const { data: matchups } = await supabase.from('matchups').select('*').eq('gameweek_id', gameweekId);
  for (const m of matchups || []) {
    const home = await teamGwScore(m.home_team_id, gameweekId);
    const away = await teamGwScore(m.away_team_id, gameweekId);
    const winner = home === away ? null : (home > away ? m.home_team_id : m.away_team_id);
    await supabase.from('matchups')
      .update({ home_score: home, away_score: away, winner_team_id: winner })
      .eq('id', m.id);
  }
}

// ── Auto-sim firehose ────────────────────────────────────────────────────────
export async function startLiveSim(leagueId, intervalMs = 2500) {
  if (liveTimer) return; // already running
  await setFlag('live_sim_running', true);
  liveTimer = setInterval(() => fireRandomEvent(leagueId).catch(console.error), intervalMs);
}
export async function stopLiveSim() {
  if (liveTimer) { clearInterval(liveTimer); liveTimer = null; }
  await setFlag('live_sim_running', false);
}
export function isLiveSimRunning() { return !!liveTimer; }

async function fireRandomEvent(leagueId) {
  const gw = await getActiveGameweek(leagueId);
  if (!gw) return;
  // pick a random starter and a weighted-random event
  const { data: starters } = await supabase.from('lineups')
    .select('player_id').eq('gameweek_id', gw.id).eq('is_starter', true);
  if (!starters?.length) return;
  const player = starters[Math.floor(Math.random() * starters.length)].player_id;
  const pool = ['goal','assist','assist','save','save','save','yellow_card','minutes','minutes'];
  const type = pool[Math.floor(Math.random() * pool.length)];
  await fireEvent(leagueId, player, type);
}

async function setFlag(key, value) {
  await supabase.from('sim_state')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
}
```
> VERIFY: the exact `player_stats` columns and the stat field names `computePlayerScore`
> reads (open `server/lib/scoring.js`). Adjust `EVENT_EFFECTS` and the baseline-row keys to
> match. If `computePlayerScore` takes position differently (e.g. a second arg), adapt the call.

### 4.3 New file: `server/routes/dev.js` (the dev API, mounted at `/api/dev`)
Guarded so it never runs in production. Default league id is the seeded local league.

```js
import express from 'express';
import { getSupabaseAdmin } from '../lib/supabase.js';
import * as draftEngine from '../lib/draftEngine.js';
import * as sim from '../lib/simEngine.js';
import { processWaiversForLeague } from '../scripts/processWaivers.js'; // see 4.5
import { finalizeGameweek } from '../scripts/syncPlayerStats.js';        // see 4.5

const router = express.Router();
const supabase = getSupabaseAdmin();

const LEAGUE = '11111111-1111-1111-1111-111111111111';
const HUMAN_TEAM_USER = '00000000-0000-0000-0000-000000000001';

// Hard guard: never expose in production.
router.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production') return res.status(404).end();
  next();
});

async function getPhase() {
  const { data } = await supabase.from('sim_state').select('value').eq('key', 'current_phase').maybeSingle();
  return data?.value || 'PRE_SEASON';
}
async function setPhase(phase) {
  await supabase.from('sim_state')
    .upsert({ key: 'current_phase', value: phase, updated_at: new Date().toISOString() }, { onConflict: 'key' });
}
async function humanTeamId() {
  const { data } = await supabase.from('teams').select('id')
    .eq('league_id', LEAGUE).eq('user_id', HUMAN_TEAM_USER).maybeSingle();
  return data?.id || null;
}

// ── GET /api/dev/state — rehydration source ──────────────────────────────────
router.get('/state', async (req, res) => {
  try {
    const phase = await getPhase();
    const { data: gw } = await supabase.from('gameweeks').select('*')
      .eq('league_id', LEAGUE).eq('status', 'active').order('number').limit(1);
    const draftCtx = await draftEngine.getDraftContext(LEAGUE);
    const me = await humanTeamId();
    res.json({
      phase,
      leagueId: LEAGUE,
      humanTeamId: me,
      liveSimRunning: sim.isLiveSimRunning(),
      activeGameweek: gw?.[0] || null,
      draft: draftCtx ? {
        status: draftCtx.draft.status,
        round: draftCtx.draft.current_round,
        pick: draftCtx.draft.current_pick,
        onClockTeamId: draftCtx.onClockTeamId,
        isMyTurn: draftCtx.onClockTeamId === me,
        complete: draftCtx.complete,
      } : null,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/dev/phase { phase } — orchestrate world into a phase ────────────
router.post('/phase', async (req, res) => {
  try {
    const { phase } = req.body;
    const setups = {
      PRE_SEASON:  setupPreSeason,
      DRAFTING:    setupDrafting,
      LIVE_ACTION: setupLiveAction,
      MID_WEEK:    setupMidWeek,
      POST_SEASON: setupPostSeason,
    };
    if (!setups[phase]) return res.status(400).json({ error: 'Unknown phase' });
    await setups[phase]();
    await setPhase(phase);
    res.json({ ok: true, phase });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Draft ────────────────────────────────────────────────────────────────────
router.post('/draft/init', async (req, res) => {
  try { await initDraft(); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/draft/pick', async (req, res) => {
  try {
    const { playerId } = req.body;
    const me = await humanTeamId();
    const human = await draftEngine.recordPick(LEAGUE, me, playerId, false);
    if (!human.ok) return res.status(400).json({ error: human.error });
    const botLog = await draftEngine.autoDraftUntilHuman(LEAGUE, me);
    const ctx = await draftEngine.getDraftContext(LEAGUE);
    if (ctx?.complete) {
      await supabase.from('draft_sessions')
        .update({ status: 'complete', completed_at: new Date().toISOString() })
        .eq('league_id', LEAGUE);
    }
    res.json({ ok: true, yourPick: human.pick, botPicks: botLog, complete: ctx?.complete });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Live ──────────────────────────────────────────────────────────────────────
router.get('/live-state', async (req, res) => {
  try {
    const gw = await sim.getActiveGameweek(LEAGUE);
    if (!gw) return res.json({ matchups: [], gameweek: null });
    const { data: matchups } = await supabase.from('matchups')
      .select('id, home_team_id, away_team_id, home_score, away_score, status')
      .eq('gameweek_id', gw.id);
    const { data: teams } = await supabase.from('teams')
      .select('id, name, total_points').eq('league_id', LEAGUE);
    res.json({ gameweek: gw, matchups: matchups || [], teams: teams || [], liveSimRunning: sim.isLiveSimRunning() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/live/event', async (req, res) => {
  try {
    const { playerId, type } = req.body;
    const r = await sim.fireEvent(LEAGUE, playerId, type);
    res.status(r.ok ? 200 : 400).json(r);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/live/start', async (req, res) => {
  try { await sim.startLiveSim(LEAGUE); res.json({ ok: true, running: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/live/stop', async (req, res) => {
  try { await sim.stopLiveSim(); res.json({ ok: true, running: false }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Mid-week advance (no calendar dependency) ─────────────────────────────────
router.post('/advance', async (req, res) => {
  try {
    await sim.stopLiveSim();
    const gw = await sim.getActiveGameweek(LEAGUE);
    if (!gw) return res.status(400).json({ error: 'No active gameweek' });

    // 1) lock lineups + mark fixtures FT (lineups already exist from LIVE_ACTION)
    await supabase.from('fixtures').update({ status: 'FT' })
      .eq('id', 99000 + gw.number);
    // 2) finalize scoring (reuse scripts; see 4.5)
    await finalizeGameweek(LEAGUE, gw.id);
    // 3) mark gameweek + its matchups complete, set winners
    await sim.recomputeMatchupScores(gw.id);
    await supabase.from('matchups').update({ status: 'complete' }).eq('gameweek_id', gw.id);
    await supabase.from('gameweeks').update({ status: 'complete' }).eq('id', gw.id);
    // 4) update team W/L + totals from this gameweek's matchups
    await applyMatchupResults(gw.id);
    // 5) process waivers (reuse scripts)
    await processWaiversForLeague(LEAGUE, gw.id);
    // 6) activate next gameweek
    const { data: next } = await supabase.from('gameweeks').select('*')
      .eq('league_id', LEAGUE).eq('number', gw.number + 1).maybeSingle();
    if (next) await supabase.from('gameweeks').update({ status: 'active' }).eq('id', next.id);
    await setPhase('MID_WEEK');
    res.json({ ok: true, finalized: gw.number, nextGameweek: next?.number || null });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Phase setup helpers ───────────────────────────────────────────────────────
async function setupPreSeason() {
  await sim.stopLiveSim();
  await supabase.from('draft_sessions').delete().eq('league_id', LEAGUE);
  await clearGameplayState();
  await setGameweekActive(1);
}

async function setupDrafting() {
  await sim.stopLiveSim();
  await clearGameplayState();
  await initDraft();
  await supabase.from('draft_sessions')
    .update({ status: 'active', started_at: new Date().toISOString() })
    .eq('league_id', LEAGUE);
  await setGameweekActive(1);
}

async function setupLiveAction() {
  // requires a completed-ish draft so rosters exist; if none, auto-run a full draft.
  await ensureRostersExist();
  const gw = (await sim.getActiveGameweek(LEAGUE)) || (await setGameweekActive(1));
  await sim.generateLineups(LEAGUE, gw);
  await sim.initLiveStats(LEAGUE, gw);
  await supabase.from('matchups').update({ status: 'active' }).eq('gameweek_id', gw.id);
}

async function setupMidWeek() {
  // convenience: same as pressing Advance once from LIVE_ACTION
  await setupLiveAction();
}

async function setupPostSeason() {
  await sim.stopLiveSim();
  await supabase.from('gameweeks').update({ status: 'complete' }).eq('league_id', LEAGUE);
  await supabase.from('matchups').update({ status: 'complete' })
    .in('gameweek_id',
      (await supabase.from('gameweeks').select('id').eq('league_id', LEAGUE)).data.map(g => g.id));
}

// ── small helpers ─────────────────────────────────────────────────────────────
async function initDraft() {
  await supabase.from('draft_sessions').delete().eq('league_id', LEAGUE);
  const { data: teams } = await supabase.from('teams').select('id').eq('league_id', LEAGUE);
  const { data: draft } = await supabase.from('draft_sessions')
    .insert({ league_id: LEAGUE, status: 'pending', current_round: 1, current_pick: 1 })
    .select().single();
  const shuffled = [...teams].sort(() => Math.random() - 0.5);
  await supabase.from('draft_order').insert(
    shuffled.map((t, i) => ({ draft_id: draft.id, team_id: t.id, slot: i + 1 }))
  );
}

async function ensureRostersExist() {
  const { count } = await supabase.from('rosters').select('*', { count: 'exact', head: true });
  if (count && count > 0) return;
  await initDraft();
  await supabase.from('draft_sessions')
    .update({ status: 'active', started_at: new Date().toISOString() }).eq('league_id', LEAGUE);
  const me = await humanTeamId();
  // run a complete auto draft (bots fill everyone including the human for setup convenience)
  for (let i = 0; i < 1000; i++) {
    const ctx = await draftEngine.getDraftContext(LEAGUE);
    if (!ctx || ctx.complete || !ctx.onClockTeamId) break;
    const pid = await draftEngine.pickBestAvailable(LEAGUE, ctx.onClockTeamId);
    if (!pid) break;
    await draftEngine.recordPick(LEAGUE, ctx.onClockTeamId, pid, true);
  }
  await supabase.from('draft_sessions')
    .update({ status: 'complete', completed_at: new Date().toISOString() }).eq('league_id', LEAGUE);
}

async function clearGameplayState() {
  const { data: teams } = await supabase.from('teams').select('id').eq('league_id', LEAGUE);
  const teamIds = (teams || []).map(t => t.id);
  await supabase.from('rosters').delete().in('team_id', teamIds);
  await supabase.from('lineups').delete().in('team_id', teamIds);
  await supabase.from('matchups').update({ home_score: 0, away_score: 0, status: 'upcoming', winner_team_id: null })
    .in('home_team_id', teamIds);
  await supabase.from('teams').update({ wins: 0, losses: 0, total_points: 0, gameweek_points: 0 })
    .eq('league_id', LEAGUE);
}

async function setGameweekActive(number) {
  await supabase.from('gameweeks').update({ status: 'upcoming' }).eq('league_id', LEAGUE);
  const { data } = await supabase.from('gameweeks')
    .update({ status: 'active' }).eq('league_id', LEAGUE).eq('number', number).select().single();
  return data;
}

async function applyMatchupResults(gameweekId) {
  const { data: ms } = await supabase.from('matchups').select('*').eq('gameweek_id', gameweekId);
  for (const m of ms || []) {
    if (m.winner_team_id) {
      const loser = m.winner_team_id === m.home_team_id ? m.away_team_id : m.home_team_id;
      await supabase.rpc; // (no rpc) — do two reads+updates instead:
      await bumpTeam(m.winner_team_id, { win: true, points: Math.max(m.home_score, m.away_score) });
      await bumpTeam(loser, { win: false, points: Math.min(m.home_score, m.away_score) });
    } else {
      await bumpTeam(m.home_team_id, { points: m.home_score });
      await bumpTeam(m.away_team_id, { points: m.away_score });
    }
  }
}
async function bumpTeam(teamId, { win, points = 0 }) {
  const { data: t } = await supabase.from('teams').select('wins, losses, total_points').eq('id', teamId).single();
  await supabase.from('teams').update({
    wins: (t.wins || 0) + (win === true ? 1 : 0),
    losses: (t.losses || 0) + (win === false ? 1 : 0),
    total_points: (t.total_points || 0) + points,
  }).eq('id', teamId);
}

export default router;
```
> NOTE: remove the stray `await supabase.rpc;` line — it's a placeholder marker. Implement
> `applyMatchupResults` with the read+update approach shown (no RPC).

### 4.4 Edit `server/routes/draft.js` (refactor to shared engine)
Replace the inline snake math + pick recording in the existing `POST /:leagueId/pick`
handler (`draft.js:154-231`) with a call to `draftEngine.recordPick(leagueId, teamId, playerId, false)`,
returning `{ pick, nextPick, nextRound }` on success or the mapped error
(`'Not your turn'` → 403, `'Player already drafted'` → 400, `'Draft not found'` → 404).
Keep all other endpoints. Import: `import * as draftEngine from '../lib/draftEngine.js';`.
This guarantees prod and sim share identical draft behavior.

### 4.5 Make `processWaivers.js` & `syncPlayerStats.js` callable (don't duplicate logic)
These are currently CLI scripts. Extract their core into exported functions and call those
from `dev.js`; keep the CLI behavior intact.

- In `server/scripts/processWaivers.js`: export
  `export async function processWaiversForLeague(leagueId, gameweekId) { ... }` containing
  the existing per-league claim-resolution + priority-reset logic. Have the CLI `main()` call it.
- In `server/scripts/syncPlayerStats.js`: export
  `export async function finalizeGameweek(leagueId, gameweekId) { ... }` that, for every
  `is_live=true` `player_stats` row in that gameweek, computes `raw_points` via
  `computePlayerScore` using the league's `scoring_settings`, writes it, and flips `is_live=false`.
  **Do not** call the missing `sum_team_player_points` RPC — team totals are handled by
  `applyMatchupResults` in `dev.js`.
> If extraction is risky, a simpler fallback for `finalizeGameweek` is to re-run
> `recomputeMatchupScores` only (live points already reflect events). Prefer real
> finalization if time allows.

### 4.6 Edit `server/index.js` (mount dev router, gated)
Add near the other route mounts:
```js
import devRoutes from './routes/dev.js';
// ...after existing app.use('/api/...') mounts:
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/dev', devRoutes);
  console.log('🧪 Dev simulation routes mounted at /api/dev');
}
```

---

## 5. Frontend (`index.html`)

All changes go in the inline `<script>` (1537–1766) and a small CSS/markup addition.
**Do not** add a build step. VERIFY exact container selectors by reading the referenced
line ranges before writing render functions.

### 5.1 Add a POST helper (next to `fetchAPI`, ~line 1558)
```js
async function postAPI(endpoint, body) {
  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
    return await res.json();
  } catch (e) { console.error('POST failed', endpoint, e); return null; }
}
```

### 5.2 Replace the two `load` listeners with one `bootstrap()` (rehydration — AC-5)
Remove/merge the listeners at `1577-1586` and `1753-1757`. Add:
```js
const DEV = window.location.hostname === 'localhost'
  || new URLSearchParams(location.search).has('sim');
let SIM = null; // last /api/dev/state snapshot
let livePoller = null;

async function bootstrap() {
  cachedPlayers = await loadPlayers();
  if (DEV) {
    SIM = await fetchAPI('/dev/state');
    renderDevPanel();
    routeForPhase(SIM?.phase);
  } else {
    showScreen('dashboard');
  }
}

function routeForPhase(phase) {
  if (phase === 'DRAFTING')      { showScreen('draft');     renderDraftBoard(); }
  else if (phase === 'LIVE_ACTION') { showScreen('dashboard'); startLivePolling(); }
  else if (phase === 'POST_SEASON') { showScreen('standings'); renderStandings(); }
  else                           { showScreen('dashboard'); }
}

window.addEventListener('load', bootstrap);
```

### 5.3 Dev control panel (AC-2 / triggers AC-3, AC-4)
Inject a fixed-position panel only when `DEV`. Provide CSS via an injected `<style>` and
HTML via a created element. Buttons call the dev API then refresh `SIM` and re-render.
```js
function renderDevPanel() {
  if (!DEV || document.getElementById('dev-panel')) return updateDevPanel();
  const el = document.createElement('div');
  el.id = 'dev-panel';
  el.innerHTML = `
    <div class="dp-title">🧪 SIM</div>
    <div class="dp-row" id="dp-phases">
      ${['PRE_SEASON','DRAFTING','LIVE_ACTION','MID_WEEK','POST_SEASON']
        .map(p => `<button data-phase="${p}">${p.replace('_',' ')}</button>`).join('')}
    </div>
    <div class="dp-row">
      <button id="dp-live-start">▶ Live</button>
      <button id="dp-live-stop">⏸ Live</button>
      <button id="dp-advance">⏭ Mid-Week</button>
    </div>
    <div class="dp-row">
      <button id="dp-fire">⚽ Fire goal (random starter)</button>
    </div>
    <div class="dp-status" id="dp-status"></div>`;
  document.body.appendChild(el);
  injectDevPanelStyles();

  el.querySelector('#dp-phases').addEventListener('click', async (e) => {
    const phase = e.target.dataset.phase; if (!phase) return;
    await postAPI('/dev/phase', { phase });
    SIM = await fetchAPI('/dev/state');
    routeForPhase(phase); updateDevPanel();
  });
  el.querySelector('#dp-live-start').onclick = async () => { await postAPI('/dev/live/start'); startLivePolling(); updateDevPanel(); };
  el.querySelector('#dp-live-stop').onclick  = async () => { await postAPI('/dev/live/stop'); updateDevPanel(); };
  el.querySelector('#dp-advance').onclick    = async () => { await postAPI('/dev/advance'); SIM = await fetchAPI('/dev/state'); updateDevPanel(); };
  el.querySelector('#dp-fire').onclick       = async () => { await fireRandomGoalFromClient(); };
  updateDevPanel();
}

function updateDevPanel() {
  const s = document.getElementById('dp-status'); if (!s || !SIM) return;
  s.textContent = `phase=${SIM.phase} · live=${SIM.liveSimRunning}` +
    (SIM.draft ? ` · draft R${SIM.draft.round}/P${SIM.draft.pick}${SIM.draft.isMyTurn ? ' (YOUR TURN)' : ''}` : '');
}

async function fireRandomGoalFromClient() {
  // pick a random player from cachedPlayers and fire a goal for demo
  const p = cachedPlayers[Math.floor(Math.random() * cachedPlayers.length)];
  if (p) await postAPI('/dev/live/event', { playerId: p.id, type: 'goal' });
}

function injectDevPanelStyles() {
  if (document.getElementById('dev-panel-styles')) return;
  const css = document.createElement('style');
  css.id = 'dev-panel-styles';
  css.textContent = `
    #dev-panel{position:fixed;right:12px;bottom:12px;z-index:9999;background:#111;color:#fff;
      font:12px/1.4 system-ui;padding:10px;border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.4);width:240px}
    #dev-panel .dp-title{font-weight:700;margin-bottom:6px}
    #dev-panel .dp-row{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px}
    #dev-panel button{background:#2d2d2d;color:#fff;border:1px solid #444;border-radius:6px;
      padding:4px 6px;cursor:pointer;font-size:11px}
    #dev-panel button:hover{background:#3d3d6d}
    #dev-panel .dp-status{opacity:.8;border-top:1px solid #333;padding-top:6px;font-size:11px}`;
  document.head.appendChild(css);
}
```

### 5.4 Draft interaction (AC-3)
On the Draft screen, when it's your turn, clicking a player drafts them. Add an
available-players list render and a click handler:
```js
async function renderDraftBoard() {
  const draft = await fetchAPI(`/drafts/${SIM.leagueId}`);          // existing endpoint
  // Build the board from draft.draft_picks (round/pick_number/team_id/player_id).
  // VERIFY the exact container: read index.html:1475-1527 (table.draft-tbl) and rebuild
  // its tbody innerHTML from draft.draft_picks (map player_id -> cachedPlayers name).

  // Available players to pick from:
  const available = await fetchAPI('/players/available');           // existing endpoint
  // Render available as clickable rows; on click:
  //   const r = await postAPI('/dev/draft/pick', { playerId });
  //   SIM = await fetchAPI('/dev/state'); renderDraftBoard(); updateDevPanel();
  //   (server auto-advances bots until your turn; the re-render shows all new picks)
}
```
Gate the pick action on `SIM.draft.isMyTurn` (disable rows otherwise).

### 5.5 Live scoreboard polling (AC-4)
```js
function startLivePolling() {
  if (livePoller) return;
  livePoller = setInterval(async () => {
    const state = await fetchAPI('/dev/live-state');
    if (state) renderScoreboard(state);
  }, 2500);
}
function stopLivePolling() { if (livePoller) { clearInterval(livePoller); livePoller = null; } }

function renderScoreboard(state) {
  // VERIFY container: read index.html:1135-1174 (the scoreboard list) and rebuild its
  // innerHTML from state.matchups (home/away team names + home_score/away_score).
  // Map team ids -> names via state.teams.
}
```
Both the auto-sim firehose and manual `live/event` calls land in `player_stats`/`matchups`,
so the same poll reflects both with no manual refresh.

### 5.6 Standings & Matchup wiring
- Standings: call `loadStandings(SIM.leagueId)` (already defined at `index.html:1570`) and
  rebuild the standings container (read the Standings screen markup for the exact selector).
- Matchup: use the existing `/api/matchups/:teamId/current` with `SIM.humanTeamId`.

### 5.7 Live-reload script tag (AC-5)
Inside `<head>` (or end of `<body>`), include the livereload client **only on localhost**:
```html
<script>
  if (location.hostname === 'localhost') {
    document.write('<script src="//localhost:35729/livereload.js?snipver=1"><\/script>');
  }
</script>
```
On file save, the browser refreshes and `bootstrap()` re-reads `/api/dev/state`, restoring
your phase/draft position. **Nothing is lost** because state is in the DB.

---

## 6. `fb4-test` command (AC-1)

### 6.1 New file: `scripts/fb4-test.sh`
Start from a copy of `scripts/dev-local.sh` (it already does Docker check → `supabase db reset`
→ extract creds → write `.env.local` → `npm install`). Add, before starting the backend:
```bash
# Open the app in the browser (macOS)
open "http://localhost:3001" 2>/dev/null || true

# Start the livereload watcher in the background; kill it on exit.
npx livereload index.html --port 35729 >/dev/null 2>&1 &
LR_PID=$!
trap 'kill $LR_PID 2>/dev/null' EXIT
```
The final line stays:
```bash
NODE_ENV=development node --env-file=.env.local --watch server/index.js
```
The `supabase db reset` now also applies `seed_sim.sql` (Section 3.2), so teams/matchups/
`sim_state` exist on boot.

### 6.2 Edit `package.json`
- Add script: `"fb4-test": "bash scripts/fb4-test.sh"`.
- Add devDependency: `"livereload": "^0.9.3"` (run `npm install livereload --save-dev`).

### 6.3 Make `fb4-test` runnable as a bare command
Document in `CLAUDE.md` (or print at end of the script) that the user should add a shell
alias once: `alias fb4-test="npm run --prefix /Users/dhineshraj/Claude/Projects/FB4 fb4-test"`
(or a simpler `alias fb4-test="cd <repo> && npm run fb4-test"`). The npm script is the
source of truth; the alias is convenience.

---

## 7. Verification (map each AC to a concrete check)

Run `fb4-test`. Then:

- **AC-1 (boot):** Terminal shows Docker check → Supabase reset/migrate/seed → "Local Stack
  Ready" banner → backend listening on 3001. `curl localhost:3001/api/health` → ok.
  `curl localhost:3001/api/dev/state` → `{ phase:"PRE_SEASON", humanTeamId:<uuid>, ... }`.
  In Supabase Studio (`:54323`) the `teams` table has 8 rows and `matchups` has 4.
- **AC-2 (instant phase switch):** Click each phase button in the dev panel; after each,
  `curl localhost:3001/api/dev/state` shows the new `phase` and Studio shows the expected
  status columns (per the table in Section 2).
- **AC-3 (solo draft):** Click `DRAFTING`. On the Draft screen, when it's your turn, click a
  player → the response includes `botPicks: [...]` and the board re-renders with your pick
  plus all bot picks up to your next turn. Repeat to the end; final pick sets
  `draft.complete=true` and `draft_sessions.status='complete'`.
- **AC-4 (live + mid-week):** Click `LIVE_ACTION`, then `▶ Live` → the scoreboard scores tick
  up every ~2.5s with no manual refresh. Click `⚽ Fire goal` → within one poll a team's score
  jumps. Click `⏭ Mid-Week` → the gameweek finalizes, `wins/losses/total_points` update,
  waivers process, and the next gameweek becomes `active` (verify in Studio + `/api/dev/state`).
- **AC-5 (HMR keeps place):** During a draft at round 3, edit a CSS class or JS in `index.html`
  and save → the browser auto-reloads and the dev-panel status still reads `draft R3/...`
  and the board shows all prior picks. No reset.
- **Safety:** `NODE_ENV=production node server/index.js` then
  `curl localhost:3001/api/dev/state` → `404`.

---

## 8. Implementation order (task list)

1. `supabase/seed_sim.sql` + `config.toml` seed path. Run `supabase db reset` locally; confirm
   8 teams + 4 matchups + `sim_state` rows.
2. `server/lib/draftEngine.js`; refactor `server/routes/draft.js` to use it; smoke-test the
   existing draft endpoints still work.
3. `server/lib/simEngine.js`. **First** open `server/lib/scoring.js` and align
   `EVENT_EFFECTS` + baseline `player_stats` fields to real column names.
4. Export `processWaiversForLeague` / `finalizeGameweek` from the two scripts (Section 4.5).
5. `server/routes/dev.js`; mount it gated in `server/index.js`. Test every endpoint with `curl`
   before touching the frontend.
6. Frontend: `postAPI`, `bootstrap()`/rehydration, dev panel, then wire Draft → Scoreboard →
   Standings → Matchup (in that order). Re-read the referenced `index.html` line ranges for
   exact selectors before each render function.
7. `scripts/fb4-test.sh`, `package.json` script + `livereload` dep, livereload `<script>` tag.
8. Walk the full AC checklist in Section 7.

---

## 9. Out of scope (do not build)
- Auth / real Supabase Auth users (synthetic UUIDs are intentional).
- Wiring Waivers/Trades **UI** screens (their APIs exist; the screens stay static).
- WebSockets/SSE, Vite/bundler, captain/bench scoring, FAAB.
- Any change to production behavior beyond the shared `draftEngine` refactor (which is
  behavior-preserving) and the `NODE_ENV`-gated dev router.
```

