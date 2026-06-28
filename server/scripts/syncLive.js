import * as apiFootball from '../lib/apiFootball.js';
import { getSupabaseAdmin } from '../lib/supabase.js';
import { computePlayerScore } from '../lib/scoring.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = getSupabaseAdmin();

// Map API-Football positions to our position codes
function mapPosition(apiPos) {
  if (!apiPos) return null;
  const map = { 'Goalkeeper': 'G', 'Defender': 'D', 'Midfielder': 'M', 'Attacker': 'F' };
  return map[apiPos] || null;
}

async function findLiveFixtures() {
  // Query fixtures that are live or upcoming within a window:
  // - Started within last 15 minutes (to catch just-kicked-off matches)
  // - Up to 120 minutes into the match (well after full-time at 90 min)
  const now = new Date();
  const fifteenMinsAgo = new Date(now.getTime() - 15 * 60000);
  const twoHoursAfterNow = new Date(now.getTime() + 120 * 60000);

  const { data: fixtures, error } = await supabase
    .from('fixtures')
    .select('*')
    .in('status', ['NS', 'LIVE', 'HT'])
    .gte('kickoff_at', fifteenMinsAgo.toISOString())
    .lte('kickoff_at', twoHoursAfterNow.toISOString());

  if (error) {
    console.error('Error querying live fixtures:', error.message);
    return [];
  }

  return fixtures || [];
}

async function syncFixtureStats(fixture) {
  console.log(`  Syncing live stats for fixture ${fixture.id}...`);

  try {
    const playerStatsMap = await apiFootball.getFixturePlayerStats(fixture.id);

    if (!playerStatsMap || typeof playerStatsMap !== 'object') {
      console.log(`    No player stats returned for fixture ${fixture.id}`);
      return 0;
    }

    // playerStatsMap is { teamId: { playerId: statsData } }
    let synced = 0;

    for (const teamId in playerStatsMap) {
      const teamPlayers = playerStatsMap[teamId];

      for (const apiPlayerId in teamPlayers) {
        const apiStats = teamPlayers[apiPlayerId];

        // Find the player by external_api_id
        const { data: [player], error: playerError } = await supabase
          .from('players')
          .select('id, position')
          .eq('external_api_id', String(apiPlayerId))
          .single();

        if (playerError || !player) {
          console.log(`    Player ${apiPlayerId} not found in DB`);
          continue;
        }

        // Find or create the gameweek (use fixture.gameweek_number as a key)
        // For now, we'll look for the current active gameweek in any league
        const { data: [gameweek], error: gwError } = await supabase
          .from('gameweeks')
          .select('id')
          .eq('status', 'active')
          .limit(1)
          .single();

        if (gwError || !gameweek) {
          console.log(`    No active gameweek found for fixture ${fixture.id}`);
          continue;
        }

        // Map API stats to our schema
        const stats = {
          minutes: apiStats.statistics?.[0]?.minutes || 0,
          goals: apiStats.statistics?.[0]?.goals?.scored || 0,
          assists: apiStats.statistics?.[0]?.goals?.assists || 0,
          clean_sheet: apiStats.statistics?.[0]?.goals?.conceded === 0,
          saves: apiStats.statistics?.[0]?.goals?.saves || 0,
          tackles: apiStats.statistics?.[0]?.tackles?.total || 0,
          interceptions: apiStats.statistics?.[0]?.tackles?.interceptions || 0,
          yellow_cards: apiStats.statistics?.[0]?.cards?.yellow || 0,
          red_cards: apiStats.statistics?.[0]?.cards?.red || 0,
          own_goals: apiStats.statistics?.[0]?.goals?.own_goals || 0,
          penalty_missed: apiStats.statistics?.[0]?.penalty?.missed || 0,
          penalty_scored: apiStats.statistics?.[0]?.penalty?.scored || 0,
          passes_accuracy: apiStats.statistics?.[0]?.passes?.accuracy || null,
          key_passes: apiStats.statistics?.[0]?.passes?.key || 0,
          dribbles: apiStats.statistics?.[0]?.dribbles?.attempts || 0,
          fouls_committed: apiStats.statistics?.[0]?.fouls?.committed || 0,
          shots_on_target: apiStats.statistics?.[0]?.shots?.on || 0,
          rating: apiStats.statistics?.[0]?.rating || null
        };

        // Enrich with position for scoring
        stats.position = player.position || mapPosition(apiStats.player?.position);
        stats.bonus_pts = 0; // Assigned later, not from live API

        // Compute fantasy score (will be 0 or very low during live play as stats incomplete)
        stats.raw_points = 0; // Don't auto-compute during live, only on finalization

        const { error: upsertError } = await supabase
          .from('player_stats')
          .upsert({
            player_id: player.id,
            gameweek_id: gameweek.id,
            fixture_id: fixture.id,
            is_live: true,
            ...stats
          }, {
            onConflict: 'player_id,fixture_id'
          });

        if (upsertError) {
          console.error(`    Error upserting stats for player ${player.id}:`, upsertError.message);
        } else {
          synced++;
        }
      }
    }

    console.log(`    ✅ Synced ${synced} player stats for fixture ${fixture.id}`);
    return synced;
  } catch (error) {
    console.error(`  ❌ Error syncing fixture ${fixture.id}:`, error.message);
    return 0;
  }
}

