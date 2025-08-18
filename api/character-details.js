export default async function handler(req, res) {
  console.log('Character details API called with:', req.query);
  
  const { region, realm, character } = req.query;
  
  if (!region || !realm || !character) {
    console.log('Missing parameters:', { region, realm, character });
    return res.status(400).json({ error: 'Missing required parameters' });
  }
  
  if (!process.env.BLIZZARD_CLIENT_ID || !process.env.BLIZZARD_CLIENT_SECRET) {
    console.log('Missing environment variables');
    return res.status(500).json({ error: 'Server configuration error' });
  }
  
  try {
    console.log('Getting access token...');
    // Get access token
    const tokenResponse = await fetch('https://oauth.battle.net/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.BLIZZARD_CLIENT_ID}:${process.env.BLIZZARD_CLIENT_SECRET}`).toString('base64')}`
      },
      body: 'grant_type=client_credentials'
    });
    
    if (!tokenResponse.ok) {
      console.log('Token response error:', tokenResponse.status);
      throw new Error('Failed to get access token');
    }
    
    const { access_token } = await tokenResponse.json();
    console.log('Got access token, fetching character data...');
    
    // Fetch character profile and specializations
    const [profileResponse, specResponse] = await Promise.all([
      fetch(`https://${region}.api.blizzard.com/profile/wow/character/${realm}/${character}?namespace=profile-classic-${region}&locale=en_US`, {
        headers: { Authorization: `Bearer ${access_token}` }
      }),
      fetch(`https://${region}.api.blizzard.com/profile/wow/character/${realm}/${character}/specializations?namespace=profile-classic-${region}&locale=en_US`, {
        headers: { Authorization: `Bearer ${access_token}` }
      })
    ]);

    if (!profileResponse.ok) {
      console.log('Profile response error:', profileResponse.status);
      return res.status(404).json({ error: 'Character not found' });
    }

    const profile = await profileResponse.json();
    const specs = specResponse.ok ? await specResponse.json() : { active_specialization: null };
    
    console.log('Successfully fetched character data for:', character);
    
    res.json({
      race: profile.race,
      character_class: profile.character_class,
      realm: profile.realm,
      faction: profile.faction,
      active_specialization: specs.active_specialization || null
    });
    
  } catch (error) {
    console.error('Character details API error:', error);
    res.status(500).json({ error: 'Failed to fetch character details' });
  }
}
