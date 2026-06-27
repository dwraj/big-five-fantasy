import { getSupabaseAdmin } from '../lib/supabase.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = getSupabaseAdmin();

const schema = `
-- Users (Supabase Auth will handle this)

-- Leagues
CREATE TABLE IF NOT EXISTS leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  commissioner_id UUID NOT NULL,
  season TEXT NOT NULL,
  draft_status TEXT DEFAULT 'pending',
  scoring_settings JSONB,
  waiver_day TEXT,
  trade_deadline_gw INT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Teams
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  logo_url TEXT,
  wins INT DEFAULT 0,
  losses INT DEFAULT 0,
  gameweek_points INT DEFAULT 0,
  total_points INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Players
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_api_id TEXT UNIQUE,
  name TEXT NOT NULL,
  position TEXT,
  club TEXT,
  league TEXT,
  status TEXT DEFAULT 'active',
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Gameweeks
CREATE TABLE IF NOT EXISTS gameweeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  number INT NOT NULL,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'upcoming',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Rosters
CREATE TABLE IF NOT EXISTS rosters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  acquisition_type TEXT,
  acquired_at TIMESTAMP DEFAULT NOW()
);

-- Lineups
CREATE TABLE IF NOT EXISTS lineups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  gameweek_id UUID NOT NULL REFERENCES gameweeks(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  is_starter BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Player Stats
CREATE TABLE IF NOT EXISTS player_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  gameweek_id UUID NOT NULL REFERENCES gameweeks(id) ON DELETE CASCADE,
  minutes INT,
  goals INT,
  assists INT,
  clean_sheet BOOLEAN,
  saves INT,
  tackles INT,
  interceptions INT,
  yellow_cards INT,
  red_cards INT,
  bonus_pts INT,
  raw_points INT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Matchups
CREATE TABLE IF NOT EXISTS matchups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gameweek_id UUID NOT NULL REFERENCES gameweeks(id) ON DELETE CASCADE,
  home_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  away_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  home_score INT DEFAULT 0,
  away_score INT DEFAULT 0,
  status TEXT DEFAULT 'upcoming',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Waivers
CREATE TABLE IF NOT EXISTS waivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  priority INT,
  status TEXT DEFAULT 'pending',
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Trades
CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  proposing_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  receiving_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  accepted_at TIMESTAMP,
  rejected_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Trade Players (many-to-many)
CREATE TABLE IF NOT EXISTS trade_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  direction TEXT NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_teams_league_id ON teams(league_id);
CREATE INDEX IF NOT EXISTS idx_rosters_team_id ON rosters(team_id);
CREATE INDEX IF NOT EXISTS idx_rosters_player_id ON rosters(player_id);
CREATE INDEX IF NOT EXISTS idx_lineups_team_id ON lineups(team_id);
CREATE INDEX IF NOT EXISTS idx_lineups_gameweek_id ON lineups(gameweek_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_player_id ON player_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_gameweek_id ON player_stats(gameweek_id);
CREATE INDEX IF NOT EXISTS idx_matchups_gameweek_id ON matchups(gameweek_id);
`;

async function setupDatabase() {
  console.log('🔧 Setting up database schema...');

  // Note: You'll need to run this SQL directly in Supabase SQL Editor
  // as the Supabase JS client doesn't support schema creation
  console.log(`
⚠️  Please run the following SQL in your Supabase SQL Editor:
https://app.supabase.com/project/_/sql

${schema}

This script is a placeholder. For production, use Supabase migrations.
  `);
}

setupDatabase().catch(console.error);
