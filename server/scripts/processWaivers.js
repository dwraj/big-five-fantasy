import { getSupabaseAdmin } from '../lib/supabase.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = getSupabaseAdmin();

async function processLeagueWaivers(leagueId) {
  console.log(`  Processing waivers for league ${leagueId}...`);

  try {
    // Get all pending waivers for this league, ordered by priority (lowest = highest)
    const { data: pendingWaivers, error: waiverError } = await supabase
      .from('waivers')
      .select('*')
      .eq('league_id', leagueId)
      .eq('status', 'pending')
      .eq('type', 'waiver')
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true });

    if (waiverError) {
      console.error(`    Error fetching waivers:`, waiverError.message);
      return 0;
    }

    if (!pendingWaivers || pendingWaivers.length === 0) {
      console.log(`    No pending waivers for league ${leagueId}`);
      return 0;
    }

    // Track which players have been claimed this round
    const claimedPlayers = new Set();
    const droppedPlayers = new Set();
    let processed = 0;

    for (const waiver of pendingWaivers) {
      // Check if player already claimed by someone else this round
      if (claimedPlayers.has(waiver.player_id)) {
        // Waiver fails: player already taken
        await supabase
          .from('waivers')
          .update({
            status: 'failed',
            processed_at: new Date().toISOString()
          })
          .eq('id', waiver.id);

        continue;
      }

      // Check if drop player still on roster (in case they were dropped elsewhere)
      const { data: dropRoster } = await supabase
        .from('rosters')
        .select('id')
        .eq('team_id', waiver.team_id)
        .eq('player_id', waiver.drop_player_id)
        .single();

      if (!dropRoster) {
        // Waiver fails: can't drop player not on roster
        await supabase
          .from('waivers')
          .update({
            status: 'failed',
            processed_at: new Date().toISOString()
          })
          .eq('id', waiver.id);

        continue;
      }

      // All checks passed: process the claim
      // Add player to roster
      const { error: addError } = await supabase
        .from('rosters')
        .insert({
          team_id: waiver.team_id,
          player_id: waiver.player_id,
          acquisition_type: 'waiver'
        });

      if (addError && !addError.message.includes('duplicate')) {
        console.error(`    Error adding player to roster:`, addError.message);
        continue;
      }

      // Remove dropped player from roster
      const { error: dropError } = await supabase
        .from('rosters')
        .delete()
        .eq('team_id', waiver.team_id)
        .eq('player_id', waiver.drop_player_id);

      if (dropError) {
        console.error(`    Error dropping player:`, dropError.message);
        continue;
      }

      // Mark waiver as processed
      await supabase
        .from('waivers')
        .update({
          status: 'processed',
          processed_at: new Date().toISOString()
        })
        .eq('id', waiver.id);

      // Log transaction
      const { data: [activeGw] } = await supabase
        .from('gameweeks')
        .select('id')
        .eq('status', 'active')
        .limit(1)
        .single();

      await supabase
        .from('transactions')
        .insert({
          league_id: leagueId,
          team_id: waiver.team_id,
          type: 'waiver',
          player_in_id: waiver.player_id,
          player_out_id: waiver.drop_player_id,
          gameweek_id: activeGw?.id
        });

      claimedPlayers.add(waiver.player_id);
      droppedPlayers.add(waiver.drop_player_id);
      processed++;
    }

    // Reset waiver priorities for next round
    const { data: [activeGw] } = await supabase
      .from('gameweeks')
      .select('id')
      .eq('status', 'active')
      .limit(1)
      .single();

    if (activeGw) {
      // Delete old priorities
      await supabase
        .from('waiver_priorities')
        .delete()
        .eq('league_id', leagueId)
        .eq('gameweek_id', activeGw.id);

      // Reorder priorities based on inverse of standings (worst team gets first priority)
      const { data: standings } = await supabase
        .from('teams')
        .select('id')
        .eq('league_id', leagueId)
        .order('total_points', { ascending: true });

      if (standings && standings.length > 0) {
        const newPriorities = standings.map((team, idx) => ({
          league_id: leagueId,
          team_id: team.id,
          priority: idx + 1,
          gameweek_id: activeGw.id
        }));

        await supabase
          .from('waiver_priorities')
          .insert(newPriorities);
      }
    }

    console.log(`    ✅ Processed ${processed}/${pendingWaivers.length} waivers`);
    return processed;
  } catch (error) {
    console.error(`  ❌ Error processing waivers:`, error.message);
    return 0;
  }
}

async function processWaivers() {
  console.log('🔄 Processing pending waiver claims...\n');

  // Get all leagues
  const { data: leagues, error: leagueError } = await supabase
    .from('leagues')
    .select('id, waiver_day');

  if (leagueError || !leagues) {
    console.error('Error fetching leagues:', leagueError?.message);
    return;
  }

  // Filter to leagues whose waiver_day is today
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const leaguesToProcess = leagues.filter(l => l.waiver_day?.toLowerCase() === today.toLowerCase());

  if (leaguesToProcess.length === 0) {
    console.log(`Today is ${today}. No leagues have waivers due today.`);
    return;
  }

  let totalProcessed = 0;
  for (const league of leaguesToProcess) {
    const count = await processLeagueWaivers(league.id);
    totalProcessed += count;
  }

  console.log(`\n✅ Waiver processing complete: ${totalProcessed} claims processed`);
}

export async function processWaiversForLeague(leagueId, _gameweekId) {
  return processLeagueWaivers(leagueId);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  processWaivers().catch(console.error);
}
