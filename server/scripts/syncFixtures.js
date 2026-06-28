import * as apiFootball from '../lib/apiFootball.js';
import { getSupabaseAdmin } from '../lib/supabase.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = getSupabaseAdmin();

const LEAGUES = [
  { id: 39, name: 'EPL', season: 2025 },
  { id: 140, name: 'La Liga', season: 2025 },
  { id: 135, name: 'Serie A', season: 2025 },
  { id: 78, name: 'Bundesliga', season: 2025 },
  { id: 61, name: 'Ligue 1', season: 2025 }
];

async function syncFixturesForLeague(leagueId, leagueName) {
  console.log(`  Fetching fixtures for ${leagueName}...`);

  try {
    const fixtures = await apiFootball.getFixtures(leagueId, 2025);

    if (!Array.isArray(fixtures) || fixtures.length === 0) {
      console.log(`    No fixtures returned for ${leagueName}`);
      return 0;
    }

    let synced = 0;
    for (const fixtureData of fixtures) {
      const fixture = fixtureData.fixture;
      const league = fixtureData.league;

      const { error } = await supabase
        .from('fixtures')
        .upsert({
          id: fixture.id,
          league_api_id: leagueId,
          season: 2025,
          home_club_id: fixtureData.teams?.home?.id || null,
          away_club_id: fixtureData.teams?.away?.id || null,
          kickoff_at: fixture.date,
          status: fixture.status,
          elapsed: fixture.timestamp ? Math.floor((Date.now() - fixture.timestamp * 1000) / 60000) : null,
          home_score: fixtureData.goals?.home,
          away_score: fixtureData.goals?.away,
          gameweek_number: league.round ? parseInt(league.round.split('-')[0]) : null,
          synced_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (error) {
        console.error(`    Error syncing fixture ${fixture.id}:`, error.message);
      } else {
        synced++;
      }
    }

    console.log(`    ✅ Synced ${synced}/${fixtures.length} fixtures for ${leagueName}`);
    return synced;
  } catch (error) {
    console.error(`  ❌ Error syncing ${leagueName}:`, error.message);
    return 0;
  }
}

async function syncFixtures() {
  console.log('🔄 Syncing fixtures from API-Football...\n');

  let totalFixtures = 0;

  for (const league of LEAGUES) {
    const count = await syncFixturesForLeague(league.id, league.name);
    totalFixtures += count;
  }

  console.log(`\n✅ Fixture sync complete: ${totalFixtures} fixtures`);
}

syncFixtures().catch(console.error);
