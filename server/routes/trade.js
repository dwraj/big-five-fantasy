import express from 'express';
import { getSupabaseAdmin } from '../lib/supabase.js';

const router = express.Router();
const supabase = getSupabaseAdmin();

// GET /api/trades/:leagueId - Get all trades for league
router.get('/:leagueId', async (req, res) => {
  try {
    const { leagueId } = req.params;
    const { status } = req.query;

    let query = supabase
      .from('trade_offers')
      .select(`
        *,
        proposing_team:proposing_team_id(name),
        receiving_team:receiving_team_id(name),
        trade_players(*)
      `)
      .eq('league_id', leagueId);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: trades, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Fetch full player details for each trade
    const tradesWithPlayers = await Promise.all((trades || []).map(async (trade) => {
      const playerIds = trade.trade_players.map(tp => tp.player_id);
      const { data: players } = await supabase
        .from('players')
        .select('id, name, position')
        .in('id', playerIds);

      return {
        ...trade,
        trade_players: trade.trade_players.map(tp => ({
          ...tp,
          player: players?.find(p => p.id === tp.player_id)
        }))
      };
    }));

    res.json(tradesWithPlayers);
  } catch (error) {
    console.error('Error fetching trades:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/trades/:leagueId/propose - Propose a trade
router.post('/:leagueId/propose', async (req, res) => {
  try {
    const { leagueId } = req.params;
    const { proposingTeamId, receivingTeamId, proposedPlayers, receivedPlayers } = req.body;

    if (!proposingTeamId || !receivingTeamId) {
      return res.status(400).json({ error: 'Both team IDs required' });
    }

    if (!proposedPlayers || !receivedPlayers) {
      return res.status(400).json({ error: 'Player lists required' });
    }

    // Get league for expiry window
    const { data: [league], error: leagueError } = await supabase
      .from('leagues')
      .select('trade_deadline_gw')
      .eq('id', leagueId)
      .single();

    if (leagueError) {
      return res.status(400).json({ error: 'League not found' });
    }

    // Default 7-day expiry
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: trade, error: tradeError } = await supabase
      .from('trade_offers')
      .insert({
        league_id: leagueId,
        proposing_team_id: proposingTeamId,
        receiving_team_id: receivingTeamId,
        status: 'pending',
        expires_at: expiresAt
      })
      .select()
      .single();

    if (tradeError) {
      return res.status(400).json({ error: tradeError.message });
    }

    // Record players going to receiver
    const receiverPlayers = proposedPlayers.map(playerId => ({
      trade_id: trade.id,
      player_id: playerId,
      direction: 'to_receiver'
    }));

    // Record players going to proposer
    const proposerPlayers = receivedPlayers.map(playerId => ({
      trade_id: trade.id,
      player_id: playerId,
      direction: 'to_proposer'
    }));

    const { error: playersError } = await supabase
      .from('trade_players')
      .insert([...receiverPlayers, ...proposerPlayers]);

    if (playersError) {
      return res.status(400).json({ error: playersError.message });
    }

    // Create notification for receiving team
    const { data: [receivingTeam] } = await supabase
      .from('teams')
      .select('user_id')
      .eq('id', receivingTeamId)
      .single();

    if (receivingTeam) {
      await supabase
        .from('notifications')
        .insert({
          user_id: receivingTeam.user_id,
          type: 'trade_offer',
          payload: {
            trade_id: trade.id,
            proposing_team_id: proposingTeamId
          }
        });
    }

    res.json({ trade, playersRecorded: receiverPlayers.length + proposerPlayers.length });
  } catch (error) {
    console.error('Error proposing trade:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/trades/:tradeId/accept - Accept a trade
router.put('/:tradeId/accept', async (req, res) => {
  try {
    const { tradeId } = req.params;

    const { data: trade, error: tradeError } = await supabase
      .from('trade_offers')
      .select('*')
      .eq('id', tradeId)
      .single();

    if (tradeError || !trade) {
      return res.status(404).json({ error: 'Trade not found' });
    }

    // Fetch trade players
    const { data: tradePlayersData } = await supabase
      .from('trade_players')
      .select('*')
      .eq('trade_id', tradeId);

    // Update rosters: remove old players, add new ones
    const toReceiver = tradePlayersData?.filter(tp => tp.direction === 'to_receiver') || [];
    const toProposer = tradePlayersData?.filter(tp => tp.direction === 'to_proposer') || [];

    // Receiver gets the proposed players, loses the received players
    for (const tp of toReceiver) {
      await supabase.from('rosters').insert({
        team_id: trade.receiving_team_id,
        player_id: tp.player_id,
        acquisition_type: 'trade'
      });
    }

    for (const tp of toProposer) {
      await supabase
        .from('rosters')
        .delete()
        .eq('team_id', trade.receiving_team_id)
        .eq('player_id', tp.player_id);
    }

    // Proposer gets the received players, loses the proposed players
    for (const tp of toProposer) {
      await supabase.from('rosters').insert({
        team_id: trade.proposing_team_id,
        player_id: tp.player_id,
        acquisition_type: 'trade'
      });
    }

    for (const tp of toReceiver) {
      await supabase
        .from('rosters')
        .delete()
        .eq('team_id', trade.proposing_team_id)
        .eq('player_id', tp.player_id);
    }

    // Update trade status
    const { data: updatedTrade, error: updateError } = await supabase
      .from('trade_offers')
      .update({
        status: 'accepted',
        resolved_at: new Date().toISOString()
      })
      .eq('id', tradeId)
      .select()
      .single();

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    // Log transactions for both teams
    const { data: [gameweek] } = await supabase
      .from('gameweeks')
      .select('id')
      .eq('status', 'active')
      .limit(1)
      .single();

    const leagueId = trade.league_id;

    for (const tp of toReceiver) {
      await supabase.from('transactions').insert({
        league_id: leagueId,
        team_id: trade.receiving_team_id,
        type: 'trade',
        player_in_id: tp.player_id,
        gameweek_id: gameweek?.id
      });
    }

    for (const tp of toProposer) {
      await supabase.from('transactions').insert({
        league_id: leagueId,
        team_id: trade.receiving_team_id,
        type: 'trade',
        player_out_id: tp.player_id,
        gameweek_id: gameweek?.id
      });
    }

    res.json(updatedTrade);
  } catch (error) {
    console.error('Error accepting trade:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/trades/:tradeId/reject - Reject a trade
router.put('/:tradeId/reject', async (req, res) => {
  try {
    const { tradeId } = req.params;

    const { data: trade, error } = await supabase
      .from('trade_offers')
      .update({
        status: 'rejected',
        resolved_at: new Date().toISOString()
      })
      .eq('id', tradeId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(trade);
  } catch (error) {
    console.error('Error rejecting trade:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
