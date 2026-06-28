-- ============================================================
-- Big Five Fantasy — Local Dev Seed Data
-- ============================================================

-- Grant full access to anon and authenticated roles for local dev (no RLS)
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;

-- Clubs (21 clubs across 5 leagues)
INSERT INTO clubs (id, name, short_name, league_api_id, season) VALUES
  (33,  'Manchester United',     'MAN', 39,  2025),
  (34,  'Liverpool',             'LIV', 39,  2025),
  (35,  'Manchester City',       'MCI', 39,  2025),
  (36,  'Chelsea',               'CHE', 39,  2025),
  (37,  'Arsenal',               'ARS', 39,  2025),
  (38,  'Tottenham',             'TOT', 39,  2025),
  (39,  'Brighton',              'BHA', 39,  2025),
  (40,  'Aston Villa',           'AVL', 39,  2025),
  (541, 'Real Madrid',           'RMA', 140, 2025),
  (542, 'Barcelona',             'FCB', 140, 2025),
  (543, 'Atletico Madrid',       'ATM', 140, 2025),
  (544, 'Valencia',              'VAL', 140, 2025),
  (497, 'Juventus',              'JUV', 135, 2025),
  (498, 'AC Milan',              'MIL', 135, 2025),
  (499, 'Inter Milan',           'INT', 135, 2025),
  (500, 'Roma',                  'ROM', 135, 2025),
  (165, 'Bayern Munich',         'BAY', 78,  2025),
  (166, 'Borussia Dortmund',     'BVB', 78,  2025),
  (167, 'Bayer Leverkusen',      'B04', 78,  2025),
  (85,  'Paris Saint-Germain',   'PSG', 61,  2025),
  (86,  'Olympique Marseille',   'OM',  61,  2025)
ON CONFLICT (id) DO NOTHING;

