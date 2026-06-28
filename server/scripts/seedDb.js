import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const { Client } = pg;

// Mock clubs data
const CLUBS = [
  { id: 33, name: 'Manchester United', short_name: 'MAN', league_api_id: 39, season: 2025 },
  { id: 34, name: 'Liverpool', short_name: 'LIV', league_api_id: 39, season: 2025 },
  { id: 35, name: 'Manchester City', short_name: 'MCI', league_api_id: 39, season: 2025 },
  { id: 36, name: 'Chelsea', short_name: 'CHE', league_api_id: 39, season: 2025 },
  { id: 37, name: 'Arsenal', short_name: 'ARS', league_api_id: 39, season: 2025 },
  { id: 38, name: 'Tottenham', short_name: 'TOT', league_api_id: 39, season: 2025 },
  { id: 39, name: 'Brighton', short_name: 'BHA', league_api_id: 39, season: 2025 },
  { id: 40, name: 'Aston Villa', short_name: 'AVL', league_api_id: 39, season: 2025 },
  { id: 541, name: 'Real Madrid', short_name: 'RMA', league_api_id: 140, season: 2025 },
  { id: 542, name: 'Barcelona', short_name: 'FCB', league_api_id: 140, season: 2025 },
  { id: 543, name: 'Atletico Madrid', short_name: 'ATM', league_api_id: 140, season: 2025 },
  { id: 544, name: 'Valencia', short_name: 'VAL', league_api_id: 140, season: 2025 },
  { id: 497, name: 'Juventus', short_name: 'JUV', league_api_id: 135, season: 2025 },
  { id: 498, name: 'AC Milan', short_name: 'MIL', league_api_id: 135, season: 2025 },
  { id: 499, name: 'Inter Milan', short_name: 'INT', league_api_id: 135, season: 2025 },
  { id: 500, name: 'Roma', short_name: 'ROM', league_api_id: 135, season: 2025 },
  { id: 165, name: 'Bayern Munich', short_name: 'FCB', league_api_id: 78, season: 2025 },
  { id: 166, name: 'Borussia Dortmund', short_name: 'BVB', league_api_id: 78, season: 2025 },
  { id: 167, name: 'Bayer Leverkusen', short_name: 'B04', league_api_id: 78, season: 2025 },
  { id: 85, name: 'Paris Saint-Germain', short_name: 'PSG', league_api_id: 61, season: 2025 },
  { id: 86, name: 'Olympique Marseille', short_name: 'OM', league_api_id: 61, season: 2025 },
];

function generatePlayers() {
  const firstNames = ['Lionel', 'Cristiano', 'Harry', 'Mohamed', 'Kylian', 'Erling', 'Vinicius', 'Luka', 'Jude', 'Phil', 'Bukayo', 'Jamal', 'Mason', 'Bruno', 'Luis', 'Gavi', 'Pedri', 'Rodri', 'Declan', 'Kyle', 'Trent', 'Virgil', 'Ruben', 'Sergio', 'Pep', 'Carlo', 'Erik', 'Luis', 'Marco'];
  const lastNames = ['Messi', 'Ronaldo', 'Kane', 'Salah', 'Mbappe', 'Haaland', 'Junior', 'Modric', 'Bellingham', 'Foden', 'Saka', 'Sancho', 'Mount', 'Fernandes', 'Suarez', 'Alcantara', 'Gavi', 'Alcantara', 'Rice', 'Walker-Peters', 'Alexander-Arnold', 'Van Dijk', 'Dias', 'Ramos', 'Guardiola', 'Ancelotti', 'ten Hag', 'Enrique', 'Silva'];
  const positions = ['G', 'D', 'M', 'F'];
  const nationalities = ['Argentine', 'Portuguese', 'English', 'Egyptian', 'French', 'Norwegian', 'Brazilian', 'Croatian', 'Spanish', 'German', 'Dutch', 'Italian'];

  const players = [];
  let playerId = 1;

  for (const club of CLUBS) {
    const playerCount = Math.floor(Math.random() * 6) + 15;
    for (let i = 0; i < playerCount; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const position = positions[Math.floor(Math.random() * positions.length)];
      const nationality = nationalities[Math.floor(Math.random() * nationalities.length)];

      players.push({
        external_api_id: String(playerId),
        name: `${firstName} ${lastName}`,
        position,
        club_id: club.id,
        league_api_id: club.league_api_id,
        nationality,
        birth_date: `${1990 + Math.floor(Math.random() * 15)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
        status: 'active',
        image_url: `https://via.placeholder.com/100?text=${firstName.charAt(0)}${lastName.charAt(0)}`,
        season_points: 0,
        ownership_pct: 0
      });
      playerId++;
    }
  }

  return players;
}

