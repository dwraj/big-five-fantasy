import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initSupabase } from './lib/supabase.js';
import leagueRoutes from './routes/league.js';
import teamRoutes from './routes/team.js';
import playerRoutes from './routes/player.js';
import gameweekRoutes from './routes/gameweek.js';
import matchupRoutes from './routes/matchup.js';

dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
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
