// api/pvp-titles.js
// Calculate real PvP title cutoffs from actual leaderboard data

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

    // Validate inputs
    if (!['us', 'eu'].includes(region)) {
      return res.status(400).json({ error: 'Invalid region. Use "us" or "eu"' });
    }

    if (!['2v2', '3v3', '5v5'].includes(bracket)) {
      return res.status(400).json({ error: 'Invalid bracket. Use "2v2", "3v3", or "5v5"' });
    }

    console.log(`🏆 Calculating real cutoffs for ${region} ${bracket} season ${season}...`);

    // Step 1: Get the full leaderboard data to calculate real cutoffs
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

    // Step 2: Try to get actual title data from Blizzard API
    const titleData = await getTitleDataFromBlizzard(region, bracket, season);
    
    // Step 3: Calculate cutoffs using either title data or statistical analysis
    const cutoffs = calculateRealCutoffs(leaderboardData.entries, titleData);

    if (cutoffs) {
      console.log(`✅ Calculated real cutoffs:`);
      console.log(`R1: ${cutoffs.r1?.rating} (ranks ${cutoffs.r1?.rangeStart}-${cutoffs.r1?.rangeEnd})`);
      console.log(`Glad: ${cutoffs.gladiator?.rating} (ranks ${cutoffs.gladiator?.rangeStart}-${cutoffs.gladiator?.rangeEnd})`);
      
      res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minute cache
      return res.status(200).json(cutoffs);
    } else {
      return res.status(500).json({ error: 'Failed to calculate cutoffs' });
    }

  } catch (error) {
    console.error('PvP Titles API error:', error);
    res.status(500).json({ 
      error: `Server error: ${error.message}`
    });
  }
}

// Try to get actual title/reward data from Blizzard API
async function getTitleDataFromBlizzard(region, bracket, season) {
  try {
    // Get OAuth token
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
      console.log('Failed to get token for title data');
      return null;
    }

    const tokenData = await tokenResponse.json();

    // Try different endpoints that might have title cutoff information
    const endpoints = [
      `https://${region}.api.blizzard.com/data/wow/pvp-season/${season}`,
      `https://${region}.api.blizzard.com/data/wow/pvp-season/${season}/pvp-reward`,
      `https://${region}.api.blizzard.com/data/wow/pvp-season/${season}/pvp-leaderboard/${bracket}/rewards`
    ];

    for (const endpoint of endpoints) {
      try {
        const params = new URLSearchParams({
          namespace: `dynamic-classic-${region}`,
          locale: 'en_US'
        });

        const response = await fetch(`${endpoint}?${params}`, {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`Got data from ${endpoint}:`, JSON.stringify(data, null, 2));
          
          // Check if this has title/reward information
          if (data.rewards || data.titles || data.cutoffs) {
            return data;
          }
        }
      } catch (err) {
        console.log(`Endpoint ${endpoint} failed:`, err.message);
      }
    }

    return null;
  } catch (error) {
    console.log('Failed to get title data from Blizzard:', error.message);
    return null;
  }
}

// Calculate real cutoffs from leaderboard data
function calculateRealCutoffs(entries, titleData = null) {
  try {
    // Sort players by rating (highest first)
    const sortedPlayers = entries.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    const totalPlayers = sortedPlayers.length;

    console.log(`Analyzing ${totalPlayers} players to find real cutoffs...`);

    // Method 1: If we have real title data from Blizzard, use it
    if (titleData && (titleData.rewards || titleData.titles || titleData.cutoffs)) {
      const realCutoffs = extractCutoffsFromTitleData(titleData, sortedPlayers);
      if (realCutoffs) {
        console.log('✅ Using real cutoffs from Blizzard title data');
        return realCutoffs;
      }
    }

    // Method 2: Analyze rating gaps to find natural breakpoints
    const cutoffs = findCutoffsByRatingAnalysis(sortedPlayers);
    if (cutoffs) {
      console.log('✅ Found cutoffs using rating gap analysis');
      return cutoffs;
    }

    // Method 3: Use traditional percentage-based cutoffs as last resort
    console.log('⚠️  Using percentage-based cutoffs (last resort)');
    return calculatePercentageBasedCutoffs(sortedPlayers);

  } catch (error) {
    console.error('Error calculating cutoffs:', error);
    return null;
  }
}

