// api/cutoffs.js
// Get real Blizzard cutoffs - no calculations

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

    // Get OAuth token
    const accessToken = await getBlizzardToken(region);
    if (!accessToken) {
      throw new Error('Failed to get Blizzard access token');
    }

    // Get real cutoffs from Blizzard
    const cutoffs = await getRealBlizzardCutoffs(region, season, bracket, accessToken);
    
    if (cutoffs && Object.keys(cutoffs).length > 0) {
      console.log('✅ Found real Blizzard cutoffs:', cutoffs);
      
      // Cache for 24 hours since Blizzard updates once per day
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.status(200).json(cutoffs);
    }

    return res.status(404).json({ 
      error: 'No cutoff data available from Blizzard API',
      debug: 'Blizzard may not provide cutoffs for this season/bracket'
    });

  } catch (error) {
    console.error('❌ Cutoffs error:', error);
    return res.status(500).json({ 
      error: error.message,
      debug: 'Check console logs for API response details'
    });
  }
}

async function getBlizzardToken(region) {
  try {
    const tokenUrl = region === 'us' 
      ? 'https://us.battle.net/oauth/token'
      : 'https://eu.battle.net/oauth/token';

    const credentials = Buffer.from(
      `${process.env.BLIZZARD_CLIENT_ID}:${process.env.BLIZZARD_CLIENT_SECRET}`
    ).toString('base64');

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      throw new Error(`Token request failed: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ Got Blizzard access token');
    return data.access_token;
  } catch (error) {
    console.error('❌ Token error:', error);
    return null;
  }
}

async function getRealBlizzardCutoffs(region, season, bracket, accessToken) {
  // Try all possible endpoints that might have cutoff data
  const endpoints = [
    // PvP season endpoint - most likely to have cutoffs
    {
      url: `https://${region}.api.blizzard.com/data/wow/pvp-season/${season}`,
      namespace: `dynamic-classic-${region}`
    },
    
    // PvP rewards endpoint
    {
      url: `https://${region}.api.blizzard.com/data/wow/pvp-season/${season}/pvp-reward`,
      namespace: `dynamic-classic-${region}`
    },
    
    // Bracket-specific leaderboard (sometimes has cutoff metadata)
    {
      url: `https://${region}.api.blizzard.com/data/wow/pvp-season/${season}/pvp-leaderboard/${bracket}`,
      namespace: `dynamic-classic-${region}`
    },
    
    // Try retail namespace as fallback
    {
      url: `https://${region}.api.blizzard.com/data/wow/pvp-season/${season}`,
      namespace: `dynamic-${region}`
    },
    
    // Connected realm data (sometimes has PvP info)
    {
      url: `https://${region}.api.blizzard.com/data/wow/connected-realm/index`,
      namespace: `dynamic-classic-${region}`
    }
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`🔍 Trying: ${endpoint.url}`);
      
      const params = new URLSearchParams({
        namespace: endpoint.namespace,
        locale: 'en_US'
      });

      const response = await fetch(`${endpoint.url}?${params}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Battlenet-Namespace': endpoint.namespace
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // Log the full response so we can see what Blizzard actually returns
        console.log(`📄 Response from ${endpoint.url}:`);
        console.log(JSON.stringify(data, null, 2));
        
        // Look for any cutoff-related data
        const cutoffs = extractAnyCutoffData(data, bracket);
        if (cutoffs && Object.keys(cutoffs).length > 0) {
          console.log(`✅ Found cutoffs in ${endpoint.url}!`);
          return cutoffs;
        }
      } else {
        console.log(`❌ ${endpoint.url} failed: ${response.status}`);
        const errorText = await response.text();
        console.log(`   Error: ${errorText}`);
      }
    } catch (error) {
      console.log(`💥 ${endpoint.url} threw error: ${error.message}`);
    }
  }

  console.log('❌ No cutoffs found in any Blizzard endpoint');
  return null;
}

function extractAnyCutoffData(data, bracket) {
  console.log('🔍 Looking for cutoff data in response...');
  
  // Check all possible locations where cutoffs might be
  const possibleCutoffLocations = [
    data.cutoffs,
    data.title_cutoffs,
    data.season_cutoffs,
    data.pvp_cutoffs,
    data.rank_cutoffs,
    data.bracket_cutoffs,
    data.leaderboard_cutoffs,
    data.rewards,
    data.titles,
    data.pvp_season,
    data.season_rewards,
    data[bracket + '_cutoffs'],
    data.brackets?.[bracket]?.cutoffs,
    data.pvp_seasons?.[0]?.cutoffs
  ];

  for (const location of possibleCutoffLocations) {
    if (location) {
      console.log('📊 Found potential cutoff data:', location);
      
      const cutoffs = {};
      
      // Look for R1/Malevolent Gladiator
      const r1Data = location.malevolent_gladiator || 
                     location.rank_1 || 
                     location.r1 || 
                     location['rank-1'] ||
                     (Array.isArray(location) && location.find(item => 
                       item.title?.name?.en_US?.toLowerCase().includes('malevolent gladiator') ||
                       item.name?.toLowerCase().includes('malevolent gladiator')
                     ));
      
      if (r1Data) {
        cutoffs.r1 = {
          rating: r1Data.rating || r1Data.cutoff_rating || r1Data.rating_cutoff,
          rangeStart: 1,
          rangeEnd: r1Data.rank || r1Data.cutoff_rank || r1Data.rank_cutoff
        };
      }
      
      // Look for Gladiator
      const gladData = location.gladiator || 
                       location.season_gladiator ||
                       (Array.isArray(location) && location.find(item => 
                         item.title?.name?.en_US?.toLowerCase().includes('gladiator') &&
                         !item.title?.name?.en_US?.toLowerCase().includes('malevolent')
                       ));
      
      if (gladData) {
        cutoffs.gladiator = {
          rating: gladData.rating || gladData.cutoff_rating || gladData.rating_cutoff,
          rangeStart: (cutoffs.r1?.rangeEnd || 0) + 1,
          rangeEnd: gladData.rank || gladData.cutoff_rank || gladData.rank_cutoff
        };
      }
      
      if (Object.keys(cutoffs).length > 0) {
        return cutoffs;
      }
    }
  }
  
  console.log('❌ No cutoff data found in response');
  return null;
}