-- Players (60 deterministic players across all clubs)
INSERT INTO players (external_api_id, name, position, club_id, league_api_id, nationality, birth_date, status, season_points, ownership_pct) VALUES
  -- Man United (39)
  ('1',  'Andre Onana',       'G', 33, 39,  'Cameroonian',  '1996-04-02', 'active', 42, 18.5),
  ('2',  'Lisandro Martinez', 'D', 33, 39,  'Argentine',    '1998-01-18', 'active', 55, 32.1),
  ('3',  'Bruno Fernandes',   'M', 33, 39,  'Portuguese',   '1994-09-08', 'active', 98, 61.4),
  ('4',  'Marcus Rashford',   'F', 33, 39,  'English',      '1997-10-31', 'active', 71, 44.2),
  -- Liverpool
  ('5',  'Alisson Becker',    'G', 34, 39,  'Brazilian',    '1992-10-02', 'active', 68, 41.3),
  ('6',  'Virgil Van Dijk',   'D', 34, 39,  'Dutch',        '1991-07-08', 'active', 82, 53.7),
  ('7',  'Mohamed Salah',     'F', 34, 39,  'Egyptian',     '1992-06-15', 'active', 142, 78.9),
  ('8',  'Trent Alexander-Arnold', 'D', 34, 39, 'English',  '1998-10-07', 'active', 91, 56.2),
  -- Man City
  ('9',  'Ederson',           'G', 35, 39,  'Brazilian',    '1993-08-17', 'active', 61, 35.8),
  ('10', 'Ruben Dias',        'D', 35, 39,  'Portuguese',   '1997-05-14', 'active', 74, 47.1),
  ('11', 'Kevin De Bruyne',   'M', 35, 39,  'Belgian',      '1991-06-28', 'active', 118, 69.3),
  ('12', 'Erling Haaland',    'F', 35, 39,  'Norwegian',    '2000-07-21', 'active', 156, 82.4),
  -- Chelsea
  ('13', 'Robert Sanchez',    'G', 36, 39,  'Spanish',      '1997-11-18', 'active', 38, 15.2),
  ('14', 'Reece James',       'D', 36, 39,  'English',      '1999-12-08', 'active', 64, 38.6),
  ('15', 'Cole Palmer',       'M', 36, 39,  'English',      '2002-05-06', 'active', 131, 74.5),
  ('16', 'Nicolas Jackson',   'F', 36, 39,  'Senegalese',   '2001-06-20', 'active', 88, 52.1),
  -- Arsenal
  ('17', 'David Raya',        'G', 37, 39,  'Spanish',      '1995-09-15', 'active', 71, 43.2),
  ('18', 'William Saliba',    'D', 37, 39,  'French',       '2001-03-24', 'active', 86, 51.7),
  ('19', 'Bukayo Saka',       'M', 37, 39,  'English',      '2001-09-05', 'active', 127, 72.8),
  ('20', 'Kai Havertz',       'F', 37, 39,  'German',       '1999-06-11', 'active', 94, 58.3),
  -- Tottenham
  ('21', 'Guglielmo Vicario', 'G', 38, 39,  'Italian',      '1996-10-07', 'active', 55, 28.4),
  ('22', 'Micky van de Ven',  'D', 38, 39,  'Dutch',        '2001-04-19', 'active', 69, 41.6),
  ('23', 'James Maddison',    'M', 38, 39,  'English',      '1996-11-23', 'active', 103, 63.9),
  ('24', 'Son Heung-min',     'F', 38, 39,  'South Korean', '1992-07-08', 'active', 109, 66.2),
  -- Brighton
  ('25', 'Bart Verbruggen',   'G', 39, 39,  'Dutch',        '2002-08-18', 'active', 44, 19.8),
  ('26', 'Lewis Dunk',        'D', 39, 39,  'English',      '1991-11-21', 'active', 58, 32.4),
  ('27', 'Kaoru Mitoma',      'M', 39, 39,  'Japanese',     '1997-05-20', 'active', 96, 59.1),
  -- Aston Villa
  ('28', 'Emiliano Martinez', 'G', 40, 39,  'Argentine',    '1992-09-02', 'active', 74, 46.3),
  ('29', 'Ollie Watkins',     'F', 40, 39,  'English',      '1995-12-30', 'active', 121, 70.5),
  ('30', 'Leon Bailey',       'M', 40, 39,  'Jamaican',     '1997-08-09', 'active', 84, 49.7),
  -- Real Madrid (140)
  ('31', 'Thibaut Courtois',  'G', 541, 140, 'Belgian',     '1992-05-11', 'active', 79, 48.2),
  ('32', 'Dani Carvajal',     'D', 541, 140, 'Spanish',     '1992-01-11', 'active', 88, 53.4),
  ('33', 'Luka Modric',       'M', 541, 140, 'Croatian',    '1985-09-09', 'active', 102, 62.7),
  ('34', 'Vinicius Junior',   'F', 541, 140, 'Brazilian',   '2000-07-12', 'active', 138, 77.3),
  ('35', 'Jude Bellingham',   'M', 541, 140, 'English',     '2003-06-29', 'active', 145, 80.1),
  -- Barcelona
  ('36', 'Marc-Andre ter Stegen', 'G', 542, 140, 'German',  '1992-04-30', 'active', 65, 39.8),
  ('37', 'Ronald Araujo',     'D', 542, 140, 'Uruguayan',   '1999-03-07', 'active', 71, 43.1),
  ('38', 'Pedri',             'M', 542, 140, 'Spanish',     '2002-11-25', 'active', 115, 67.4),
  ('39', 'Robert Lewandowski','F', 542, 140, 'Polish',      '1988-08-21', 'active', 132, 75.6),
  -- Atletico Madrid
  ('40', 'Jan Oblak',         'G', 543, 140, 'Slovenian',   '1993-01-07', 'active', 72, 44.5),
  ('41', 'Antoine Griezmann', 'F', 543, 140, 'French',      '1991-03-21', 'active', 118, 69.8),
  -- Juventus (135)
  ('42', 'Wojciech Szczesny', 'G', 497, 135, 'Polish',      '1990-04-18', 'active', 58, 31.2),
  ('43', 'Dusan Vlahovic',    'F', 497, 135, 'Serbian',     '2000-01-28', 'active', 104, 63.5),
  ('44', 'Federico Chiesa',   'M', 497, 135, 'Italian',     '1997-10-25', 'active', 89, 54.1),
  -- AC Milan
  ('45', 'Mike Maignan',      'G', 498, 135, 'French',      '1995-07-03', 'active', 69, 42.3),
  ('46', 'Rafael Leao',       'F', 498, 135, 'Portuguese',  '1999-06-10', 'active', 116, 68.9),
  -- Inter Milan
  ('47', 'Yann Sommer',       'G', 499, 135, 'Swiss',       '1988-12-17', 'active', 74, 46.7),
  ('48', 'Lautaro Martinez',  'F', 499, 135, 'Argentine',   '1997-08-22', 'active', 129, 73.4),
  -- Bayern Munich (78)
  ('49', 'Manuel Neuer',      'G', 165, 78,  'German',      '1986-03-27', 'active', 62, 37.8),
  ('50', 'Joshua Kimmich',    'D', 165, 78,  'German',      '1995-02-08', 'active', 97, 60.2),
  ('51', 'Leroy Sane',        'M', 165, 78,  'German',      '1996-01-11', 'active', 106, 64.8),
  ('52', 'Harry Kane',        'F', 165, 78,  'English',     '1993-07-28', 'active', 148, 81.3),
  -- Borussia Dortmund
  ('53', 'Gregor Kobel',      'G', 166, 78,  'Swiss',       '1997-12-06', 'active', 51, 24.6),
  ('54', 'Julian Brandt',     'M', 166, 78,  'German',      '1996-05-02', 'active', 88, 53.2),
  -- PSG (61)
  ('55', 'Gianluigi Donnarumma', 'G', 85, 61, 'Italian',   '1999-02-25', 'active', 66, 40.1),
  ('56', 'Marquinhos',        'D', 85, 61,  'Brazilian',    '1994-05-14', 'active', 79, 48.6),
  ('57', 'Ousmane Dembele',   'F', 85, 61,  'French',      '1997-05-15', 'active', 112, 66.3),
  ('58', 'Kylian Mbappe',     'F', 541, 140, 'French',     '1998-12-20', 'active', 0,  0.0),
  -- Marseille
  ('59', 'Pau Lopez',         'G', 86, 61,  'Spanish',      '1994-12-13', 'active', 47, 22.1),
  ('60', 'Pierre-Emerick Aubameyang', 'F', 86, 61, 'Gabonese', '1989-06-18', 'active', 83, 50.4)
