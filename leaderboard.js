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
    const { region = 'us', bracket = '2v2', season = '12' } = req.query;

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

    // Step 2: Fetch leaderboard data from Blizzard API
    const apiUrl = `https://${region}.api.blizzard.com/data/wow/pvp-season/${season}/pvp-leaderboard/${bracket}`;
    const params = new URLSearchParams({
      namespace: `dynamic-${region}`,
      locale: 'en_US',
      access_token: tokenData.access_token
    });

    console.log(`Fetching from: ${apiUrl}?${params}`);
    
    const leaderboardResponse = await fetch(`${apiUrl}?${params}`, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    if (!leaderboardResponse.ok) {
      const errorText = await leaderboardResponse.text();
      console.error('Leaderboard request failed:', errorText);
      
      // Handle specific errors
      if (leaderboardResponse.status === 404) {
        return res.status(404).json({ 
          error: `No data found for ${region} ${bracket} season ${season}. This might be because MoP Classic isn't using the expected season ID.` 
        });
      }
      
      return res.status(500).json({ 
        error: `Blizzard API error: ${leaderboardResponse.status}` 
      });
    }

    const leaderboardData = await leaderboardResponse.json();
    console.log(`Success! Found ${leaderboardData.entries?.length || 0} entries`);

    // Return the data to your frontend
    res.status(200).json(leaderboardData);

  } catch (error) {
    console.error('API Handler Error:', error);
    res.status(500).json({ 
      error: `Server error: ${error.message}` 
    });
  }
}