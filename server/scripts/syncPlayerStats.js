import { getSupabaseAdmin } from '../lib/supabase.js';
import { computePlayerScore, getDefaultScoringSettings } from '../lib/scoring.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = getSupabaseAdmin();

async function finalizeGameweekStats(gameweekId, scoringSettings) {
  console.log(`  Finalizing stats for gameweek ${gameweekId}...`);

  // Get all player stats marked as live for this gameweek
  const { data: playerStats, error: fetchError } = await supabase
    .from('player_stats')
    .select(`
      id,
      player_id,
      minutes,
      goals,
      assists,
      clean_sheet,
      saves,
      tackles,
      interceptions,
      yellow_cards,
      red_cards,
      own_goals,
      penalty_missed,
      penalty_scored,
      bonus_pts
    `)
    .eq('gameweek_id', gameweekId)
    .eq('is_live', true);

  if (fetchError) {
    console.error(`    Error fetching live stats: ${fetchError.message}`);
    return 0;
  }

  if (!playerStats || playerStats.length === 0) {
    console.log('    No live stats found for this gameweek');
    return 0;
  }

  let finalized = 0;

  for (const stat of playerStats) {
    // Get player position
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('position')
      .eq('id', stat.player_id)
      .single();

    if (playerError || !player) {
      console.error(`    Cannot find player ${stat.player_id}`);
      continue;
    }

    // Compute fantasy points
    const statWithPosition = { ...stat, position: player.position };
    const rawPoints = computePlayerScore(statWithPosition, scoringSettings);

    // Update the stat row with finalized score and clear live flag
    const { error: updateError } = await supabase
      .from('player_stats')
      .update({
        raw_points: rawPoints,
        is_live: false
      })
      .eq('id', stat.id);

    if (updateError) {
      console.error(`    Error finalizing stat ${stat.id}:`, updateError.message);
    } else {
      finalized++;
    }
  }

  console.log(`    ✅ Finalized ${finalized}/${playerStats.length} player stats`);
  return finalized;
}

async function updatePlayerFormAndOwnership(scoringSettings) {
  console.log(`  Updating player form and ownership...`);

  // Get all players
  const { data: players, error: playerError } = await supabase
    .from('players')
    .select('id');

  if (playerError || !players) {
    console.error('Error fetching players:', playerError?.message);
    return;
  }

  for (const player of players) {
    // Get rolling 5-gameweek average
    const { data: recentStats, error: statsError } = await supabase
      .from('player_stats')
      .select('raw_points')
      .eq('player_id', player.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (!statsError && recentStats && recentStats.length > 0) {
      const avgForm = recentStats.reduce((sum, s) => sum + (s.raw_points || 0), 0) / recentStats.length;

      await supabase
        .from('players')
        .update({ form: Number(avgForm.toFixed(2)) })
        .eq('id', player.id);
    }

    // Get ownership percentage (count rosters with this player / count all active rosters)
    const { count: ownedCount } = await supabase
      .from('rosters')
      .select('*', { count: 'exact', head: true })
      .eq('player_id', player.id);

    const { count: totalTeams } = await supabase
      .from('rosters')
      .select('team_id', { count: 'exact', head: true })
      .neq('team_id', null);

    const ownershipPct = totalTeams > 0 ? ((ownedCount || 0) / totalTeams) * 100 : 0;

    await supabase
      .from('players')
      .update({ ownership_pct: Number(ownershipPct.toFixed(2)) })
      .eq('id', player.id);
  }

  console.log(`    ✅ Updated form and ownership for ${players.length} players`);
}

async function updateTeamTotals() {
  console.log(`  Updating team total points...`);

  // Get all teams
  const { data: teams, error: teamError } = await supabase
    .from('teams')
    .select('id');

  if (teamError || !teams) {
    console.error('Error fetching teams:', teamError?.message);
    return;
  }

  for (const team of teams) {
    // Sum all player_stats.raw_points where player is in this team's roster
    const { data: totalPointsData, error: pointsError } = await supabase
      .rpc('sum_team_player_points', { team_id: team.id });

    if (!pointsError && totalPointsData) {
      await supabase
        .from('teams')
        .update({ total_points: totalPointsData })
        .eq('id', team.id);
    }
  }

  console.log(`    ✅ Updated total points for ${teams.length} teams`);
}

async function syncPlayerStats() {
  console.log('🔄 Finalizing gameweek stats...\n');

  // Get the most recent gameweek
  const { data: [recentGw], error: gwError } = await supabase
    .from('gameweeks')
    .select('id, league_id')
    .eq('status', 'complete')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (gwError || !recentGw) {
    console.log('❌ No completed gameweeks found. Mark a gameweek as complete first.');
    return;
  }

  // Get league scoring settings
  const { data: [league], error: leagueError } = await supabase
    .from('leagues')
    .select('scoring_settings')
    .eq('id', recentGw.league_id)
    .single();

  const scoringSettings = league?.scoring_settings || getDefaultScoringSettings();

  await finalizeGameweekStats(recentGw.id, scoringSettings);
  await updatePlayerFormAndOwnership(scoringSettings);
  await updateTeamTotals();

  console.log('\n✅ Stats finalization complete');
}

export async function finalizeGameweek(leagueId, gameweekId) {
  const { data: league } = await supabase
    .from('leagues').select('scoring_settings').eq('id', leagueId).single();
  const scoringSettings = league?.scoring_settings || getDefaultScoringSettings();
  return finalizeGameweekStats(gameweekId, scoringSettings);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  syncPlayerStats().catch(console.error);
}
