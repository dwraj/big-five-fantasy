# Big Five Fantasy — Data Model & Backend Architecture

This document describes the complete data model and backend architecture for Big Five Fantasy, built to support live scoring, seasonal sync jobs, and all core fantasy game flows with minimal external API usage.

## Quick Start

```bash
# 1. Set up the database schema
npm run setup:db

# Then run the SQL from setupDb.js in your Supabase SQL editor

# 2. Sync clubs and players (one-time or season start)
npm run sync:players

# 3. Sync fixture calendar
npm run sync:fixtures

# 4. Start the server
npm run dev

# 5. Optional: during live match windows, run live scoring
npm run sync:live

# 6. Post-gameweek, finalize stats
npm run sync:stats

# 7. Weekly injury updates
npm run sync:injuries

# 8. On waiver day, process claims
npm run process:waivers
```

---

## Database Schema

### Core Tables

#### `leagues`
League configuration and scoring settings.
```
id UUID, name TEXT, commissioner_id UUID, season TEXT
draft_status, scoring_settings JSONB, waiver_day TEXT, trade_deadline_gw INT
max_teams INT, roster_size INT, starting_xi_size INT
waiver_type TEXT, faab_budget INT
```

#### `teams`
Fantasy teams in a league.
```
id UUID, league_id UUID, user_id UUID (→ profiles.id)
name TEXT, logo_url TEXT
wins INT, losses INT, gameweek_points INT, total_points INT
```

#### `profiles`
User profile data (extends Supabase Auth).
```
id UUID (= auth.users.id), username TEXT UNIQUE, avatar_url TEXT, timezone TEXT
```

#### `clubs`
Real-world football clubs. Synced from API-Football.
```
id INT, name TEXT, short_name TEXT, logo_url TEXT
league_api_id INT, season INT
```

#### `fixtures`
Real-world match schedule. Backbone of live scoring.
```
id INT, league_api_id INT, season INT
home_club_id INT, away_club_id INT (→ clubs.id)
kickoff_at TIMESTAMPTZ, status TEXT (NS|LIVE|HT|FT|PST|CANC)
elapsed INT, home_score INT, away_score INT
gameweek_number INT, synced_at TIMESTAMPTZ
```

**Key Index:** `(status, kickoff_at)` for live/upcoming fixture lookup.

#### `players`
Player master data.
```
id UUID, external_api_id TEXT UNIQUE (API-Football ID)
name TEXT, position TEXT (G|D|M|F)
club_id INT (→ clubs.id), league_api_id INT, nationality TEXT, birth_date DATE
status TEXT (active|inactive), image_url TEXT
injury_status TEXT (injured|doubtful|suspended), injury_return_gw INT
form NUMERIC(4,2), season_points INT, ownership_pct NUMERIC(5,2)
```

**Indexes:**
- `status` (filtered: active only) — for available player lists
- `club_id` — for roster lookups by club

#### `gameweeks`
Fantasy gameweeks per league.
```
id UUID, league_id UUID
number INT, start_date DATE, end_date DATE
deadline TIMESTAMPTZ, transfer_deadline TIMESTAMPTZ
status TEXT (upcoming|active|complete)
```

#### `rosters`
Player ownership. Many-to-many: teams ↔ players.
```
id UUID, team_id UUID, player_id UUID
acquisition_type TEXT (draft|waiver|free_agent|trade)
acquired_at TIMESTAMPTZ
```

**Index:** `player_id` — to find who owns a player in a league.

#### `lineups`
Team lineup selections per gameweek.
```
id UUID, team_id UUID, gameweek_id UUID, player_id UUID
is_starter BOOLEAN
```

Unique constraint: `(team_id, gameweek_id, player_id)`.

