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

export const getPlayers = async (leagueId, season) => {
  try {
    const response = await client.get('/players', {
      params: { league: leagueId, season }
    });
    return response.data.response;
  } catch (error) {
    console.error('Error fetching players:', error.message);
    return [];
  }
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

export default { getFixtures, getLiveFixtures, getPlayers, getPlayerStats, getStandings, getTeams, getInjuries };
