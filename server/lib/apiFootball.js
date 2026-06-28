import axios from 'axios';

const API_KEY = process.env.VITE_API_FOOTBALL_KEY;
const BASE_URL = 'https://api-football-v1.p.rapidapi.com';

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'x-rapidapi-key': API_KEY,
    'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
  }
});

export const getFixtures = async (leagueId, season) => {
  try {
    const response = await client.get('/fixtures', {
      params: { league: leagueId, season }
    });
    return response.data.response;
  } catch (error) {
    console.error('Error fetching fixtures:', error.message);
    return [];
  }
};

export const getLiveFixtures = async () => {
  try {
    const response = await client.get('/fixtures', {
      params: { live: 'all' }
    });
    return response.data.response;
  } catch (error) {
    console.error('Error fetching live fixtures:', error.message);
    return [];
  }
};

export const getPlayers = async (leagueId, season, page = 1) => {
  try {
    const response = await client.get('/players', {
      params: { league: leagueId, season, page }
    });
    return {
      players: response.data.response || [],
      paging: response.data.paging
    };
  } catch (error) {
    console.error(`Error fetching players (page ${page}):`, error.message);
    return { players: [], paging: null };
  }
};

export const getPlayersAllPages = async (leagueId, season) => {
  const allPlayers = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const { players, paging } = await getPlayers(leagueId, season, page);
    allPlayers.push(...players);
    if (paging) {
      totalPages = paging.total || 1;
      page = paging.current + 1;
    } else {
      break;
    }
  }

  return allPlayers;
};

export const getPlayerStats = async (playerId, leagueId, season) => {
  try {
    const response = await client.get('/players', {
      params: { id: playerId, league: leagueId, season }
    });
    return response.data.response?.[0];
  } catch (error) {
    console.error('Error fetching player stats:', error.message);
    return null;
  }
};

export const getStandings = async (leagueId, season) => {
  try {
    const response = await client.get('/standings', {
      params: { league: leagueId, season }
    });
    return response.data.response;
  } catch (error) {
    console.error('Error fetching standings:', error.message);
    return [];
  }
};

export const getTeams = async (leagueId) => {
  try {
    const response = await client.get('/teams', {
      params: { league: leagueId }
    });
    return response.data.response;
  } catch (error) {
    console.error('Error fetching teams:', error.message);
    return [];
  }
};

export const getInjuries = async (leagueId, season) => {
  try {
    const response = await client.get('/injuries', {
      params: { league: leagueId, season }
    });
    return response.data.response;
  } catch (error) {
    console.error('Error fetching injuries:', error.message);
    return [];
  }
};

export const getFixturePlayerStats = async (fixtureId) => {
  try {
    const response = await client.get('/fixtures/players', {
      params: { fixture: fixtureId }
    });
    return response.data.response;
  } catch (error) {
    console.error(`Error fetching fixture ${fixtureId} player stats:`, error.message);
    return {};
  }
};

export const getFixturesByDateRange = async (leagueId, season, startDate, endDate) => {
  try {
    const response = await client.get('/fixtures', {
      params: {
        league: leagueId,
        season,
        from: startDate,
        to: endDate
      }
    });
    return response.data.response || [];
  } catch (error) {
    console.error('Error fetching fixtures by date range:', error.message);
    return [];
  }
};

export default {
  getFixtures,
  getLiveFixtures,
  getPlayers,
  getPlayersAllPages,
  getPlayerStats,
  getStandings,
  getTeams,
  getInjuries,
  getFixturePlayerStats,
  getFixturesByDateRange
};
