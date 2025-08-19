// api/cutoffs.js
// Using the Reddit approach to get real Blizzard cutoffs

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
    const { region = 'us', bracket = '2v2', season = '12' } = req.query;

    console.log(`🏆 Getting real Blizzard cutoffs for ${region} ${bracket}...`);

    // Check environment variables
    if (!process.env.BLIZZARD_CLIENT_ID || !process.env.BLIZZARD_CLIENT_SECRET) {
      throw new Error('Missing Blizzard API credentials');
    }

    // Step 1: Get OAuth token
    const tokenUrl = region === 'us' 
      ? 'https://us.battle.net/oauth/token'
      : 'https://eu.battle.net/oauth/token';

    const credentials = Buffer.from(
      `${process.env.BLIZZARD_CLIENT_ID}:${process.env.BLIZZARD_CLIENT_SECRET}`
    ).toString('base64');

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`
      },
      body: 'grant_type=client_credentials'
    });

    if (!tokenResponse.ok) {
      throw new Error(`Token request failed: ${tokenResponse.status}`);
    }

    const { access_token } = await tokenResponse.json();
    console.log('✅ Got access token');

    // Step 2: Get PvP season info (this has the cutoffs!)
    const cutoffs = await getRealCutoffs(region, season, bracket, access_token);
    
    if (cutoffs && Object.keys(cutoffs).length > 0) {
      console.log('✅ Found real Blizzard cutoffs:', cutoffs);
      
      // Cache for 1 hour since Blizzard updates once per day
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.status(200).json(cutoffs);
    }

    // Fallback: Calculate from leaderboard if no real cutoffs available
    console.log('⚠️ No real cutoffs found, calculating from leaderboard...');
    const fallbackCutoffs = await calculateFallbackCutoffs(req, region, bracket, season);
    
    if (fallbackCutoffs) {
      res.setHeader('Cache-Control', 'public, max-age=300'); // 5 min cache for calculated
      return res.status(200).json(fallbackCutoffs);
    }

    return res.status(404).json({ error: 'No cutoff data available' });

  } catch (error) {
    console.error('❌ Cutoffs API error:', error);
    return res.status(500).json({ 
      error: `Failed to get cutoffs: ${error.message}` 
    });
  }
}

// Get real cutoffs from Blizzard API (Reddit approach)
async function getRealCutoffs(region, season, bracket, accessToken) {
  try {
    // Try multiple season endpoints that might have cutoff data
    const seasonsToTry = [season, '12', '13', '14', '15'];
    
    for (const seasonId of seasonsToTry) {
      console.log(`🔍 Trying season ${seasonId} for cutoffs...`);
      
      // Main season endpoint - this often has the cutoff data
      const seasonUrl = `https://${region}.api.blizzard.com/data/wow/pvp-season/${seasonId}`;
      const params = new URLSearchParams({
        namespace: `dynamic-classic-${region}`,
        locale: 'en_US'
      });

      const response = await fetch(`${seasonUrl}?${params}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Battlenet-Namespace': `dynamic-classic-${region}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`📄 Season ${seasonId} data:`, JSON.stringify(data, null, 2));
        
        // Look for cutoffs in the season data
        const cutoffs = extractCutoffsFromSeasonData(data, bracket);
        if (cutoffs && Object.keys(cutoffs).length > 0) {
          console.log(`✅ Found cutoffs in season ${seasonId}!`);
          return cutoffs;
        }
      } else {
        console.log(`❌ Season ${seasonId} failed: ${response.status}`);
      }

      // Try leaderboard endpoint with different parameters
      const leaderboardUrl = `https://${region}.api.blizzard.com/data/wow/pvp-season/${seasonId}/pvp-leaderboard/${bracket}`;
      
      const lbResponse = await fetch(`${leaderboardUrl}?${params}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Battlenet-Namespace': `dynamic-classic-${region}`
        }
      });

      if (lbResponse.ok) {
        const lbData = await lbResponse.json();
        
        // Check if leaderboard has cutoff metadata
        if (lbData.cutoffs || lbData.title_cutoffs || lbData.rank_cutoffs) {
          console.log(`🎯 Found cutoffs in leaderboard for season ${seasonId}!`);
          return extractCutoffsFromLeaderboardData(lbData, bracket);
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting real cutoffs:', error);
    return null;
  }
}

// Extract cutoffs from season data
function extractCutoffsFromSeasonData(data, bracket) {
  const cutoffs = {};
  
  try {
    // Method 1: Direct cutoffs object
    if (data.cutoffs) {
      console.log('Found direct cutoffs:', data.cutoffs);
      
      if (data.cutoffs.malevolent_gladiator || data.cutoffs.rank_1) {
        cutoffs.r1 = {
          rating: data.cutoffs.malevolent_gladiator?.rating || data.cutoffs.rank_1?.rating,
          rangeStart: 1,
          rangeEnd: data.cutoffs.malevolent_gladiator?.rank || data.cutoffs.rank_1?.rank || 22
        };
      }
      
      if (data.cutoffs.gladiator) {
        cutoffs.gladiator = {
          rating: data.cutoffs.gladiator.rating,
          rangeStart: (cutoffs.r1?.rangeEnd || 0) + 1,
          rangeEnd: data.cutoffs.gladiator.rank || 154
        };
      }
    }

    // Method 2: Rewards array with title cutoffs
    if (data.rewards && Array.isArray(data.rewards)) {
      console.log('Found rewards array:', data.rewards);
      
      data.rewards.forEach(reward => {
        if (reward.bracket === bracket || !reward.bracket) {
          const title = reward.title?.name?.en_US || reward.name || '';
          
          if (title.toLowerCase().includes('malevolent gladiator')) {
            cutoffs.r1 = {
              rating: reward.rating_cutoff || reward.cutoff_rating,
              rangeStart: 1,
              rangeEnd: reward.rank_cutoff || reward.cutoff_rank || 22
            };
          } else if (title.toLowerCase().includes('gladiator') && !title.toLowerCase().includes('malevolent')) {
            cutoffs.gladiator = {
              rating: reward.rating_cutoff || reward.cutoff_rating,
              rangeStart: (cutoffs.r1?.rangeEnd || 22) + 1,
              rangeEnd: reward.rank_cutoff || reward.cutoff_rank || 154
            };
          }
        }
      });
    }

    // Method 3: Season metadata
    if (data.season_end_timestamp || data.season_start_timestamp) {
      // This season has ended, try to find archived cutoffs
      if (data.final_standings && data.final_standings[bracket]) {
        const standings = data.final_standings[bracket];
        if (standings.r1_cutoff || standings.gladiator_cutoff) {
          cutoffs.r1 = standings.r1_cutoff;
          cutoffs.gladiator = standings.gladiator_cutoff;
        }
      }
    }

    return cutoffs;
  } catch (error) {
    console.error('Error extracting cutoffs from season data:', error);
    return {};
  }
}

// Extract cutoffs from leaderboard metadata
function extractCutoffsFromLeaderboardData(data, bracket) {
  const cutoffs = {};
  
  try {
    if (data.cutoffs) {
      cutoffs.r1 = data.cutoffs.r1;
      cutoffs.gladiator = data.cutoffs.gladiator;
    }
    
    if (data.title_cutoffs) {
      cutoffs.r1 = data.title_cutoffs.malevolent_gladiator;
      cutoffs.gladiator = data.title_cutoffs.gladiator;
    }
    
    return cutoffs;
  } catch (error) {
    console.error('Error extracting cutoffs from leaderboard data:', error);
    return {};
  }
}

// Fallback: calculate from leaderboard
async function calculateFallbackCutoffs(req, region, bracket, season) {
  try {
    const leaderboardUrl = `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}/api/leaderboard?region=${region}&bracket=${bracket}&season=${season}`;
    
    const response = await fetch(leaderboardUrl);
    if (!response.ok) return null;
    
    const data = await response.json();
    if (!data.entries || data.entries.length === 0) return null;
    
    const sortedPlayers = data.entries
      .filter(entry => entry.rating && entry.rating > 0)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0));
    
    const totalPlayers = sortedPlayers.length;
    
    // Use Reddit post percentages
    const r1Count = Math.max(1, Math.ceil(totalPlayers * 0.001)); // 0.1%
    const gladCount = Math.max(r1Count + 1, Math.ceil(totalPlayers * 0.005)); // 0.5%
    
    const cutoffs = {};
    
    if (sortedPlayers[r1Count - 1]) {
      cutoffs.r1 = {
        rating: sortedPlayers[r1Count - 1].rating,
        rangeStart: 1,
        rangeEnd: r1Count
      };
    }
    
    if (sortedPlayers[gladCount - 1]) {
      cutoffs.gladiator = {
        rating: sortedPlayers[gladCount - 1].rating,
        rangeStart: r1Count + 1,
        rangeEnd: gladCount
      };
    }
    
    return cutoffs;
  } catch (error) {
    console.error('Error calculating fallback cutoffs:', error);
    return null;
  }
}
