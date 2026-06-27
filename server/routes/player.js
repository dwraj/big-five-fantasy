import express from 'express';

const router = express.Router();

// GET /api/players
router.get('/', async (req, res) => {
  try {
    const { league, status } = req.query;
    let query = req.supabase.from('players').select('*');

    if (league) query = query.eq('league', league);
    if (status) query = query.eq('status', status);

    const { data, error } = await query.limit(100);
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/players/:playerId/stats/:gameweekId
router.get('/:playerId/stats/:gameweekId', async (req, res) => {
  try {
    const { playerId, gameweekId } = req.params;
    const { data, error } = await req.supabase
      .from('player_stats')
      .select('*')
      .eq('player_id', playerId)
      .eq('gameweek_id', gameweekId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    res.json(data || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/players/available
router.get('/available', async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('players')
      .select('*, rosters(id)')
      .eq('status', 'active')
      .is('rosters.id', null)
      .limit(50);

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
