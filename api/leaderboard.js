// api/leaderboard.js
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
    const { region = 'us', bracket = '2v2', season = '1' } = req.query;

    console.log(`Fetching ${region} ${bracket} season ${season} data...`);

    // Validate inputs
    if (!['us', 'eu'].includes(region)) {
      return res.status(400).json({ error: 'Invalid region. Use "us" or "eu"' });
    }

    if (!['2v2', '3v3', '5v5'].includes(bracket)) {
      return res.status(400).json({ error: 'Invalid bracket. Use "2v2", "3v3", or "5v5"' });
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
      return res.status(200).json(leaderboardData);
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
