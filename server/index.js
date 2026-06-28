import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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