#### `player_stats`
Individual player performance per fixture.
```
id UUID, player_id UUID, gameweek_id UUID, fixture_id INT
minutes INT, goals INT, assists INT, clean_sheet BOOLEAN
saves INT, tackles INT, interceptions INT
yellow_cards INT, red_cards INT, bonus_pts INT
raw_points INT (computed fantasy score)
is_live BOOLEAN (true during match, false after final)
passes_accuracy INT, key_passes INT, dribbles INT, fouls_committed INT, own_goals INT
penalty_missed INT, penalty_scored INT, shots_on_target INT, rating NUMERIC(3,1)
```

**Unique Constraint:** `(player_id, fixture_id)` — one stat row per player per match.
**Indexes:**
- `(gameweek_id, player_id)` — for summing team scores
- `fixture_id` — for fixture stat lookups

#### `matchups`
Head-to-head matchups between two teams in a gameweek.
```
id UUID, gameweek_id UUID
home_team_id UUID, away_team_id UUID (→ teams.id)
home_score INT, away_score INT (cached sum of starters' raw_points)
status TEXT (upcoming|active|complete)
winner_team_id UUID (← teams.id)
```

**Unique Constraint:** `(gameweek_id, home_team_id, away_team_id)`.

#### `league_gameweek_fixtures`
Many-to-many: maps real-world fixtures to fantasy gameweeks.
```
id UUID, league_id UUID, gameweek_id UUID, fixture_id INT
```

Used because a GW might span multiple real-world fixtures per player.

---

### Draft Tables

#### `draft_sessions`
Snake draft state per league.
```
id UUID, league_id UUID UNIQUE
status TEXT (pending|active|paused|complete)
current_round INT, current_pick INT
pick_timer_secs INT (default 90)
started_at TIMESTAMPTZ, completed_at TIMESTAMPTZ
```

#### `draft_order`
Pre-computed snake order.
```
id UUID, draft_id UUID, team_id UUID
slot INT (1 = first pick overall)
```

**Unique Constraint:** `(draft_id, slot)`.

#### `draft_picks`
Full pick history (append-only).
```
id UUID, draft_id UUID, team_id UUID, player_id UUID
round INT, pick_number INT (1-N overall)
is_auto BOOLEAN
picked_at TIMESTAMPTZ
```

**Unique Constraints:**
- `(draft_id, pick_number)` — one pick per slot
- `(draft_id, player_id)` — player only drafted once

---

### Waiver & Trade Tables

#### `waivers`
Waiver claim queue.
```
id UUID, league_id UUID, team_id UUID
player_id UUID (claiming), drop_player_id UUID (dropping)
priority INT, status TEXT (pending|processed|failed)
type TEXT (waiver|free_agent)
processed_at TIMESTAMPTZ
```

#### `waiver_priorities`
Persistent waiver order per gameweek.
```
id UUID, league_id UUID, team_id UUID
priority INT (lower = higher priority)
gameweek_id UUID
```

**Unique Constraint:** `(league_id, team_id, gameweek_id)`.

#### `trade_offers`
Trade proposals.
```
id UUID, league_id UUID
proposing_team_id UUID, receiving_team_id UUID
status TEXT (pending|accepted|rejected|withdrawn|expired)
expires_at TIMESTAMPTZ, created_at TIMESTAMPTZ, resolved_at TIMESTAMPTZ
```

#### `trade_players`
Many-to-many: players involved in each trade.
```
id UUID, trade_id UUID, player_id UUID
direction TEXT (to_proposer|to_receiver)
```

---

### Audit & Notification Tables

#### `transactions`
Append-only audit log of all roster moves.
```
id UUID, league_id UUID, team_id UUID
type TEXT (draft|waiver|free_agent|trade|drop)
player_in_id UUID, player_out_id UUID (nullable)
gameweek_id UUID, notes TEXT
created_at TIMESTAMPTZ
```

**Index:** `(league_id, created_at)` — for activity logs.

#### `notifications`
In-app notifications.
```
id UUID, user_id UUID, type TEXT
payload JSONB (flexible: trade_id, waiver_id, etc.)
is_read BOOLEAN, created_at TIMESTAMPTZ
```

**Index:** `(user_id, is_read)` filtered to unread only.

