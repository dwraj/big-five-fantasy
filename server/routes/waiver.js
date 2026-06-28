import express from 'express';
import { getSupabaseAdmin } from '../lib/supabase.js';

const router = express.Router();
const supabase = getSupabaseAdmin();

// GET /api/waivers/:leagueId - Get all waiver claims for league
router.get('/:leagueId', async (req, res) => {
  try {
    const { leagueId } = req.params;
    const { status } = req.query;

    let query = supabase
      .from('waivers')
      .select(`
        *,
        player:player_id(name, position),
        drop_player:drop_player_id(name, position),
        team:team_id(name)
      `)
      .eq('league_id', leagueId);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: waivers, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(waivers || []);
  } catch (error) {
    console.error('Error fetching waivers:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/waivers/:leagueId/claim - Submit a waiver claim
router.post('/:leagueId/claim', async (req, res) => {
  try {
    const { leagueId } = req.params;
    const { teamId, playerId, dropPlayerId, type = 'waiver' } = req.body;

    if (!teamId || !playerId) {
      return res.status(400).json({ error: 'teamId and playerId required' });
    }

    // If it's a waiver (not free agent), dropPlayerId is required
    if (type === 'waiver' && !dropPlayerId) {
      return res.status(400).json({ error: 'dropPlayerId required for waiver claims' });
    }

    // Get current waiver priority for this team in current gameweek
    const { data: [gameweek], error: gwError } = await supabase
      .from('gameweeks')
      .select('id')
      .eq('status', 'active')
      .limit(1)
      .single();

    if (gwError || !gameweek) {
      return res.status(400).json({ error: 'No active gameweek' });
    }

    const { data: [priority], error: priorError } = await supabase
      .from('waiver_priorities')
      .select('priority')
      .eq('league_id', leagueId)
      .eq('team_id', teamId)
      .eq('gameweek_id', gameweek.id)
      .single();

    if (priorError && priorError.code !== 'PGRST116') {
      console.error('Waiver priority lookup error:', priorError);
    }

    // If free agent, bypass waiver queue (type='free_agent')
    if (type === 'free_agent') {
      // Direct add to roster
      const { error: rosterError } = await supabase
        .from('rosters')
        .insert({
          team_id: teamId,
          player_id: playerId,
          acquisition_type: 'free_agent'
        });

      if (rosterError && !rosterError.message.includes('duplicate')) {
        return res.status(400).json({ error: rosterError.message });
      }

      // Log transaction
      await supabase
        .from('transactions')
        .insert({
          league_id: leagueId,
          team_id: teamId,
          type: 'free_agent',
          player_in_id: playerId,
          gameweek_id: gameweek.id
        });

      return res.json({ status: 'claimed', type: 'free_agent' });
    }

    // Waiver claim: add to queue
    const { data: claim, error: claimError } = await supabase
      .from('waivers')
      .insert({
        league_id: leagueId,
        team_id: teamId,
        player_id: playerId,
        drop_player_id: dropPlayerId,
        priority: priority?.priority || 0,
        status: 'pending',
        type: 'waiver'
      })
      .select()
      .single();

    if (claimError) {
      return res.status(400).json({ error: claimError.message });
    }

    res.json({ claim, queued: true });
  } catch (error) {
    console.error('Error submitting claim:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/waivers/:leagueId/priorities - Get waiver priorities for current gameweek
router.get('/:leagueId/priorities', async (req, res) => {
  try {
    const { leagueId } = req.params;

    const { data: [gameweek], error: gwError } = await supabase
      .from('gameweeks')
      .select('id')
      .eq('status', 'active')
      .limit(1)
      .single();

    if (gwError || !gameweek) {
      return res.status(400).json({ error: 'No active gameweek' });
    }

    const { data: priorities, error } = await supabase
      .from('waiver_priorities')
      .select('*, team:team_id(name)')
      .eq('league_id', leagueId)
      .eq('gameweek_id', gameweek.id)
      .order('priority', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(priorities || []);
  } catch (error) {
    console.error('Error fetching priorities:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/waivers/:claimId/status - Update waiver claim status
router.put('/:claimId/status', async (req, res) => {
  try {
    const { claimId } = req.params;
    const { status, processedAt } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'status required' });
    }

    const { data: claim, error } = await supabase
      .from('waivers')
      .update({
        status,
        processed_at: processedAt || new Date().toISOString()
      })
      .eq('id', claimId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (status === 'processed' && claim.drop_player_id) {
      // Add to roster
      await supabase
        .from('rosters')
        .insert({
          team_id: claim.team_id,
          player_id: claim.player_id,
          acquisition_type: 'waiver'
        });

      // Remove from roster
      await supabase
        .from('rosters')
        .delete()
        .eq('team_id', claim.team_id)
        .eq('player_id', claim.drop_player_id);

      // Log transaction
      const { data: [gameweek] } = await supabase
        .from('gameweeks')
        .select('id')
        .eq('status', 'active')
        .limit(1)
        .single();

      await supabase
        .from('transactions')
        .insert({
          league_id: claim.league_id,
          team_id: claim.team_id,
          type: 'waiver',
          player_in_id: claim.player_id,
          player_out_id: claim.drop_player_id,
          gameweek_id: gameweek?.id
        });
    }

    res.json(claim);
  } catch (error) {
    console.error('Error updating claim:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