async function updateMatchupScores() {
  // For each live matchup, recompute home_score and away_score as sum of player_stats
  console.log('  Updating matchup scores...');

  const { data: matchups, error: matchupError } = await supabase
    .from('matchups')
    .select(`
      id,
      gameweek_id,
      home_team_id,
      away_team_id,
      home_score,
      away_score,
      status
    `)
    .eq('status', 'active');

  if (matchupError) {
    console.error('Error querying matchups:', matchupError.message);
    return;
  }

  for (const matchup of matchups || []) {
    // Get home team starting lineup stats
    const { data: homeLineup, error: homeError } = await supabase
      .from('lineups')
      .select(`
        player_id,
        is_starter,
        player_stats(raw_points)
      `)
      .eq('team_id', matchup.home_team_id)
      .eq('gameweek_id', matchup.gameweek_id);

    // Get away team starting lineup stats
    const { data: awayLineup, error: awayError } = await supabase
      .from('lineups')
      .select(`
        player_id,
        is_starter,
        player_stats(raw_points)
      `)
      .eq('team_id', matchup.away_team_id)
      .eq('gameweek_id', matchup.gameweek_id);

    if (!homeError && !awayError) {
      const homeScore = (homeLineup || [])
        .filter(l => l.is_starter && l.player_stats)
        .reduce((sum, l) => sum + (l.player_stats.raw_points || 0), 0);

      const awayScore = (awayLineup || [])
        .filter(l => l.is_starter && l.player_stats)
        .reduce((sum, l) => sum + (l.player_stats.raw_points || 0), 0);

      if (homeScore !== matchup.home_score || awayScore !== matchup.away_score) {
        await supabase
          .from('matchups')
          .update({ home_score: homeScore, away_score: awayScore })
          .eq('id', matchup.id);

        console.log(`    ✅ Updated matchup ${matchup.id}: ${homeScore}-${awayScore}`);
      }
    }
  }
}

async function syncLive() {
  const liveFixtures = await findLiveFixtures();

  if (liveFixtures.length === 0) {
    console.log('No live or upcoming fixtures in window.');
    return;
  }

  console.log(`🔴 Found ${liveFixtures.length} live/upcoming fixtures\n`);

  let totalSynced = 0;
  for (const fixture of liveFixtures) {
    const synced = await syncFixtureStats(fixture);
    totalSynced += synced;
  }

  await updateMatchupScores();

  console.log(`\n✅ Live sync complete: ${totalSynced} player stats updated`);
}

// Run immediately if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  syncLive().catch(console.error);
}

export default syncLive;
