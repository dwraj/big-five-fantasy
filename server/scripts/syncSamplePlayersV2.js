import axios from 'axios';
import { getSupabaseAdmin } from '../lib/supabase.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = getSupabaseAdmin();
const BUCKET = 'player-images';
const API_KEY = process.env.VITE_API_FOOTBALL_KEY;
const MEDIA_BASE = 'https://media.api-sports.io/football/players';

const SAMPLE_PLAYERS = [
  { name: 'Mohamed Salah',          position: 'FWD', club: 'Liverpool',        league: 'EPL',        externalId: '278' },
  { name: 'Trent Alexander-Arnold', position: 'DEF', club: 'Liverpool',        league: 'EPL',        externalId: '203' },
  { name: 'Ruben Dias',             position: 'DEF', club: 'Manchester City',   league: 'EPL',        externalId: '187' },
  { name: 'Bruno Fernandes',        position: 'MID', club: 'Manchester United', league: 'EPL',        externalId: '260' },
  { name: 'Erling Haaland',         position: 'FWD', club: 'Manchester City',   league: 'EPL',        externalId: '866' },
  { name: 'William Saliba',         position: 'DEF', club: 'Arsenal',           league: 'EPL',        externalId: '903' },
  { name: 'Vinícius Júnior',        position: 'FWD', club: 'Real Madrid',       league: 'La Liga',    externalId: '821' },
  { name: 'Kylian Mbappé',          position: 'FWD', club: 'Real Madrid',       league: 'La Liga',    externalId: '80'  },
  { name: 'Lionel Messi',           position: 'FWD', club: 'Inter Miami',       league: 'La Liga',    externalId: '688' },
  { name: 'Daniel Carvajal',        position: 'DEF', club: 'Real Madrid',       league: 'La Liga',    externalId: '99'  },
  { name: 'André Onana',            position: 'GK',  club: 'Inter Milan',       league: 'Serie A',    externalId: '881' },
  { name: 'Leon Goretzka',          position: 'MID', club: 'Bayern Munich',     league: 'Bundesliga', externalId: '259' },
  { name: 'Ousmane Dembélé',        position: 'FWD', club: 'PSG',               league: 'Ligue 1',    externalId: '206' },
];

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some(b => b.name === BUCKET)) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
    if (error) throw new Error(`Failed to create bucket: ${error.message}`);
    console.log(`  Created storage bucket: ${BUCKET}`);
  }
}

async function downloadAndStore(externalId) {
  // Image calls are free and don't count toward quota
  const url = `${MEDIA_BASE}/${externalId}.png`;
  const res = await axios.get(url, {
    headers: { 'x-apisports-key': API_KEY },
    responseType: 'arraybuffer',
    timeout: 10000,
  });

  const buffer = Buffer.from(res.data);
  const contentType = res.headers['content-type'] || 'image/png';
  const path = `${externalId}.png`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType, upsert: true });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

async function syncSamplePlayers() {
  console.log('🗄️  Ensuring storage bucket...');
  await ensureBucket();

  console.log('\n🔄 Syncing player images from api-sports.io media CDN...\n');
  let synced = 0;
  let failed = 0;

  for (const player of SAMPLE_PLAYERS) {
    try {
      process.stdout.write(`  ${player.name}... `);

      const publicUrl = await downloadAndStore(player.externalId);

      const { error } = await supabase
        .from('players')
        .upsert({
          external_api_id: player.externalId,
          name: player.name,
          position: player.position,
          club: player.club,
          league: player.league,
          status: 'active',
          image_url: publicUrl,
        }, { onConflict: 'external_api_id' });

      if (error) throw new Error(error.message);

      console.log(`✅`);
      synced++;
    } catch (err) {
      console.log(`❌  ${err.message}`);
      failed++;
    }

    // Small delay to respect per-second rate limit on image CDN
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n📊 Done: ${synced}/${SAMPLE_PLAYERS.length} synced, ${failed} failed`);
}

syncSamplePlayers().catch(console.error);
