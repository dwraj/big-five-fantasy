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

async function syncPlayers() {
  console.log('🔄 Syncing players from API-Football...');

  for (const league of LEAGUES) {
    console.log(`  Fetching ${league.name} players...`);

    try {
      const players = await apiFootball.getPlayers(league.id, league.season);

      if (!Array.isArray(players)) {
        console.log(`    No players returned for ${league.name}`);
        continue;
      }

      for (const playerData of players) {
        const player = playerData.player;
        const { data, error } = await supabase
          .from('players')
          .upsert({
            external_api_id: String(player.id),
            name: player.name,
            position: player.position,
            club: playerData.statistics?.[0]?.team?.name || 'Unknown',
            league: league.name,
            status: 'active',
            image_url: player.photo
          }, {
            onConflict: 'external_api_id'
          });

        if (error) {
          console.error(`    Error syncing ${player.name}:`, error.message);
        }
      }

      console.log(`    ✅ Synced ${players.length} players from ${league.name}`);
    } catch (error) {
      console.error(`  ❌ Error syncing ${league.name}:`, error.message);
    }
  }

  console.log('✅ Player sync complete');
}

syncPlayers().catch(console.error);
