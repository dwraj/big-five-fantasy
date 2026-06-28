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

async function syncClubsForLeague(leagueId, leagueName) {
  console.log(`  Syncing clubs for ${leagueName}...`);
  try {
    const teams = await apiFootball.getTeams(leagueId);
    if (!Array.isArray(teams)) {
      console.log(`    No clubs returned for ${leagueName}`);
      return 0;
    }

    for (const teamData of teams) {
      const { error } = await supabase
        .from('clubs')
        .upsert({
          id: teamData.team.id,
          name: teamData.team.name,
          short_name: teamData.team.code || teamData.team.name,
          logo_url: teamData.team.logo,
          league_api_id: leagueId,
          season: 2025
        }, {
          onConflict: 'id'
        });

      if (error) {
        console.error(`    Error syncing club ${teamData.team.name}:`, error.message);
      }
    }

    console.log(`    ✅ Synced ${teams.length} clubs for ${leagueName}`);
    return teams.length;
  } catch (error) {
    console.error(`  ❌ Error syncing clubs for ${leagueName}:`, error.message);
    return 0;
  }
}

async function syncPlayersForLeague(leagueId, leagueName) {
  console.log(`  Fetching all ${leagueName} players (with pagination)...`);

  try {
    const players = await apiFootball.getPlayersAllPages(leagueId, 2025);

    if (!Array.isArray(players) || players.length === 0) {
      console.log(`    No players returned for ${leagueName}`);
      return 0;
    }

    let synced = 0;
    for (const playerData of players) {
      const player = playerData.player;
      const stats = playerData.statistics?.[0];
      const club = stats?.team;

      const { error } = await supabase
        .from('players')
        .upsert({
          external_api_id: String(player.id),
          name: player.name,
          position: player.position,
          club_id: club?.id || null,
          league_api_id: leagueId,
          nationality: player.nationality,
          birth_date: player.birth?.date || null,
          status: 'active',
          image_url: player.photo,
          season_points: 0,
          ownership_pct: 0
        }, {
          onConflict: 'external_api_id'
        });

      if (error) {
        console.error(`    Error syncing ${player.name}:`, error.message);
      } else {
        synced++;
      }
    }

    console.log(`    ✅ Synced ${synced}/${players.length} players from ${leagueName}`);
    return synced;
  } catch (error) {
    console.error(`  ❌ Error syncing ${leagueName}:`, error.message);
    return 0;
  }
}

async function syncPlayers() {
  console.log('🔄 Syncing clubs and players from API-Football...\n');

  let totalClubs = 0;
  let totalPlayers = 0;

  for (const league of LEAGUES) {
    const clubCount = await syncClubsForLeague(league.id, league.name);
    totalClubs += clubCount;

    const playerCount = await syncPlayersForLeague(league.id, league.name);
    totalPlayers += playerCount;
  }

  console.log(`\n✅ Sync complete: ${totalClubs} clubs, ${totalPlayers} players`);
}

syncPlayers().catch(console.error);
