// api/cutoffs.js
// Direct approach to get real Blizzard cutoffs

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

    console.log(`🏆 Getting cutoffs for ${region} ${bracket} season ${season}...`);

    // Get OAuth token
    const accessToken = await getBlizzardToken(region);
    if (!accessToken) {
      throw new Error('Failed to get Blizzard access token');
    }

    // Try to get real cutoffs from Blizzard's PvP season endpoint
    const realCutoffs = await getRealBlizzardCutoffs(region, season, bracket, accessToken);
    
    if (realCutoffs && Object.keys(realCutoffs).length > 0) {
      console.log('✅ Got real Blizzard cutoffs:', realCutoffs);
      res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour
      return res.status(200).json(realCutoffs);
    }

    // If no real cutoffs, try to get them from leaderboard analysis
    console.log('⚠️ No real cutoffs found, analyzing leaderboard...');
    const analyzedCutoffs = await analyzeLeaderboardForCutoffs(req, region, bracket, season);
    
    if (analyzedCutoffs) {
      res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes
      return res.status(200).json(analyzedCutoffs);
    }

    return res.status(404).json({ error: 'No cutoff data available' });

  } catch (error) {
    console.error('❌ Cutoffs error:', error);
    return res.status(500).json({ error: error.message });
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

    if (!response.ok) return null;
    
    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Token error:', error);
    return null;
  }
}

