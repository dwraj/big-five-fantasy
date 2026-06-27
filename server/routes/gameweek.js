import express from 'express';

const router = express.Router();

// GET /api/gameweeks/current
router.get('/current', async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('gameweeks')
      .select('*')
      .eq('status', 'active')
      .limit(1);

    if (error) throw error;
    res.json(data?.[0] || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/gameweeks/:leagueId/:number
router.get('/:leagueId/:number', async (req, res) => {
  try {
    const { leagueId, number } = req.params;
    const { data, error } = await req.supabase
      .from('gameweeks')
      .select('*')
      .eq('league_id', leagueId)
      .eq('number', number)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/gameweeks/:leagueId/schedule
router.get('/:leagueId/schedule', async (req, res) => {
  try {
    const { leagueId } = req.params;
    const { data, error } = await req.supabase
      .from('gameweeks')
      .select('*')
      .eq('league_id', leagueId)
      .order('number', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
