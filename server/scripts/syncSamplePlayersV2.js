import axios from 'axios';
import { getSupabaseAdmin } from '../lib/supabase.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = getSupabaseAdmin();
const BUCKET = 'player-images';

// external_api_id matches what's already stored in the players table
const SAMPLE_PLAYERS = [
  { name: 'Mohamed Salah',          searchName: 'Mohamed Salah',          position: 'FWD', club: 'Liverpool',        league: 'EPL',        externalId: '278' },
  { name: 'Trent Alexander-Arnold', searchName: 'Trent Alexander-Arnold',  position: 'DEF', club: 'Liverpool',        league: 'EPL',        externalId: '203' },
  { name: 'Ruben Dias',             searchName: 'Ruben Dias',              position: 'DEF', club: 'Manchester City',   league: 'EPL',        externalId: '187' },
  { name: 'Bruno Fernandes',        searchName: 'Bruno Fernandes',         position: 'MID', club: 'Manchester United', league: 'EPL',        externalId: '260' },
  { name: 'Erling Haaland',         searchName: 'Erling Haaland',          position: 'FWD', club: 'Manchester City',   league: 'EPL',        externalId: '866' },
  { name: 'William Saliba',         searchName: 'William Saliba',          position: 'DEF', club: 'Arsenal',           league: 'EPL',        externalId: '903' },
  { name: 'Vinícius Júnior',        searchName: 'Vinicius Junior',         position: 'FWD', club: 'Real Madrid',       league: 'La Liga',    externalId: '821' },
  { name: 'Kylian Mbappé',          searchName: 'Kylian Mbappe',           position: 'FWD', club: 'Real Madrid',       league: 'La Liga',    externalId: '80'  },
  { name: 'Lionel Messi',           searchName: 'Lionel Messi',            position: 'FWD', club: 'Inter Miami',       league: 'La Liga',    externalId: '688' },
  { name: 'Daniel Carvajal',        searchName: 'Daniel Carvajal',         position: 'DEF', club: 'Real Madrid',       league: 'La Liga',    externalId: '99'  },
  { name: 'André Onana',            searchName: 'Andre Onana',             position: 'GK',  club: 'Inter Milan',       league: 'Serie A',    externalId: '881' },
  { name: 'Leon Goretzka',          searchName: 'Leon Goretzka',           position: 'MID', club: 'Bayern Munich',     league: 'Bundesliga', externalId: '259' },
  { name: 'Ousmane Dembélé',        searchName: 'Ousmane Dembele',         position: 'FWD', club: 'PSG',               league: 'Ligue 1',    externalId: '206' },
];

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some(b => b.name === BUCKET)) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
    if (error) throw new Error(`Failed to create bucket: ${error.message}`);
    console.log(`  Created storage bucket: ${BUCKET}`);
  }
}

async function fetchImageUrl(searchName) {
  const res = await axios.get('https://www.thesportsdb.com/api/v1/json/3/searchplayers.php', {
    params: { p: searchName },
    timeout: 8000,
  });
  const player = res.data?.player?.[0];
  // Prefer cutout (transparent bg), fall back to thumb
  return player?.strCutout || player?.strThumb || null;
}

async function downloadImage(url) {
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 });
  return { buffer: Buffer.from(res.data), contentType: res.headers['content-type'] || 'image/png' };
}

async function uploadToStorage(externalId, buffer, contentType) {
  const ext = contentType.includes('jpeg') ? 'jpg' : 'png';
  const path = `${externalId}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType, upsert: true });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

async function syncSamplePlayers() {
  console.log('🗄️  Ensuring storage bucket...');
  await ensureBucket();

  console.log('\n🔄 Syncing players...\n');
  let synced = 0;
  let failed = 0;

  for (const player of SAMPLE_PLAYERS) {
    try {
      process.stdout.write(`  ${player.name}... `);

      const imageUrl = await fetchImageUrl(player.searchName);
      if (!imageUrl) throw new Error('No image found on TheSportsDB');

      const { buffer, contentType } = await downloadImage(imageUrl);
      const publicUrl = await uploadToStorage(player.externalId, buffer, contentType);

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

      console.log(`✅  ${publicUrl}`);
      synced++;
    } catch (err) {
      console.log(`❌  ${err.message}`);
      failed++;
    }

    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n📊 Done: ${synced}/${SAMPLE_PLAYERS.length} synced, ${failed} failed`);
}

syncSamplePlayers().catch(console.error);