async function getRealBlizzardCutoffs(region, season, bracket, accessToken) {
  try {
    // Try different endpoints that might have cutoff data
    const endpoints = [
      // PvP season info
      `https://${region}.api.blizzard.com/data/wow/pvp-season/${season}`,
      
      // PvP season rewards 
      `https://${region}.api.blizzard.com/data/wow/pvp-season/${season}/pvp-reward`,
      
      // Connected realm PvP data
      `https://${region}.api.blizzard.com/data/wow/connected-realm/index`,
    ];

    for (const endpoint of endpoints) {
      console.log(`🔍 Trying endpoint: ${endpoint}`);
      
      const params = new URLSearchParams({
        namespace: `dynamic-classic-${region}`,
        locale: 'en_US'
      });

      const response = await fetch(`${endpoint}?${params}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Battlenet-Namespace': `dynamic-classic-${region}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`📄 Response from ${endpoint}:`, JSON.stringify(data, null, 2));
        
        // Look for cutoff data in various formats
        const cutoffs = extractCutoffs(data, bracket);
        if (cutoffs && Object.keys(cutoffs).length > 0) {
          return cutoffs;
        }
      } else {
        console.log(`❌ ${endpoint} failed: ${response.status}`);
      }
    }

    // Try bracket-specific endpoint
    const bracketEndpoint = `https://${region}.api.blizzard.com/data/wow/pvp-season/${season}/pvp-leaderboard/${bracket}`;
    const params = new URLSearchParams({
      namespace: `dynamic-classic-${region}`,
      locale: 'en_US'
    });

    const bracketResponse = await fetch(`${bracketEndpoint}?${params}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Battlenet-Namespace': `dynamic-classic-${region}`
      }
    });

    if (bracketResponse.ok) {
      const bracketData = await bracketResponse.json();
      console.log(`📊 Bracket response:`, JSON.stringify(bracketData, null, 2));
      
      // Sometimes cutoffs are in the leaderboard metadata
      if (bracketData.cutoffs || bracketData.title_cutoffs || bracketData.season_cutoffs) {
        return extractCutoffs(bracketData, bracket);
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting real cutoffs:', error);
    return null;
  }
}

function extractCutoffs(data, bracket) {
  const cutoffs = {};
  
  try {
    // Look for various cutoff formats Blizzard might use
    const cutoffSources = [
      data.cutoffs,
      data.title_cutoffs, 
      data.season_cutoffs,
      data.pvp_season_cutoffs,
      data.bracket_cutoffs?.[bracket],
      data.leaderboard_cutoffs
    ].filter(Boolean);

    for (const source of cutoffSources) {
      console.log('🔍 Examining cutoff source:', source);
      
      // Look for Malevolent Gladiator (R1)
      const r1Sources = [
        source.malevolent_gladiator,
        source.rank_1,
        source.r1,
        source['rank-1'],
        source.title_malevolent_gladiator
      ].filter(Boolean);

      if (r1Sources.length > 0) {
        const r1Data = r1Sources[0];
        cutoffs.r1 = {
          rating: r1Data.rating || r1Data.cutoff_rating || r1Data.min_rating,
          rangeStart: 1,
          rangeEnd: r1Data.rank || r1Data.cutoff_rank || r1Data.max_rank
        };
      }

      // Look for Gladiator
      const gladSources = [
        source.gladiator,
        source.season_gladiator,
        source.title_gladiator
      ].filter(Boolean);

      if (gladSources.length > 0) {
        const gladData = gladSources[0];
        cutoffs.gladiator = {
          rating: gladData.rating || gladData.cutoff_rating || gladData.min_rating,
          rangeStart: (cutoffs.r1?.rangeEnd || 0) + 1,
          rangeEnd: gladData.rank || gladData.cutoff_rank || gladData.max_rank
        };
      }
    }

    // Also check rewards array
    if (data.rewards && Array.isArray(data.rewards)) {
      data.rewards.forEach(reward => {
        const title = reward.title?.name?.en_US || reward.name || '';
        
        if (title.toLowerCase().includes('malevolent gladiator')) {
          cutoffs.r1 = {
            rating: reward.rating_cutoff || reward.cutoff_rating || reward.min_rating,
            rangeStart: 1,
            rangeEnd: reward.rank_cutoff || reward.cutoff_rank
          };
        } else if (title.toLowerCase().includes('gladiator') && !title.toLowerCase().includes('malevolent')) {
          cutoffs.gladiator = {
            rating: reward.rating_cutoff || reward.cutoff_rating || reward.min_rating,
            rangeStart: (cutoffs.r1?.rangeEnd || 0) + 1,
            rangeEnd: reward.rank_cutoff || reward.cutoff_rank
          };
        }
      });
    }

    return Object.keys(cutoffs).length > 0 ? cutoffs : null;
  } catch (error) {
    console.error('Error extracting cutoffs:', error);
    return null;
  }
}

async function analyzeLeaderboardForCutoffs(req, region, bracket, season) {
  try {
    // Get leaderboard data
    const leaderboardUrl = `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}/api/leaderboard?region=${region}&bracket=${bracket}&season=${season}`;
    
    const response = await fetch(leaderboardUrl);
    if (!response.ok) return null;
    
    const data = await response.json();
    if (!data.entries || data.entries.length === 0) return null;

    // Sort by rating
    const sortedPlayers = data.entries
      .filter(entry => entry.rating && entry.rating > 0)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0));

    console.log(`📊 Analyzing ${sortedPlayers.length} players for cutoffs`);
    console.log(`📈 Top 10 ratings:`, sortedPlayers.slice(0, 10).map(p => p.rating));

    // Look for significant rating gaps that indicate title boundaries
    const cutoffs = findRatingGaps(sortedPlayers);
    
    if (!cutoffs || Object.keys(cutoffs).length === 0) {
      // Fallback to percentage-based if no gaps found
      const totalPlayers = sortedPlayers.length;
      const r1Count = Math.max(1, Math.ceil(totalPlayers * 0.001)); // 0.1%
      const gladCount = Math.max(r1Count + 1, Math.ceil(totalPlayers * 0.005)); // 0.5%
      
      return {
        r1: {
          rating: sortedPlayers[r1Count - 1]?.rating,
          rangeStart: 1,
          rangeEnd: r1Count
        },
        gladiator: {
          rating: sortedPlayers[gladCount - 1]?.rating,
          rangeStart: r1Count + 1,
          rangeEnd: gladCount
        }
      };
    }

    return cutoffs;
  } catch (error) {
    console.error('Error analyzing leaderboard:', error);
    return null;
  }
}

function findRatingGaps(sortedPlayers) {
  // Look for significant rating gaps in the top ranks
  const gaps = [];
  
  for (let i = 0; i < Math.min(100, sortedPlayers.length - 1); i++) {
    const currentRating = sortedPlayers[i].rating;
    const nextRating = sortedPlayers[i + 1].rating;
    const gap = currentRating - nextRating;
    
    if (gap > 10) { // Significant gap
      gaps.push({
        rank: i + 1,
        gap: gap,
        ratingBefore: currentRating,
        ratingAfter: nextRating
      });
    }
  }

  // Sort by gap size
  gaps.sort((a, b) => b.gap - a.gap);
  
  console.log('📉 Found rating gaps:', gaps.slice(0, 5));

  const cutoffs = {};
  
  // Look for R1 cutoff (usually in top 30 ranks)
  const r1Gap = gaps.find(g => g.rank <= 30 && g.gap >= 20);
  if (r1Gap) {
    cutoffs.r1 = {
      rating: r1Gap.ratingAfter,
      rangeStart: 1,
      rangeEnd: r1Gap.rank
    };
  }

  // Look for Gladiator cutoff (usually after R1, before rank 200)
  const gladGap = gaps.find(g => 
    g.rank > (cutoffs.r1?.rangeEnd || 10) && 
    g.rank <= 200 && 
    g.gap >= 15
  );
  if (gladGap) {
    cutoffs.gladiator = {
      rating: gladGap.ratingAfter,
      rangeStart: (cutoffs.r1?.rangeEnd || 0) + 1,
      rangeEnd: gladGap.rank
    };
  }

  return cutoffs;
}