ON CONFLICT (external_api_id) DO NOTHING;

-- Fixtures (10 per league = 50 total, mix of FT and upcoming)
INSERT INTO fixtures (id, league_api_id, season, home_club_id, away_club_id, kickoff_at, status, elapsed, home_score, away_score, gameweek_number) VALUES
  -- EPL GW1-5
  (1,  39, 2025, 34, 35, NOW() - INTERVAL '28 days', 'FT',  90, 2, 1, 1),
  (2,  39, 2025, 37, 33, NOW() - INTERVAL '28 days', 'FT',  90, 3, 0, 1),
  (3,  39, 2025, 36, 38, NOW() - INTERVAL '28 days', 'FT',  90, 1, 1, 1),
  (4,  39, 2025, 40, 39, NOW() - INTERVAL '28 days', 'FT',  90, 2, 2, 1),
  (5,  39, 2025, 35, 37, NOW() - INTERVAL '21 days', 'FT',  90, 0, 2, 2),
  (6,  39, 2025, 33, 36, NOW() - INTERVAL '21 days', 'FT',  90, 1, 2, 2),
  (7,  39, 2025, 38, 34, NOW() - INTERVAL '21 days', 'FT',  90, 1, 3, 2),
  (8,  39, 2025, 39, 40, NOW() - INTERVAL '14 days', 'FT',  90, 0, 1, 3),
  (9,  39, 2025, 34, 37, NOW() - INTERVAL '7 days',  'FT',  90, 2, 2, 4),
  (10, 39, 2025, 35, 38, NOW() + INTERVAL '7 days',  'NS',  NULL, NULL, NULL, 5),
  -- La Liga GW1-5
  (11, 140, 2025, 541, 542, NOW() - INTERVAL '28 days', 'FT', 90, 3, 1, 1),
  (12, 140, 2025, 543, 544, NOW() - INTERVAL '28 days', 'FT', 90, 2, 0, 1),
  (13, 140, 2025, 542, 543, NOW() - INTERVAL '21 days', 'FT', 90, 1, 1, 2),
  (14, 140, 2025, 544, 541, NOW() - INTERVAL '14 days', 'FT', 90, 0, 4, 3),
  (15, 140, 2025, 541, 543, NOW() + INTERVAL '7 days',  'NS', NULL, NULL, NULL, 5),
  -- Serie A GW1-3
  (16, 135, 2025, 497, 498, NOW() - INTERVAL '28 days', 'FT', 90, 1, 2, 1),
  (17, 135, 2025, 499, 500, NOW() - INTERVAL '21 days', 'FT', 90, 3, 0, 2),
  (18, 135, 2025, 498, 499, NOW() - INTERVAL '14 days', 'FT', 90, 1, 1, 3),
  (19, 135, 2025, 500, 497, NOW() + INTERVAL '7 days',  'NS', NULL, NULL, NULL, 4),
  -- Bundesliga GW1-3
  (20, 78, 2025, 165, 166, NOW() - INTERVAL '28 days', 'FT', 90, 4, 0, 1),
  (21, 78, 2025, 166, 167, NOW() - INTERVAL '21 days', 'FT', 90, 2, 1, 2),
  (22, 78, 2025, 167, 165, NOW() + INTERVAL '7 days',  'NS', NULL, NULL, NULL, 3),
  -- Ligue 1 GW1-3
  (23, 61, 2025, 85, 86,  NOW() - INTERVAL '28 days', 'FT', 90, 5, 1, 1),
  (24, 61, 2025, 86, 85,  NOW() - INTERVAL '14 days', 'FT', 90, 0, 3, 2),
  (25, 61, 2025, 85, 86,  NOW() + INTERVAL '7 days',  'NS', NULL, NULL, NULL, 3)
