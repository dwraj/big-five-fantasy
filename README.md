# Big Five Fantasy

A fantasy football platform for the European top 5 leagues (EPL, La Liga, Serie A, Bundesliga, Ligue 1) with cross-league player pooling, head-to-head competition, and holistic FPL-style scoring.

## Features

- **Cross-league roster building** — Pick players from all 5 leagues
- **Head-to-head matchups** — Compete weekly with other managers
- **Async snake draft** — Flexible draft with auto-pick queues
- **Waivers & trades** — Claim free agents and trade with other managers
- **Real-time scoring** — Live match updates and gameweek scoring
- **Beautiful UI** — Spring physics animations, responsive design

## Tech Stack

**Frontend**
- HTML5 + CSS3 + Vanilla JavaScript
- Tabler Icons
- Deploy to Vercel

**Backend**
- Node.js + Express
- Deploy to Railway

**Database**
- Supabase (Postgres)

**External Data**
- API-Football (api-sports.io)

## Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Start backend server
npm run dev

# In another terminal: serve frontend
python3 -m http.server 8000

# Open http://localhost:8000/index.html
```

### Environment Setup

Create `.env.local`:
```
VITE_SUPABASE_URL=https://erkwiyftgyclqctykiad.supabase.co
VITE_SUPABASE_ANON_KEY=<your-key>
VITE_API_FOOTBALL_KEY=<your-api-football-key>
```

## Project Structure

```
.
├── index.html              # Main UI (fullscreen, all 7 screens)
├── server/
│   ├── index.js           # Express server
│   ├── lib/
│   │   ├── supabase.js    # Supabase client
│   │   └── apiFootball.js # API-Football wrapper
│   ├── routes/            # API endpoints
│   │   ├── league.js
│   │   ├── team.js
│   │   ├── player.js
│   │   ├── gameweek.js
│   │   └── matchup.js
│   └── scripts/
│       ├── setupDb.js     # Database schema
│       └── syncPlayers.js # Sync players from API
├── package.json           # Dependencies
├── DEPLOY.md              # Hosting guide
└── README.md              # This file
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

## Database Schema

**Core Tables:**
- `leagues` — League configurations
- `teams` — User teams per league
- `players` — Player master data
- `gameweeks` — Gameweek schedule
- `rosters` — Player ownership
- `lineups` — Weekly starting lineups
- `player_stats` — Per-gameweek stats
- `matchups` — Head-to-head matchups
- `waivers` — Waiver claims
- `trades` — Trade history

## Deployment

See [DEPLOY.md](./DEPLOY.md) for complete hosting guide.

**TL;DR (Vercel + Railway):**
```bash
git push origin main
# Vercel auto-deploys frontend
# Railway auto-deploys backend
# Both live in ~2 minutes
```

## Data Sync

Populate your database:
```bash
# Sync all players from 5 leagues
npm run sync:players

# Sync current gameweek fixtures
npm run sync:fixtures

# Sync live scores (run during weekends)
npm run sync:live
```

## UI Screens

- **Dashboard** — Stats, current matchup, top performers
- **My Team** — Roster management, starters/bench
- **Standings** — League table, GW points on hover
- **Matchup** — Head-to-head comparison
- **Waivers** — Free agents, priority queue
- **Trades** — Trade inbox, history
- **Draft** — Async draft board, pick history

## Design System

See `Big Five Design System` docs for component library, animations, and color tokens.

**Key tokens:**
- EPL: `#6D28D9` (Purple)
- La Liga: `#DC2626` (Red)
- Serie A: `#1D4ED8` (Blue)
- Bundesliga: `#D97706` (Amber)
- Ligue 1: `#059669` (Green)

## Contributing

1. Create feature branch: `git checkout -b feature/name`
2. Commit changes: `git commit -m "feat: description"`
3. Push to branch: `git push origin feature/name`
4. Open a PR

## License

MIT

## Support

For issues, questions, or feature requests, open a GitHub issue.

---

Built with ❤️ for fantasy football fans. Deploy in 5 minutes, play forever.