function generateFixtures() {
  const fixtures = [];
  let fixtureId = 1;

  const leagueClubs = {
    39: [33, 34, 35, 36, 37, 38, 39, 40],
    140: [541, 542, 543, 544],
    135: [497, 498, 499, 500],
    78: [165, 166, 167],
    61: [85, 86]
  };

  const now = new Date();
  let fixtureDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  for (const [leagueId, clubs] of Object.entries(leagueClubs)) {
    for (let gw = 1; gw <= 10; gw++) {
      for (let i = 0; i < clubs.length / 2; i++) {
        const homeClubId = clubs[Math.floor(Math.random() * clubs.length)];
        let awayClubId = clubs[Math.floor(Math.random() * clubs.length)];
        while (awayClubId === homeClubId) {
          awayClubId = clubs[Math.floor(Math.random() * clubs.length)];
        }

        const status = fixtureDate < now ? (Math.random() > 0.3 ? 'FT' : 'LIVE') : 'NS';
        const homeScore = status !== 'NS' ? Math.floor(Math.random() * 4) : null;
        const awayScore = status !== 'NS' ? Math.floor(Math.random() * 4) : null;

        fixtures.push({
          id: fixtureId,
          league_api_id: parseInt(leagueId),
          season: 2025,
          home_club_id: homeClubId,
          away_club_id: awayClubId,
          kickoff_at: fixtureDate.toISOString(),
          status,
          elapsed: status === 'FT' ? 90 : status === 'LIVE' ? Math.floor(Math.random() * 90) : null,
          home_score: homeScore,
          away_score: awayScore,
          gameweek_number: gw
        });

        fixtureId++;
        fixtureDate = new Date(fixtureDate.getTime() + 12 * 60 * 60 * 1000);
      }
    }
  }

  return fixtures;
}

async function seedDatabase() {
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
  });

  console.log('🌱 Seeding database with mock data...\n');

  try {
    await client.connect();

    // Seed clubs
    console.log('📍 Seeding clubs...');
    for (const club of CLUBS) {
      await client.query(
        `INSERT INTO clubs (id, name, short_name, logo_url, league_api_id, season)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [club.id, club.name, club.short_name, club.logo_url, club.league_api_id, club.season]
      );
    }
    console.log(`   ✅ Seeded ${CLUBS.length} clubs`);

    // Seed players
    console.log('⚽ Seeding players...');
    const players = generatePlayers();
    for (const player of players) {
      await client.query(
        `INSERT INTO players
         (external_api_id, name, position, club_id, league_api_id, nationality, birth_date, status, image_url, season_points, ownership_pct)
         VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8, $9, $10, $11)
         ON CONFLICT (external_api_id) DO NOTHING`,
        [player.external_api_id, player.name, player.position, player.club_id, player.league_api_id,
         player.nationality, player.birth_date, player.status, player.image_url, player.season_points, player.ownership_pct]
      );
    }
    console.log(`   ✅ Seeded ${players.length} players`);

    // Seed fixtures
    console.log('🏟️  Seeding fixtures...');
    const fixtures = generateFixtures();
    for (const fixture of fixtures) {
      await client.query(
        `INSERT INTO fixtures
         (id, league_api_id, season, home_club_id, away_club_id, kickoff_at, status, elapsed, home_score, away_score, gameweek_number)
         VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO NOTHING`,
        [fixture.id, fixture.league_api_id, fixture.season, fixture.home_club_id, fixture.away_club_id,
         fixture.kickoff_at, fixture.status, fixture.elapsed, fixture.home_score, fixture.away_score, fixture.gameweek_number]
      );
    }
    console.log(`   ✅ Seeded ${fixtures.length} fixtures`);

    // Seed test league
    console.log('🏆 Seeding test league...');
    const leagueResult = await client.query(
      `INSERT INTO leagues
       (name, commissioner_id, season, draft_status, scoring_settings, waiver_day, trade_deadline_gw, max_teams, roster_size, starting_xi_size, waiver_type)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      ['Test League', '550e8400-e29b-41d4-a716-446655440000', '2024-25', 'complete',
       JSON.stringify({goal_gk:10,goal_def:7,goal_mid:5,goal_fwd:4,assist:3,clean_sheet_gk:6,clean_sheet_def:4,clean_sheet_mid:1,save_per_3:1,yellow_card:-1,red_card:-3,own_goal:-2,penalty_miss:-2,penalty_save:5,minutes_played_60:2,minutes_played_45:1,bonus:1}),
       'Tuesday', 20, 4, 25, 11, 'reverse_standings']
    );
    const leagueId = leagueResult.rows[0].id;
    console.log(`   ✅ Seeded test league: ${leagueId}`);

    // Seed gameweeks
    console.log('📅 Seeding gameweeks...');
    const now = new Date();
    for (let i = 1; i <= 10; i++) {
      const startDate = new Date(now.getTime() + (i - 1) * 7 * 24 * 60 * 60 * 1000);
      const endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000);
      const deadline = new Date(endDate.getTime() + 12 * 60 * 60 * 1000);
      const transferDeadline = new Date(startDate.getTime() - 12 * 60 * 60 * 1000);

      await client.query(
        `INSERT INTO gameweeks
         (league_id, number, start_date, end_date, deadline, transfer_deadline, status)
         VALUES ($1, $2, $3::date, $4::date, $5::timestamptz, $6::timestamptz, $7)`,
        [leagueId, i, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0],
         deadline.toISOString(), transferDeadline.toISOString(), i === 1 ? 'active' : 'upcoming']
      );
    }
    console.log(`   ✅ Seeded 10 gameweeks`);

    await client.end();

    console.log('\n✨ Database seeding complete!');
    console.log('\n📊 Summary:');
    console.log(`  - Clubs: ${CLUBS.length}`);
    console.log(`  - Players: ${players.length}`);
    console.log(`  - Fixtures: ${fixtures.length}`);
    console.log(`  - Test League ID: ${leagueId}`);
    console.log(`  - Gameweeks: 10`);
    console.log('\n🧪 Ready to test! You can now:');
    console.log(`  1. Create teams in the test league`);
    console.log(`  2. Draft players from the ${players.length} seeded players`);
    console.log(`  3. Test live scoring with the ${fixtures.length} fixtures`);
    console.log(`  4. Test waivers, trades, and matchups`);
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

seedDatabase();