// Extract cutoffs from Blizzard title/reward data
function extractCutoffsFromTitleData(titleData, sortedPlayers) {
  try {
    const cutoffs = {};

    // Parse different data structures
    const rewards = titleData.rewards || titleData.titles || [];
    
    rewards.forEach(reward => {
      const title = reward.title?.name?.en_US || reward.name?.en_US || '';
      
      if (title.toLowerCase().includes('malevolent gladiator') || title.toLowerCase().includes('rank 1')) {
        const rankCutoff = reward.rank_cutoff || reward.cutoff_rank;
        if (rankCutoff && sortedPlayers[rankCutoff - 1]) {
          cutoffs.r1 = {
            rating: sortedPlayers[rankCutoff - 1].rating,
            rangeStart: 1,
            rangeEnd: rankCutoff
          };
        }
      }
      
      if (title.toLowerCase().includes('gladiator') && !title.toLowerCase().includes('malevolent')) {
        const rankCutoff = reward.rank_cutoff || reward.cutoff_rank;
        if (rankCutoff && sortedPlayers[rankCutoff - 1]) {
          cutoffs.gladiator = {
            rating: sortedPlayers[rankCutoff - 1].rating,
            rangeStart: (cutoffs.r1?.rangeEnd || 0) + 1,
            rangeEnd: rankCutoff
          };
        }
      }
    });

    return Object.keys(cutoffs).length > 0 ? cutoffs : null;
  } catch (error) {
    console.error('Error extracting cutoffs from title data:', error);
    return null;
  }
}

// Find cutoffs by analyzing rating gaps (natural breakpoints)
function findCutoffsByRatingAnalysis(sortedPlayers) {
  try {
    const cutoffs = {};
    
    // Look for significant rating gaps that might indicate title boundaries
    const ratingGaps = [];
    
    for (let i = 0; i < Math.min(200, sortedPlayers.length - 1); i++) {
      const currentRating = sortedPlayers[i].rating || 0;
      const nextRating = sortedPlayers[i + 1].rating || 0;
      const gap = currentRating - nextRating;
      
      if (gap > 0) {
        ratingGaps.push({
          rank: i + 1,
          gap: gap,
          ratingBefore: currentRating,
          ratingAfter: nextRating
        });
      }
    }
    
    // Sort by gap size to find the largest gaps
    ratingGaps.sort((a, b) => b.gap - a.gap);
    
    // Look for natural breakpoints in the top ranks
    // R1 is typically around rank 10-30 depending on bracket/region
    const r1Candidates = ratingGaps.filter(g => g.rank >= 5 && g.rank <= 50 && g.gap >= 20);
    if (r1Candidates.length > 0) {
      const r1Cutoff = r1Candidates[0];
      cutoffs.r1 = {
        rating: r1Cutoff.ratingAfter,
        rangeStart: 1,
        rangeEnd: r1Cutoff.rank
      };
    }
    
    // Gladiator is typically around rank 50-200
    const gladCandidates = ratingGaps.filter(g => 
      g.rank >= (cutoffs.r1?.rangeEnd || 20) + 5 && 
      g.rank <= 300 && 
      g.gap >= 15
    );
    if (gladCandidates.length > 0) {
      const gladCutoff = gladCandidates[0];
      cutoffs.gladiator = {
        rating: gladCutoff.ratingAfter,
        rangeStart: (cutoffs.r1?.rangeEnd || 0) + 1,
        rangeEnd: gladCutoff.rank
      };
    }
    
    return Object.keys(cutoffs).length > 0 ? cutoffs : null;
  } catch (error) {
    console.error('Error in rating analysis:', error);
    return null;
  }
}

// Fallback: percentage-based cutoffs
function calculatePercentageBasedCutoffs(sortedPlayers) {
  const totalPlayers = sortedPlayers.length;
  const cutoffs = {};
  
  // R1: Top 0.1% (minimum 1, maximum ~30)
  const r1Count = Math.max(1, Math.min(30, Math.ceil(totalPlayers * 0.001)));
  if (sortedPlayers[r1Count - 1]) {
    cutoffs.r1 = {
      rating: sortedPlayers[r1Count - 1].rating,
      rangeStart: 1,
      rangeEnd: r1Count
    };
  }
  
  // Gladiator: Top 0.5% (minimum r1Count + 1, maximum ~200)
  const gladCount = Math.max(r1Count + 1, Math.min(200, Math.ceil(totalPlayers * 0.005)));
  if (sortedPlayers[gladCount - 1]) {
    cutoffs.gladiator = {
      rating: sortedPlayers[gladCount - 1].rating,
      rangeStart: r1Count + 1,
      rangeEnd: gladCount
    };
  }
  
  return cutoffs;
}
