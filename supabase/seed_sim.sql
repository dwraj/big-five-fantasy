-- supabase/seed_sim.sql
-- Local-only simulation seed. Loaded after seed.sql via config.toml.
--
-- NOTE: everything is wrapped in a single DO block on purpose. The Supabase CLI
-- seeder runs statements in pipeline mode, which pre-parses later statements
-- (GRANT/INSERT on sim_state) before the CREATE TABLE commits and fails with
-- "relation sim_state does not exist". Inside a DO block, statements execute
-- sequentially at runtime, so the dependency resolves correctly.

DO $$
DECLARE
  v_league uuid := '11111111-1111-1111-1111-111111111111';
  v_human  uuid := '00000000-0000-0000-0000-000000000001';
  v_gw1    uuid;
  v_ids    uuid[];
  i        int;
  v_uid    uuid;
BEGIN
  -- 1) Dev scratch table: holds the current phase and runtime flags.
  CREATE TABLE IF NOT EXISTS sim_state (
    key        text PRIMARY KEY,
    value      jsonb NOT NULL DEFAULT '{}'::jsonb,
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  GRANT ALL ON sim_state TO anon, authenticated;

  INSERT INTO sim_state (key, value) VALUES
    ('current_phase',    '"PRE_SEASON"'::jsonb),
    ('live_sim_running', 'false'::jsonb)
  ON CONFLICT (key) DO NOTHING;

  -- 2) Make the Local Dev League hold 8 teams.
  UPDATE leagues SET max_teams = 8 WHERE id = v_league;

  -- 3) Create 8 teams (team 1 = human) and GW1 matchups, only if not already seeded.
  IF EXISTS (SELECT 1 FROM teams WHERE league_id = v_league) THEN
    RETURN; -- already seeded
  END IF;

  FOR i IN 1..8 LOOP
    IF i = 1 THEN v_uid := v_human; ELSE v_uid := gen_random_uuid(); END IF;
    INSERT INTO teams (league_id, user_id, name, wins, losses, gameweek_points, total_points)
    VALUES (v_league, v_uid,
            CASE WHEN i = 1 THEN 'My Team' ELSE 'Bot ' || (i-1) END,
            0, 0, 0, 0);
  END LOOP;

  SELECT array_agg(id ORDER BY created_at, id) INTO v_ids
  FROM teams WHERE league_id = v_league;

  SELECT id INTO v_gw1 FROM gameweeks
  WHERE league_id = v_league AND number = 1 LIMIT 1;

  IF v_gw1 IS NOT NULL THEN
    FOR i IN 1..4 LOOP
      INSERT INTO matchups (gameweek_id, home_team_id, away_team_id, home_score, away_score, status)
      VALUES (v_gw1, v_ids[2*i-1], v_ids[2*i], 0, 0, 'upcoming');
    END LOOP;
  END IF;
END $$;

-- Expose sim_state to PostgREST's schema cache (it caches table list at boot).
NOTIFY pgrst, 'reload schema';
