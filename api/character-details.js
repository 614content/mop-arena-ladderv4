// api/character-details.js
// Enhanced version with better error handling and caching

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  console.log('Character details API called with:', req.query);
  
  const { region, realm, character } = req.query;
  
  if (!region || !realm || !character) {
    console.log('Missing parameters:', { region, realm, character });
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  // Validate region
  if (!['us', 'eu'].includes(region.toLowerCase())) {
    return res.status(400).json({ error: 'Invalid region. Must be "us" or "eu"' });
  }
  
  if (!process.env.BLIZZARD_CLIENT_ID || !process.env.BLIZZARD_CLIENT_SECRET) {
    console.log('Missing environment variables');
    return res.status(500).json({ error: 'Server configuration error' });
  }
  
  try {
    console.log(`Getting character details for ${character} on ${realm} (${region})...`);
    
    // Get access token with region-specific endpoint
    const tokenUrl = region.toLowerCase() === 'us' 
      ? 'https://us.battle.net/oauth/token'
      : 'https://eu.battle.net/oauth/token';

    console.log('Getting access token...');
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.BLIZZARD_CLIENT_ID}:${process.env.BLIZZARD_CLIENT_SECRET}`).toString('base64')}`
      },
      body: 'grant_type=client_credentials'
    });
    
    if (!tokenResponse.ok) {
      console.log('Token response error:', tokenResponse.status);
      const tokenError = await tokenResponse.text();
      console.error('Token error details:', tokenError);
      throw new Error(`Failed to get access token: ${tokenResponse.status}`);
    }
    
    const { access_token } = await tokenResponse.json();
    console.log('Got access token, fetching character data...');
    
    // Normalize character name (lowercase, no special chars)
    const normalizedCharacter = character.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedRealm = realm.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Try multiple API approaches for character data
    const namespace = `profile-classic-${region.toLowerCase()}`;
    const baseUrl = `https://${region.toLowerCase()}.api.blizzard.com/profile/wow/character/${normalizedRealm}/${normalizedCharacter}`;
    
    console.log(`Fetching from: ${baseUrl}`);
    
    // Fetch character profile and specializations
    const [profileResponse, specResponse] = await Promise.all([
      fetch(`${baseUrl}?namespace=${namespace}&locale=en_US`, {
        headers: { 
          'Authorization': `Bearer ${access_token}`,
          'User-Agent': 'WoW-Arena-Ladder/1.0'
        }
      }),
      fetch(`${baseUrl}/specializations?namespace=${namespace}&locale=en_US`, {
        headers: { 
          'Authorization': `Bearer ${access_token}`,
          'User-Agent': 'WoW-Arena-Ladder/1.0'
        }
      }).catch(err => {
        console.log('Specializations endpoint failed (not critical):', err.message);
        return { ok: false };
      })
    ]);

    if (!profileResponse.ok) {
      console.log('Profile response error:', profileResponse.status);
      
      if (profileResponse.status === 404) {
        return res.status(404).json({ 
          error: 'Character not found',
          character: normalizedCharacter,
          realm: normalizedRealm,
          region: region.toLowerCase()
        });
      }
      
      const errorText = await profileResponse.text();
      console.error('Profile error details:', errorText);
      throw new Error(`Character API failed: ${profileResponse.status}`);
    }

    const profile = await profileResponse.json();
    console.log('Profile data received:', {
      name: profile.name,
      race: profile.race?.name,
      class: profile.character_class?.name,
      realm: profile.realm?.name
    });

    // Handle specializations (might fail for some characters)
    let specs = { active_specialization: null };
    if (specResponse.ok) {
      try {
        specs = await specResponse.json();
        console.log('Specialization data received:', specs.active_specialization?.name);
      } catch (err) {
        console.log('Failed to parse specialization data (not critical):', err.message);
      }
    }
    
    // Construct response with all available data
    const responseData = {
      name: profile.name,
      race: profile.race,
      character_class: profile.character_class,
      class: profile.character_class, // Alternative field name for compatibility
      realm: profile.realm,
      faction: profile.faction,
      active_specialization: specs.active_specialization,
      active_spec: specs.active_specialization, // Alternative field name for compatibility
      level: profile.level,
      // Add any other useful fields from the profile
      guild: profile.guild || null,
      last_login_timestamp: profile.last_login_timestamp || null
    };
    
    console.log('Successfully fetched character data for:', character);
    
    // Cache for 10 minutes since character data doesn't change often
    res.setHeader('Cache-Control', 'public, max-age=600');
    res.status(200).json(responseData);
    
  } catch (error) {
    console.error('Character details API error:', error);
    
    // Return more specific error information
    if (error.message.includes('Failed to get access token')) {
      return res.status(401).json({ error: 'Authentication failed' });
    }
    
    if (error.message.includes('Character API failed')) {
      return res.status(502).json({ error: 'Blizzard API error' });
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch character details',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
