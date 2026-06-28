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

// Map injury types to status codes
function mapInjuryStatus(fixtureDate) {
  // Simple logic: if injury date is in past, player might be back soon
  // In real implementation, you'd check against gameweek schedule
  const injuryDate = new Date(fixtureDate);
  const now = new Date();
  const weeksSinceInjury = (now - injuryDate) / (7 * 24 * 60 * 60 * 1000);

  if (weeksSinceInjury < 1) return 'injured';
  if (weeksSinceInjury < 2) return 'doubtful';
  return null; // Likely back
}

async function syncInjuriesForLeague(leagueId, leagueName) {
  console.log(`  Fetching injuries for ${leagueName}...`);

  try {
    const injuries = await apiFootball.getInjuries(leagueId, 2025);

    if (!Array.isArray(injuries) || injuries.length === 0) {
      console.log(`    No injuries found for ${leagueName}`);
      return 0;
    }

    let synced = 0;

    for (const injuryData of injuries) {
      const player = injuryData.player;

      // Find player by external_api_id
      const { data: [dbPlayer], error: playerError } = await supabase
        .from('players')
        .select('id')
        .eq('external_api_id', String(player.id))
        .single();

      if (playerError || !dbPlayer) {
        console.log(`    Player ${player.id} not in DB, skipping`);
        continue;
      }

      // Map injury reason to status
      const reason = injuryData.reason || '';
      let injuryStatus = 'injured';
      if (reason.toLowerCase().includes('suspend')) {
        injuryStatus = 'suspended';
      } else if (reason.toLowerCase().includes('doubt')) {
        injuryStatus = 'doubtful';
      }

      // Try to estimate return GW (would need fixture schedule integration)
      const returnDate = injuryData.fixture?.date;
      let returnGw = null;
      if (returnDate) {
        // This is simplified; in production, map fixture date to actual gameweek
        // For now, assume return in 2-4 weeks
        returnGw = Math.ceil(Math.random() * 3) + 2;
      }

      const { error: updateError } = await supabase
        .from('players')
        .update({
          injury_status: injuryStatus,
          injury_return_gw: returnGw
        })
        .eq('id', dbPlayer.id);

      if (updateError) {
        console.error(`    Error updating player ${player.id}:`, updateError.message);
      } else {
        synced++;
      }
    }

    console.log(`    ✅ Updated ${synced} player injuries for ${leagueName}`);
    return synced;
  } catch (error) {
    console.error(`  ❌ Error syncing injuries for ${leagueName}:`, error.message);
    return 0;
  }
}

async function clearOldInjuries() {
  console.log(`  Clearing recovered injuries...`);

  // Simple heuristic: clear injury status for players where we haven't seen updates
  const { error } = await supabase
    .from('players')
    .update({
      injury_status: null,
      injury_return_gw: null
    })
    .not('injury_status', 'is', null)
    .lt('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  if (!error) {
    console.log(`    ✅ Cleared old injury records`);
  } else {
    console.error(`    Error clearing injuries:`, error.message);
  }
}

async function syncInjuries() {
  console.log('🔄 Syncing injury status from API-Football...\n');

  let totalUpdated = 0;

  for (const league of LEAGUES) {
    const count = await syncInjuriesForLeague(league.id, league.name);
    totalUpdated += count;
  }

  await clearOldInjuries();

  console.log(`\n✅ Injury sync complete: ${totalUpdated} players updated`);
}

syncInjuries().catch(console.error);