ON CONFLICT (id) DO NOTHING;

-- Test League
INSERT INTO leagues (id, name, commissioner_id, season, draft_status, scoring_settings, waiver_day, trade_deadline_gw, max_teams, roster_size, starting_xi_size, waiver_type)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Local Dev League',
  '00000000-0000-0000-0000-000000000001',
  '2024-25',
  'complete',
  '{"goal_gk":10,"goal_def":7,"goal_mid":5,"goal_fwd":4,"assist":3,"clean_sheet_gk":6,"clean_sheet_def":4,"clean_sheet_mid":1,"save_per_3":1,"yellow_card":-1,"red_card":-3,"own_goal":-2,"penalty_miss":-2,"penalty_save":5,"minutes_played_60":2,"minutes_played_45":1,"bonus":1}'::jsonb,
  'Tuesday',
  20,
  4,
  25,
  11,
  'reverse_standings'
) ON CONFLICT (id) DO NOTHING;

-- Gameweeks (10 GWs for the test league)
INSERT INTO gameweeks (league_id, number, start_date, end_date, deadline, transfer_deadline, status)
SELECT
  '11111111-1111-1111-1111-111111111111',
  gs.n,
  (CURRENT_DATE + ((gs.n - 1) * 7 || ' days')::INTERVAL)::DATE,
  (CURRENT_DATE + ((gs.n - 1) * 7 + 6 || ' days')::INTERVAL)::DATE,
  NOW() + ((gs.n - 1) * 7 + 7 || ' days')::INTERVAL,
  NOW() + ((gs.n - 1) * 7 - 1 || ' days')::INTERVAL,
  CASE WHEN gs.n = 1 THEN 'active' ELSE 'upcoming' END
FROM generate_series(1, 10) AS gs(n);
