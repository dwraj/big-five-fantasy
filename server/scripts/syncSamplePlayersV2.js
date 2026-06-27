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

// Sample players with manual image URLs (fallback approach)
const SAMPLE_PLAYERS = [
  {
    name: 'Mohamed Salah',
    position: 'FWD',
    club: 'Liverpool',
    league: 'EPL',
    externalId: '278',
    image: 'https://media.api-sports.io/players/278.png'
  },
  {
    name: 'Trent Alexander-Arnold',
    position: 'DEF',
    club: 'Liverpool',
    league: 'EPL',
    externalId: '203',
    image: 'https://media.api-sports.io/players/203.png'
  },
  {
    name: 'Ruben Dias',
    position: 'DEF',
    club: 'Manchester City',
    league: 'EPL',
    externalId: '187',
    image: 'https://media.api-sports.io/players/187.png'
  },
  {
    name: 'Bruno Fernandes',
    position: 'MID',
    club: 'Manchester United',
    league: 'EPL',
    externalId: '260',
    image: 'https://media.api-sports.io/players/260.png'
  },
  {
    name: 'Erling Haaland',
    position: 'FWD',
    club: 'Manchester City',
    league: 'EPL',
    externalId: '866',
    image: 'https://media.api-sports.io/players/866.png'
  },
  {
    name: 'William Saliba',
    position: 'DEF',
    club: 'Arsenal',
    league: 'EPL',
    externalId: '903',
    image: 'https://media.api-sports.io/players/903.png'
  },
  {
    name: 'Vinícius Júnior',
    position: 'FWD',
    club: 'Real Madrid',
    league: 'La Liga',
    externalId: '821',
    image: 'https://media.api-sports.io/players/821.png'
  },
  {
    name: 'Kylian Mbappé',
    position: 'FWD',
    club: 'Real Madrid',
    league: 'La Liga',
    externalId: '80',
    image: 'https://media.api-sports.io/players/80.png'
  },
  {
    name: 'Lionel Messi',
    position: 'FWD',
    club: 'Inter Miami',
    league: 'La Liga',
    externalId: '688',
    image: 'https://media.api-sports.io/players/688.png'
  },
  {
    name: 'Daniel Carvajal',
    position: 'DEF',
    club: 'Real Madrid',
    league: 'La Liga',
    externalId: '99',
    image: 'https://media.api-sports.io/players/99.png'
  },
  {
    name: 'André Onana',
    position: 'GK',
    club: 'Inter Milan',
    league: 'Serie A',
    externalId: '881',
    image: 'https://media.api-sports.io/players/881.png'
  },
  {
    name: 'Leon Goretzka',
    position: 'MID',
    club: 'Bayern Munich',
    league: 'Bundesliga',
    externalId: '259',
    image: 'https://media.api-sports.io/players/259.png'
  },
  {
    name: 'Ousmane Dembélé',
    position: 'FWD',
    club: 'PSG',
    league: 'Ligue 1',
    externalId: '206',
    image: 'https://media.api-sports.io/players/206.png'
  }
];

async function syncSamplePlayers() {
  console.log('🔄 Syncing sample players with images...\n');

  let synced = 0;
  let failed = 0;

  for (const player of SAMPLE_PLAYERS) {
    try {
      console.log(`  Syncing: ${player.name} (${player.league})...`);

      const { data, error } = await supabase
        .from('players')
        .upsert({
          external_api_id: player.externalId,
          name: player.name,
          position: player.position,
          club: player.club,
          league: player.league,
          status: 'active',
          image_url: player.image
        }, {
          onConflict: 'external_api_id'
        });

      if (error) {
        console.log(`    ❌ Database error: ${error.message}`);
        failed++;
      } else {
        console.log(`    ✅ ${player.name}`);
        console.log(`       🖼️  ${player.image}`);
        synced++;
      }
    } catch (error) {
      console.error(`    ❌ Error: ${error.message}`);
      failed++;
    }

    // Rate limiting: wait 300ms between requests
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  console.log(`\n📊 Sync Summary:`);
  console.log(`   ✅ Synced: ${synced}/${SAMPLE_PLAYERS.length}`);
  console.log(`   ❌ Failed: ${failed}/${SAMPLE_PLAYERS.length}`);

  // Verify in database
  const { data: players, error } = await supabase
    .from('players')
    .select('name, position, club, league, image_url')
    .order('league')
    .limit(20);

  if (!error && players?.length > 0) {
    console.log(`\n📸 Players in Database:`);
    players.forEach(p => {
      console.log(`   • ${p.name} (${p.position}) - ${p.club} [${p.league}]`);
    });
    console.log(`\n   Total players: ${players.length}`);
  }
}

syncSamplePlayers().catch(console.error);
