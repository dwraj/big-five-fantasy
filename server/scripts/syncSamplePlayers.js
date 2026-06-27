import axios from 'axios';
import { getSupabaseAdmin } from '../lib/supabase.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = getSupabaseAdmin();

const API_KEY = process.env.VITE_API_FOOTBALL_KEY;
const BASE_URL = 'https://api-football-v1.p.rapidapi.com';

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'x-rapidapi-key': API_KEY,
    'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
  }
});

// Sample players from UI with their real API IDs
const SAMPLE_PLAYERS = [
  // EPL
  { name: 'Mohamed Salah', club: 'Liverpool', league: 'EPL', apiId: 278 },
  { name: 'Trent Alexander-Arnold', club: 'Liverpool', league: 'EPL', apiId: 203 },
  { name: 'Ruben Dias', club: 'Manchester City', league: 'EPL', apiId: 187 },
  { name: 'Bruno Fernandes', club: 'Manchester United', league: 'EPL', apiId: 260 },
  { name: 'Erling Haaland', club: 'Manchester City', league: 'EPL', apiId: 866 },
  { name: 'William Saliba', club: 'Arsenal', league: 'EPL', apiId: 903 },

  // La Liga
  { name: 'Vinícius Júnior', club: 'Real Madrid', league: 'La Liga', apiId: 821 },
  { name: 'Kylian Mbappé', club: 'Real Madrid', league: 'La Liga', apiId: 80 },
  { name: 'Lionel Messi', club: 'Inter Miami', league: 'La Liga', apiId: 688 },
  { name: 'Daniel Carvajal', club: 'Real Madrid', league: 'La Liga', apiId: 99 },

  // Serie A
  { name: 'André Onana', club: 'Inter Milan', league: 'Serie A', apiId: 881 },
  { name: 'Lautaro Martínez', club: 'Inter Milan', league: 'Serie A', apiId: 910 },

  // Bundesliga
  { name: 'Leon Goretzka', club: 'Bayern Munich', league: 'Bundesliga', apiId: 259 },

  // Ligue 1
  { name: 'Ousmane Dembélé', club: 'PSG', league: 'Ligue 1', apiId: 206 },
];

async function getPlayerData(playerId) {
  try {
    const response = await client.get('/players', {
      params: {
        id: playerId,
        season: 2025
      }
    });

    return response.data.response?.[0] || null;
  } catch (error) {
    console.error(`Error fetching player ${playerId}:`, error.message);
    return null;
  }
}

async function syncSamplePlayers() {
  console.log('🔄 Syncing sample players with images from API-Football...\n');

  let synced = 0;
  let failed = 0;

  for (const playerInfo of SAMPLE_PLAYERS) {
    try {
      console.log(`  Fetching: ${playerInfo.name}...`);

      // Get player data from API-Football
      const playerData = await getPlayerData(playerInfo.apiId);

      if (!playerData) {
        console.log(`    ❌ Not found in API`);
        failed++;
        continue;
      }

      const player = playerData.player;
      const stats = playerData.statistics?.[0];

      // Prepare player record
      const playerRecord = {
        external_api_id: String(player.id),
        name: player.name,
        position: player.position || stats?.position || 'MID',
        club: stats?.team?.name || playerInfo.club,
        league: playerInfo.league,
        status: 'active',
        image_url: player.photo
      };

      // Upsert into Supabase
      const { data, error } = await supabase
        .from('players')
        .upsert(playerRecord, {
          onConflict: 'external_api_id'
        });

      if (error) {
        console.log(`    ❌ Database error: ${error.message}`);
        failed++;
      } else {
        console.log(`    ✅ Synced: ${player.name}`);
        if (player.photo) console.log(`       Image: ${player.photo}`);
        synced++;
      }
    } catch (error) {
      console.error(`    ❌ Error: ${error.message}`);
      failed++;
    }

    // Rate limit: wait 200ms between requests
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`\n📊 Sync Summary:`);
  console.log(`   ✅ Synced: ${synced}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📊 Total: ${synced + failed}`);

  // Show sample of what was synced
  const { data: players, error } = await supabase
    .from('players')
    .select('name, position, club, league, image_url')
    .limit(5);

  if (!error && players?.length > 0) {
    console.log(`\n📸 Sample players in DB:`);
    players.forEach(p => {
      console.log(`   • ${p.name} (${p.position}) - ${p.club}`);
      if (p.image_url) console.log(`     🖼️  ${p.image_url}`);
    });
  }
}

syncSamplePlayers().catch(console.error);
