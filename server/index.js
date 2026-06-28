import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { initSupabase } from './lib/supabase.js';
import leagueRoutes from './routes/league.js';
import teamRoutes from './routes/team.js';
import playerRoutes from './routes/player.js';
import gameweekRoutes from './routes/gameweek.js';
import matchupRoutes from './routes/matchup.js';
import draftRoutes from './routes/draft.js';
import waiverRoutes from './routes/waiver.js';
import tradeRoutes from './routes/trade.js';
import notificationRoutes from './routes/notifications.js';
import devRoutes from './routes/dev.js';

// Load env vars from .env.local if it exists (local dev), otherwise use process.env (production)
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env.local' });
}

const app = express();
const PORT = process.env.PORT || 3001;

const ALLOWED_ORIGINS = [
  'https://big-five-fantasy.vercel.app',
  'http://localhost:3001',
  'http://localhost:5173',
];

app.use(cors({
  origin: (origin, cb) => {
    // Allow server-to-server requests (no origin header) and whitelisted origins
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
}));
app.use(express.json());

// Initialize Supabase
const supabase = initSupabase();

// Make supabase available to routes
app.use((req, res, next) => {
  req.supabase = supabase;
  next();
});

// Serve the frontend. Prefer the built React app (web/dist) when it exists;
// otherwise fall back to the legacy single-file index.html at the repo root.
// (In production the canonical frontend is Vercel; this serving is a convenience
// for Railway/direct hits and local single-port use.)
const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_DIST = join(__dirname, '..', 'web', 'dist');
const FRONTEND_DIR = existsSync(WEB_DIST) ? WEB_DIST : join(__dirname, '..');
app.use(express.static(FRONTEND_DIR));
app.get('/', (req, res) => res.sendFile(join(FRONTEND_DIR, 'index.html')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/leagues', leagueRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/gameweeks', gameweekRoutes);
app.use('/api/matchups', matchupRoutes);
app.use('/api/drafts', draftRoutes);
app.use('/api/waivers', waiverRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/notifications', notificationRoutes);

if (process.env.NODE_ENV !== 'production') {
  app.use('/api/dev', devRoutes);
  console.log('🧪 Dev simulation routes mounted at /api/dev');
}

// SPA fallback: non-API GETs serve index.html so React Router handles routing
// on deep links / refreshes. Only active when serving the built React app.
if (FRONTEND_DIR === WEB_DIST) {
  app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(join(WEB_DIST, 'index.html')));
}

// Error handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Big Five Fantasy API running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health`);
});
