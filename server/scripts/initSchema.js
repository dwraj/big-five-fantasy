import { getSupabaseAdmin } from '../lib/supabase.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = getSupabaseAdmin();

const schema = `
-- Profiles (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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
  max_teams INT DEFAULT 10,
  roster_size INT DEFAULT 25,
  starting_xi_size INT DEFAULT 11,
  waiver_type TEXT DEFAULT 'reverse_standings',
  faab_budget INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clubs (real-world football teams)
CREATE TABLE IF NOT EXISTS clubs (
  id INT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT,
  logo_url TEXT,
  league_api_id INT,
  season INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fixtures (real-world matches)
CREATE TABLE IF NOT EXISTS fixtures (
  id INT PRIMARY KEY,
  league_api_id INT NOT NULL,
  season INT NOT NULL,
  home_club_id INT REFERENCES clubs(id),
  away_club_id INT REFERENCES clubs(id),
  kickoff_at TIMESTAMPTZ NOT NULL,
  status TEXT,
  elapsed INT,
  home_score INT,
  away_score INT,
  gameweek_number INT,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gameweeks
CREATE TABLE IF NOT EXISTS gameweeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  number INT NOT NULL,
  start_date DATE,
  end_date DATE,
  deadline TIMESTAMPTZ,
  transfer_deadline TIMESTAMPTZ,
  status TEXT DEFAULT 'upcoming',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- League-Gameweek-Fixture mapping (many-to-many)
CREATE TABLE IF NOT EXISTS league_gameweek_fixtures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  gameweek_id UUID NOT NULL REFERENCES gameweeks(id) ON DELETE CASCADE,
  fixture_id INT NOT NULL REFERENCES fixtures(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_id, gameweek_id, fixture_id)
);

-- Players
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_api_id TEXT UNIQUE,
  name TEXT NOT NULL,
  position TEXT,
  club_id INT REFERENCES clubs(id),
  league_api_id INT,
  nationality TEXT,
  birth_date DATE,
  status TEXT DEFAULT 'active',
  image_url TEXT,
  injury_status TEXT,
  injury_return_gw INT,
  form NUMERIC(4,2),
  season_points INT DEFAULT 0,
  ownership_pct NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rosters
CREATE TABLE IF NOT EXISTS rosters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  acquisition_type TEXT,
  acquired_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, player_id)
);

-- Lineups
CREATE TABLE IF NOT EXISTS lineups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  gameweek_id UUID NOT NULL REFERENCES gameweeks(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  is_starter BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, gameweek_id, player_id)
);

-- Player Stats
CREATE TABLE IF NOT EXISTS player_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  gameweek_id UUID NOT NULL REFERENCES gameweeks(id) ON DELETE CASCADE,
  fixture_id INT NOT NULL REFERENCES fixtures(id) ON DELETE CASCADE,
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
  is_live BOOLEAN DEFAULT FALSE,
  passes_accuracy INT,
  key_passes INT,
  dribbles INT,
  fouls_committed INT,
  own_goals INT,
  penalty_missed INT,
  penalty_scored INT,
  shots_on_target INT,
  rating NUMERIC(3,1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, fixture_id)
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
  winner_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(gameweek_id, home_team_id, away_team_id)
);

-- Waivers
CREATE TABLE IF NOT EXISTS waivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  drop_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  priority INT,
  status TEXT DEFAULT 'pending',
  type TEXT DEFAULT 'waiver',
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Waiver Priorities
CREATE TABLE IF NOT EXISTS waiver_priorities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  priority INT NOT NULL,
  gameweek_id UUID NOT NULL REFERENCES gameweeks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_id, team_id, gameweek_id)
);

-- Trade Offers
CREATE TABLE IF NOT EXISTS trade_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  proposing_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  receiving_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Trade Players (many-to-many)
CREATE TABLE IF NOT EXISTS trade_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES trade_offers(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  direction TEXT NOT NULL
);

-- Draft Sessions
CREATE TABLE IF NOT EXISTS draft_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID UNIQUE NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  current_round INT DEFAULT 1,
  current_pick INT DEFAULT 1,
  pick_timer_secs INT DEFAULT 90,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Draft Order
CREATE TABLE IF NOT EXISTS draft_order (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES draft_sessions(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  slot INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(draft_id, slot)
);

-- Draft Picks
CREATE TABLE IF NOT EXISTS draft_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES draft_sessions(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  round INT NOT NULL,
  pick_number INT NOT NULL,
  is_auto BOOLEAN DEFAULT FALSE,
  picked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(draft_id, pick_number),
  UNIQUE(draft_id, player_id)
);

-- Transactions (audit log)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  player_in_id UUID REFERENCES players(id) ON DELETE SET NULL,
  player_out_id UUID REFERENCES players(id) ON DELETE SET NULL,
  gameweek_id UUID REFERENCES gameweeks(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_teams_league_id ON teams(league_id);
CREATE INDEX IF NOT EXISTS idx_teams_user_id ON teams(user_id);
CREATE INDEX IF NOT EXISTS idx_rosters_team_id ON rosters(team_id);
CREATE INDEX IF NOT EXISTS idx_rosters_player ON rosters(player_id);
CREATE INDEX IF NOT EXISTS idx_lineups_team_id ON lineups(team_id);
CREATE INDEX IF NOT EXISTS idx_lineups_gameweek_id ON lineups(gameweek_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_player_id ON player_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_gw ON player_stats(gameweek_id, player_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_fixture ON player_stats(fixture_id);
CREATE INDEX IF NOT EXISTS idx_matchups_gameweek_id ON matchups(gameweek_id);
CREATE INDEX IF NOT EXISTS idx_players_status ON players(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_fixtures_live ON fixtures(status, kickoff_at) WHERE status IN ('NS', 'LIVE', 'HT');
CREATE INDEX IF NOT EXISTS idx_fixtures_season ON fixtures(season, league_api_id);
CREATE INDEX IF NOT EXISTS idx_draft_picks_number ON draft_picks(draft_id, pick_number);
CREATE INDEX IF NOT EXISTS idx_waivers_league ON waivers(league_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_league_gameweek_fixtures ON league_gameweek_fixtures(league_id, gameweek_id);
CREATE INDEX IF NOT EXISTS idx_transactions_league ON transactions(league_id, created_at);
`;

async function initSchema() {
  console.log('🔧 Initializing database schema via Supabase admin client...\n');

  try {
    // Execute the schema creation
    const { data, error } = await supabase.rpc('exec', { sql: schema });

    if (error) {
      // If RPC doesn't exist, try raw query
      console.log('Note: rpc method not available, attempting direct query execution...');
      // For direct execution, we'd need a different approach
      // For now, print the SQL
      console.log('❌ Schema creation failed. Please run the following SQL in Supabase editor:');
      console.log('\n' + schema);
      return;
    }

    console.log('✅ Database schema initialized successfully!');
    console.log('\nTables created:');
    console.log('  Core: profiles, leagues, teams, clubs, fixtures, gameweeks, players');
    console.log('  Rosters: rosters, lineups, player_stats, matchups');
    console.log('  Drafts: draft_sessions, draft_order, draft_picks');
    console.log('  Waivers: waivers, waiver_priorities');
    console.log('  Trades: trade_offers, trade_players');
    console.log('  Audit: transactions, notifications');
    console.log('\nIndexes created for optimal query performance.');
  } catch (error) {
    console.error('Error initializing schema:', error.message);
    console.log('\n⚠️  Schema RPC not available. Please run the SQL manually in Supabase:');
    console.log('https://app.supabase.com/project/_/sql\n');
    console.log(schema);
  }
}

initSchema().catch(console.error);
