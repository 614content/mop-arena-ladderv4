// api/cutoffs.js
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { region = 'us', bracket = '2v2', season = '1' } = req.query;

    // Validate inputs
    if (!['us', 'eu'].includes(region)) {
      return res.status(400).json({ error: 'Invalid region. Use "us" or "eu"' });
    }

    if (!['2v2', '3v3', '5v5'].includes(bracket)) {
      return res.status(400).json({ error: 'Invalid bracket. Use "2v2", "3v3", or "5v5"' });
    }

    console.log(`🏆 Fetching cutoffs for ${region} ${bracket} season ${season}...`);

    // Get full leaderboard to calculate cutoffs
    const leaderboardResponse = await fetch(
      `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}/api/leaderboard?region=${region}&bracket=${bracket}&season=${season}`
    );

    if (!leaderboardResponse.ok) {
      throw new Error('Failed to fetch leaderboard data');
    }

    const leaderboardData = await leaderboardResponse.json();
    
    if (!leaderboardData.entries || leaderboardData.entries.length === 0) {
      return res.status(404).json({ error: 'No leaderboard data found' });
    }

    const players = leaderboardData.entries;
    const totalPlayers = players.length;

    // Sort players by rating (highest first)
    const sortedPlayers = players.sort((a, b) => (b.rating || 0) - (a.rating || 0));

    // Calculate cutoffs based on WoW's typical percentages
    const cutoffs = {};

    // Rank 1 (Top 0.1% or minimum 1 player)
    const r1Count = Math.max(1, Math.ceil(totalPlayers * 0.001));
    if (sortedPlayers[r1Count - 1]) {
      cutoffs.r1 = {
        rank: r1Count,
        rating: sortedPlayers[r1Count - 1].rating || 0,
        count: r1Count
      };
    }

    // Gladiator (Top 0.5% or minimum 1 player)
    const gladCount = Math.max(1, Math.ceil(totalPlayers * 0.005));
    if (sortedPlayers[gladCount - 1]) {
      cutoffs.gladiator = {
        rank: gladCount,
        rating: sortedPlayers[gladCount - 1].rating || 0,
        count: gladCount
      };
    }

    // Duelist (Top 3% or minimum 1 player)
    const duelistCount = Math.max(1, Math.ceil(totalPlayers * 0.03));
    if (sortedPlayers[duelistCount - 1]) {
      cutoffs.duelist = {
        rank: duelistCount,
        rating: sortedPlayers[duelistCount - 1].rating || 0,
        count: duelistCount
      };
    }

    console.log(`✅ Calculated cutoffs for ${totalPlayers} players`);

    // Cache for 5 minutes
    res.setHeader('Cache-Control', 'public, max-age=300');
    
    return res.status(200).json({
      ...cutoffs,
      metadata: {
        totalPlayers,
        region,
        bracket,
        season,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Cutoffs API error:', error);
    res.status(500).json({ 
      error: `Server error: ${error.message}` 
    });
  }
}
