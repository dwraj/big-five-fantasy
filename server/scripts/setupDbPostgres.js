import pkg from 'pg';
import dotenv from 'dotenv';

const { Client } = pkg;
dotenv.config({ path: '.env.local' });

const connectionString = process.env.SUPABASE_DB_URL;

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
`;

async function setupDb() {
  const client = new Client({ connectionString });

  try {
    console.log('🔧 Connecting to Supabase PostgreSQL...');
    await client.connect();
    console.log('✅ Connected!\n');

    console.log('📝 Creating tables...');
    await client.query(SQL);
    console.log('✅ Tables created successfully!\n');

    // Verify
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'players'
    `);

    if (result.rows.length > 0) {
      console.log('✨ Database is ready!');
      console.log('   Table: players');
      console.log(`   Status: Ready for data sync`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

setupDb();