---

## Scoring Engine

Scoring rules are stored in `leagues.scoring_settings` (JSONB). Canonical schema:

```json
{
  "goal_gk": 10,
  "goal_def": 7,
  "goal_mid": 5,
  "goal_fwd": 4,
  "assist": 3,
  "clean_sheet_gk": 6,
  "clean_sheet_def": 4,
  "clean_sheet_mid": 1,
  "save_per_3": 1,
  "yellow_card": -1,
  "red_card": -3,
  "own_goal": -2,
  "penalty_miss": -2,
  "penalty_save": 5,
  "minutes_played_60": 2,
  "minutes_played_45": 1,
  "bonus": 1
}
```

**Computation:** Use `computePlayerScore(stats, scoringSettings)` from `server/lib/scoring.js`:
- Takes a player's stat line + position
- Returns integer fantasy points
- Team scores = sum of all starting players' scores per gameweek
- Matchup scores are cached in `matchups.(home|away)_score` and refreshed during live windows

---

## API Call Strategy

### Season Start (one-time)
| Job | Endpoint | API Calls | Notes |
|---|---|---|---|
| `sync:players` | `/players?league=X` (with pagination) | ~50–100 total | All 5 leagues, all pages |
| `sync:fixtures` | `/fixtures?league=X&season=Y` | 5 calls | One per league |
| Clubs synced as side-effect of player sync | `/teams?league=X` | 5 calls | Via `syncPlayers.js` |

### Weekly (Monday after GW ends)
| Job | Command | API Calls | Notes |
|---|---|---|---|
| `sync:stats` | `npm run sync:stats` | ~30–50 | One per completed fixture; reads `raw_points` |
| `sync:injuries` | `npm run sync:injuries` | 5 | One per league |
| Form + Ownership | SQL aggregation | 0 | Computed from `player_stats` + `rosters` |
| `process:waivers` | `npm run process:waivers` | 0 | Internal-only processing |

### Live Match Windows (every 60 seconds, only when matches are LIVE)
| Job | Command | API Calls | Notes |
|---|---|---|---|
| `sync:live` | `npm run sync:live` | 1 + N | 1 for live poll, 1 per live fixture with rostered players |

**Live Window Logic:**
1. Query fixtures: `status IN ('NS','LIVE','HT') AND kickoff_at BETWEEN (now-15min) AND (now+120min)`
2. If any rows found: fetch live stats, upsert `player_stats` with `is_live=true`
3. Recompute `matchups.home_score/away_score` as sum of starters' `raw_points`
4. On fixture status → 'FT': clear `is_live` flag
5. If no live fixtures: skip all API calls

**Peak usage:** ~15 simultaneous live fixtures = 16 API calls/minute. Well within RapidAPI limits.

---

## New API Routes

### Drafts
```
GET    /api/drafts/:leagueId             — get draft session + picks + order
POST   /api/drafts/:leagueId/init        — create draft session
POST   /api/drafts/:leagueId/start       — start the draft
POST   /api/drafts/:leagueId/pick        — submit a pick (snake ordering automatic)
POST   /api/drafts/:leagueId/complete    — mark draft complete
```

### Waivers
```
GET    /api/waivers/:leagueId                 — list all waiver claims
GET    /api/waivers/:leagueId/priorities      — waiver priority order (current GW)
POST   /api/waivers/:leagueId/claim           — submit waiver claim or free agent pickup
PUT    /api/waivers/:claimId/status           — update claim status (used by process:waivers)
```

### Trades
```
GET    /api/trades/:leagueId              — list all trades in league
POST   /api/trades/:leagueId/propose      — propose a trade
PUT    /api/trades/:tradeId/accept        — accept trade (processes rosters immediately)
PUT    /api/trades/:tradeId/reject        — reject trade
```

### Notifications
```
GET    /api/notifications/:userId                — fetch user's notifications
PUT    /api/notifications/:notificationId/read   — mark single as read
PUT    /api/notifications/:userId/read-all       — mark all as read
DELETE /api/notifications/:notificationId        — delete notification
```

