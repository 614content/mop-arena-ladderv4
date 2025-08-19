// api/leaderboard.js
// Enhanced with pagination support for instant loading
export default async function handler(req, res) {
  // Enable CORS for your frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Extract parameters including new pagination params
    const { 
      region = 'us', 
      bracket = '2v2', 
      season = '1',
      limit,    // NEW: for pagination
      skip      // NEW: for pagination
    } = req.query;

    console.log(`Fetching ${region} ${bracket} season ${season} data...`);
    console.log(`Pagination: limit=${limit}, skip=${skip}`);

    // Validate inputs
    if (!['us', 'eu'].includes(region)) {
      return res.status(400).json({ error: 'Invalid region. Use "us" or "eu"' });
    }

    if (!['2v2', '3v3', '5v5'].includes(bracket)) {
      return res.status(400).json({ error: 'Invalid bracket. Use "2v2", "3v3", or "5v5"' });
    }

    // Validate pagination parameters
    let parsedLimit = null;
    let parsedSkip = 0;

    if (limit) {
      parsedLimit = parseInt(limit);
      if (isNaN(parsedLimit) || parsedLimit <= 0 || parsedLimit > 1000) {
        return res.status(400).json({ 
          error: 'Invalid limit. Must be between 1 and 1000' 
        });
      }
    }

    if (skip) {
      parsedSkip = parseInt(skip);
      if (isNaN(parsedSkip) || parsedSkip < 0) {
        return res.status(400).json({ 
          error: 'Invalid skip. Must be 0 or greater' 
        });
      }
    }

    // Check if required environment variables exist
    if (!process.env.BLIZZARD_CLIENT_ID || !process.env.BLIZZARD_CLIENT_SECRET) {
      return res.status(500).json({ 
        error: 'Missing Blizzard API credentials. Please set BLIZZARD_CLIENT_ID and BLIZZARD_CLIENT_SECRET environment variables.' 
      });
    }

    // Step 1: Get OAuth2 access token from Blizzard
    const tokenUrl = region === 'us' 
      ? 'https://us.battle.net/oauth/token'
      : 'https://eu.battle.net/oauth/token';

    const credentials = Buffer.from(
      `${process.env.BLIZZARD_CLIENT_ID}:${process.env.BLIZZARD_CLIENT_SECRET}`
    ).toString('base64');

    console.log('Getting access token...');
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`
      },
      body: 'grant_type=client_credentials'
    });

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.text();
      console.error('Token request failed:', tokenError);
      return res.status(500).json({ 
        error: `Failed to get access token: ${tokenResponse.status}` 
      });
    }

    const tokenData = await tokenResponse.json();
    console.log('Access token obtained successfully');

    // Step 2: Try multiple API approaches for MoP Classic
    const seasonsToTry = [season, '1', '12', '13', '14', '15'];
    let leaderboardData = null;
    let lastError = null;

    for (const seasonId of seasonsToTry) {
      try {
        console.log(`Trying season ${seasonId}...`);
        
        // Try Classic namespace first
        let apiUrl = `https://${region}.api.blizzard.com/data/wow/pvp-season/${seasonId}/pvp-leaderboard/${bracket}`;
        let params = new URLSearchParams({
          namespace: `dynamic-classic-${region}`,
          locale: 'en_US',
          access_token: tokenData.access_token
        });

        // Add pagination parameters to Blizzard API if specified
        if (parsedLimit) {
          params.append('limit', parsedLimit.toString());
        }
        if (parsedSkip > 0) {
          params.append('offset', parsedSkip.toString());
        }

        console.log(`Trying Classic API: ${apiUrl}?${params}`);
        
        let leaderboardResponse = await fetch(`${apiUrl}?${params}`, {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`
          }
        });

        // If Classic namespace fails, try regular namespace
        if (!leaderboardResponse.ok) {
          console.log(`Classic namespace failed, trying regular namespace...`);
          params = new URLSearchParams({
            namespace: `dynamic-${region}`,
            locale: 'en_US',
            access_token: tokenData.access_token
          });

          // Re-add pagination for regular namespace
          if (parsedLimit) {
            params.append('limit', parsedLimit.toString());
          }
          if (parsedSkip > 0) {
            params.append('offset', parsedSkip.toString());
          }

          leaderboardResponse = await fetch(`${apiUrl}?${params}`, {
            headers: {
              'Authorization': `Bearer ${tokenData.access_token}`
            }
          });
        }

        if (leaderboardResponse.ok) {
          const data = await leaderboardResponse.json();
          if (data.entries && data.entries.length > 0) {
            leaderboardData = data;
            console.log(`✅ Success with season ${seasonId}! Found ${data.entries.length} entries`);
            break;
          }
        } else {
          const errorText = await leaderboardResponse.text();
          lastError = `Season ${seasonId}: ${leaderboardResponse.status} - ${errorText}`;
          console.log(lastError);
        }
      } catch (err) {
        lastError = `Season ${seasonId}: ${err.message}`;
        console.log(lastError);
        continue;
      }
    }

    if (leaderboardData) {
      // If Blizzard API doesn't support pagination, implement client-side pagination
      let processedData = leaderboardData;
      
      // Check if we need to apply client-side pagination
      if ((parsedLimit || parsedSkip > 0) && leaderboardData.entries) {
        const allEntries = leaderboardData.entries;
        
        // Apply skip and limit on the client side if API doesn't support it
        const startIndex = parsedSkip;
        const endIndex = parsedLimit ? startIndex + parsedLimit : allEntries.length;
        const paginatedEntries = allEntries.slice(startIndex, endIndex);
        
        // Update ranks to reflect actual positions
        const entriesWithCorrectRanks = paginatedEntries.map((entry, index) => ({
          ...entry,
          rank: startIndex + index + 1
        }));
        
        processedData = {
          ...leaderboardData,
          entries: entriesWithCorrectRanks,
          // Add pagination metadata
          pagination: {
            total: allEntries.length,
            limit: parsedLimit,
            skip: parsedSkip,
            hasMore: endIndex < allEntries.length
          }
        };
        
        console.log(`📄 Applied client-side pagination: ${entriesWithCorrectRanks.length} entries (${startIndex}-${endIndex-1} of ${allEntries.length})`);
      }
      
      // Add cache headers for better performance
      res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minute cache
      
      return res.status(200).json(processedData);
    } else {
      return res.status(404).json({ 
        error: `No MoP Classic data found after trying seasons [${seasonsToTry.join(', ')}]. Last error: ${lastError}. This might indicate MoP Classic uses a different API structure.`
      });
    }

  } catch (error) {
    console.error('API Handler Error:', error);
    res.status(500).json({ 
      error: `Server error: ${error.message}` 
    });
  }
}

// Now you'll also need the cutoffs API endpoint.
// Create a new file: api/cutoffs.js

export function createCutoffsAPI() {
  return `
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

    console.log(\`🏆 Fetching cutoffs for \${region} \${bracket} season \${season}...\`);

    // Get full leaderboard to calculate cutoffs
    const leaderboardResponse = await fetch(
      \`\${req.headers['x-forwarded-proto'] || 'http'}://\${req.headers.host}/api/leaderboard?region=\${region}&bracket=\${bracket}&season=\${season}\`
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
    // These can be adjusted based on actual Blizzard cutoff data if available
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

    // Rival (Top 10% or minimum 1 player)
    const rivalCount = Math.max(1, Math.ceil(totalPlayers * 0.10));
    if (sortedPlayers[rivalCount - 1]) {
      cutoffs.rival = {
        rank: rivalCount,
        rating: sortedPlayers[rivalCount - 1].rating || 0,
        count: rivalCount
      };
    }

    console.log(\`✅ Calculated cutoffs for \${totalPlayers} players\`);
    console.log(\`R1: \${cutoffs.r1?.rating} (\${cutoffs.r1?.count} players)\`);
    console.log(\`Glad: \${cutoffs.gladiator?.rating} (\${cutoffs.gladiator?.count} players)\`);
    console.log(\`Duelist: \${cutoffs.duelist?.rating} (\${cutoffs.duelist?.count} players)\`);

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
      error: \`Server error: \${error.message}\` 
    });
  }
}
`;
}
