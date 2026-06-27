import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const SQL = `
-- Players table
CREATE TABLE IF NOT EXISTS public.players (
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_players_external_api_id ON public.players(external_api_id);
CREATE INDEX IF NOT EXISTS idx_players_league ON public.players(league);

-- Enable RLS and create policies
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.players;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.players;
DROP POLICY IF EXISTS "Enable update for all users" ON public.players;

CREATE POLICY "Enable read access for all users"
  ON public.players FOR SELECT
  USING (true);

CREATE POLICY "Enable insert for all users"
  ON public.players FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Enable update for all users"
  ON public.players FOR UPDATE
  USING (true);
`;

async function createTables() {
  console.log('🔧 Creating database tables...\n');

  try {
    // Execute SQL via rpc
    const { data, error } = await supabase.rpc('exec', {
      sql: SQL
    });

    if (error) {
      console.log('ℹ️  Note: RPC method not available (expected). Using alternative approach...\n');

      // Alternative: Try creating tables one by one
      console.log('Creating players table...');
      const { error: createError } = await supabase.from('players').select('count(*)').limit(0);

      if (createError && createError.code === 'PGRST116') {
        console.log('❌ Players table does not exist.');
        console.log('\n⚠️  Please create the table manually in Supabase SQL Editor:\n');
        console.log(SQL);
        process.exit(1);
      } else if (!createError) {
        console.log('✅ Players table already exists!');
      }
    } else {
      console.log('✅ Tables created successfully!');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n📋 Please run this SQL in Supabase SQL Editor manually:\n');
    console.log(SQL);
    process.exit(1);
  }
}

createTables().catch(console.error);