---

## Sync Script Behavior

### `npm run sync:players`
- Fetches players from all 5 leagues with pagination
- Also syncs clubs on the way (via `getTeams`)
- Upserts on `external_api_id`, preserving existing roster assignments
- Populates: name, position, club_id, league_api_id, nationality, birth_date, image_url

### `npm run sync:fixtures`
- Fetches full fixture calendar per league
- Upserts on fixture `id` (API-Football fixture ID)
- Extracts gameweek number from `league.round` field
- Populates: home_club_id, away_club_id, kickoff_at, status, scores

### `npm run sync:live`
- Runs in 60-second intervals (should be croned)
- Queries `fixtures` for live/upcoming window
- Fetches `/fixtures/players` for each live fixture
- **Important:** Only runs if live fixtures exist; safe to call every minute
- Upserts `player_stats` with `is_live=true`, computes `raw_points` **only on finalization**
- Updates `matchups.(home|away)_score` as sum of starters' live stats

### `npm run sync:stats`
- Processes the most recent `completed` gameweek
- Computes `raw_points` for each stat line using scoring rules
- Updates `players.form` (5-GW rolling average) and `ownership_pct`
- Clears `is_live` flag on all stats for that gameweek
- Optional: calls `sum_team_player_points()` RPC to update `teams.total_points`

### `npm run sync:injuries`
- Fetches injury list from all 5 leagues
- Updates `players.injury_status` and `players.injury_return_gw`
- Clears old injury records (>7 days stale)

### `npm run process:waivers`
- Processes all `pending` waivers for leagues whose `waiver_day` is today
- Enforces priority order (lowest priority number first)
- Fails claims if player already taken or drop-player not on roster
- Resets waiver priorities based on inverse standings (worst team → priority 1)

---

## Testing Checklist

- [ ] Schema: Run `npm run setup:db` → all tables created
- [ ] Players: Run `npm run sync:players` → ~1000–2000 players synced across 5 leagues
- [ ] Fixtures: Run `npm run sync:fixtures` → ~380 fixtures per league (38 GW × 10 teams)
- [ ] Draft: Create league → init draft → start draft → submit picks via `/api/drafts/:leagueId/pick`
- [ ] Live: During live match, run `npm run sync:live` → `player_stats` updated with `is_live=true`
- [ ] Finalize: Mark GW complete → `npm run sync:stats` → scores computed, `is_live` cleared
- [ ] Waiver: Submit claim → mark GW `waiver_day` → `npm run process:waivers` → rosters updated
- [ ] Trade: Propose trade → accept via `/api/trades/:tradeId/accept` → rosters swapped

---

## Performance Notes

- **Live queries:** Indexes on `fixtures(status, kickoff_at)` and `player_stats(gameweek_id, player_id)` ensure fast lookups
- **Ownership:** Recalculated post-GW only; cached in `players.ownership_pct`
- **Form:** Calculated from last 5 `player_stats` rows; cache in `players.form`
- **Team totals:** Summed from `player_stats.raw_points` per active gameweek; optionally cached in `matchups.(home|away)_score` during live windows
- **Waivers:** Priority order reset each GW; processed in priority order (O(n) with league size ~10–20)

---

## Known Limitations & Future Work

1. **Bonus points:** Currently zeroed in player stats; would need manual assignment post-match (e.g., via official FPL API or admin panel)
2. **Injury return date:** Simple heuristic; should integrate with fixture schedule to map injury date → gameweek
3. **Trade expiry:** Set to 7 days; no auto-expiry job yet (could use separate cron)
4. **Captaincy/VC:** Not yet implemented; would need `lineups.is_captain BOOLEAN`
5. **Bench scoring:** Currently only starters count toward matchup scores; bench players have stats but don't score
6. **FAAB waivers:** Schema supports `waiver_type='faab'` but no budget assignment/tracking logic yet
