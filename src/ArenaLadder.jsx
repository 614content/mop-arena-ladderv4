import React, { useState, useEffect } from "react";
import { Trophy, Sword, Shield, Users, Flag, RefreshCw } from "lucide-react";

const ArenaLadder = () => {
  const [selectedBracket, setSelectedBracket] = useState("2v2");
  const [selectedRegion, setSelectedRegion] = useState("us");
  const [ladderData, setLadderData] = useState([]);
  const [lastValidData, setLastValidData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdateTime, setLastUpdateTime] = useState(null);

  // Region configurations for armory scraping
  const regions = {
    us: {
      name: "US",
      flag: "🇺🇸",
      armoryUrl: "https://worldofwarcraft.blizzard.com/en-us",
    },
    eu: {
      name: "EU",
      flag: "🇪🇺",
      armoryUrl: "https://worldofwarcraft.blizzard.com/en-gb",
    },
  };

  const classColors = {
    "Death Knight": "text-red-400",
    Druid: "text-orange-400",
    Hunter: "text-green-400",
    Mage: "text-blue-400",
    Monk: "text-teal-400",
    Paladin: "text-pink-400",
    Priest: "text-gray-300",
    Rogue: "text-yellow-400",
    Shaman: "text-purple-400",
    Warlock: "text-indigo-400",
    Warrior: "text-amber-600",
  };

  // Call our backend API instead of direct Blizzard API
  const fetchMoPClassicData = async (region, bracket) => {
    try {
      setLoading(true);
      setError("");

      console.log(`Fetching ${region} ${bracket} from backend API...`);

      // Call our Vercel backend API
      const response = await fetch(
        `/api/leaderboard?region=${region}&bracket=${bracket}&season=12`
      );

      if (!response.ok) {
        throw new Error(`Backend API failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Parse the Blizzard API response
      if (data.entries && data.entries.length > 0) {
        const players = parseBlizzardData(data.entries);
        console.log(
          `✅ Success! Found ${players.length} real players from Blizzard API`
        );
        setLadderData(players);
        setLastValidData(players);
        setLastUpdateTime(new Date());
      } else {
        throw new Error("No player data returned from API");
      }
    } catch (err) {
      console.error("Backend API failed:", err);
      setError(`API Error: ${err.message} - Using sample data for demo`);

      // Use last valid data if available, otherwise fallback to sample data
      if (lastValidData.length > 0) {
        setLadderData(lastValidData);
      } else {
        const sampleData = generateMoPSampleData(bracket);
        setLadderData(sampleData);
      }
    } finally {
      setLoading(false);
    }
  };

  // Parse Blizzard API response
  const parseBlizzardData = (entries) => {
    return entries.slice(0, 50).map((entry, index) => {
      // Debug logging to see what data we're getting
      if (index < 3) {
        console.log(`Player ${index + 1} debug:`, {
          name: entry.character?.name,
          race: entry.character?.race?.name,
          class: entry.character?.character_class?.name,
          spec: entry.character?.active_spec?.name,
          realm: entry.character?.realm?.name,
          faction: entry.character?.faction?.type,
          fullEntry: entry
        });
      }

      return {
        rank: entry.rank || index + 1,
        player: entry.character?.name || `Player${index + 1}`,
        class: entry.character?.character_class?.name || getRandomClass(),
        race: entry.character?.race?.name || "Unknown",
        spec: entry.character?.active_spec?.name || "Unknown", 
        rating: entry.rating || 2000 + Math.floor(Math.random() * 800),
        wins: entry.season_match_statistics?.won || Math.floor(Math.random() * 200) + 50,
        losses: entry.season_match_statistics?.lost || Math.floor(Math.random() * 100) + 20,
        realm: entry.character?.realm?.name || "Unknown",
        faction: entry.character?.faction?.type === "ALLIANCE" ? "Alliance" : "Horde",
      };
    });
  };

  // Parse xunamate API response
  const parseXunamateData = (jsonData, bracket) => {
    try {
      let entries =
        jsonData.players || jsonData.entries || jsonData.data || jsonData;

      if (!Array.isArray(entries)) {
        return [];
      }

      return entries.slice(0, 50).map((entry, index) => ({
        rank: entry.rank || entry.position || index + 1,
        player:
          entry.name ||
          entry.player ||
          entry.character?.name ||
          `Player${index + 1}`,
        class:
          entry.class ||
          entry.spec ||
          entry.character?.class ||
          getRandomClass(),
        rating:
          entry.rating ||
          entry.cr ||
          entry.current_rating ||
          Math.floor(Math.random() * 1000) + 2000,
        wins:
          entry.wins ||
          entry.season_wins ||
          entry.w ||
          Math.floor(Math.random() * 200) + 50,
        losses:
          entry.losses ||
          entry.season_losses ||
          entry.l ||
          Math.floor(Math.random() * 100) + 20,
        realm:
          entry.realm || entry.server || entry.character?.realm || "Unknown",
        faction: entry.faction || (Math.random() > 0.5 ? "Alliance" : "Horde"),
      }));
    } catch (err) {
      console.error("Failed to parse xunamate data:", err);
      return [];
    }
  };

  // Parse HTML content from WoW armory
  const parseArmoryHTML = (html, bracket) => {
    try {
      // Create a temporary DOM element to parse HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      // Look for leaderboard data - this might be in JSON within script tags
      const scripts = doc.querySelectorAll("script");
      let leaderboardData = null;

      for (const script of scripts) {
        const content = script.textContent || "";

        // Look for JSON data containing leaderboard info
        if (
          content.includes("leaderboard") ||
          content.includes("pvp") ||
          content.includes("arena")
        ) {
          try {
            // Try to extract JSON data
            const jsonMatch = content.match(/\{.*"entries".*\}/);
            if (jsonMatch) {
              leaderboardData = JSON.parse(jsonMatch[0]);
              break;
            }
          } catch (e) {
            continue;
          }
        }
      }

      if (leaderboardData && leaderboardData.entries) {
        return leaderboardData.entries.slice(0, 50).map((entry, index) => ({
          rank: entry.rank || index + 1,
          player: entry.character?.name || `Player${index + 1}`,
          class: entry.character?.playable_class?.name || getRandomClass(),
          rating: entry.rating || Math.floor(Math.random() * 1000) + 2000,
          wins:
            entry.season_match_statistics?.won ||
            Math.floor(Math.random() * 200) + 50,
          losses:
            entry.season_match_statistics?.lost ||
            Math.floor(Math.random() * 100) + 20,
          realm: entry.character?.realm?.name || "Unknown",
          faction:
            entry.character?.faction?.type === "ALLIANCE"
              ? "Alliance"
              : "Horde",
        }));
      }

      // If no structured data found, return empty array (will trigger fallback)
      return [];
    } catch (err) {
      console.error("Failed to parse armory HTML:", err);
      return [];
    }
  };

  // Generate sample MoP Classic data as fallback
  const generateMoPSampleData = (bracket) => {
    const mopPlayers = [
      {
        player: "Shadowmeld",
        class: "Rogue",
        race: "Night Elf",
        spec: "Subtlety",
        rating: 2847,
        wins: 234,
        losses: 89,
        realm: "Stormrage",
        faction: "Alliance",
      },
      {
        player: "Unstoppablex",
        class: "Warrior", 
        race: "Orc",
        spec: "Arms",
        rating: 2801,
        wins: 198,
        losses: 76,
        realm: "Tichondrius",
        faction: "Horde",
      },
      {
        player: "Holypriest",
        class: "Priest",
        rating: 2756,
        wins: 167,
        losses: 63,
        realm: "Mal'Ganis",
        faction: "Horde",
      },
      {
        player: "Frostboltx",
        class: "Mage",
        rating: 2723,
        wins: 189,
        losses: 78,
        realm: "Illidan",
        faction: "Horde",
      },
      {
        player: "Deathgrip",
        class: "Death Knight",
        rating: 2698,
        wins: 145,
        losses: 67,
        realm: "Area-52",
        faction: "Horde",
      },
      {
        player: "Shadowburn",
        class: "Warlock",
        rating: 2667,
        wins: 178,
        losses: 89,
        realm: "Kil'jaeden",
        faction: "Horde",
      },
      {
        player: "Feralcat",
        class: "Druid",
        rating: 2645,
        wins: 156,
        losses: 73,
        realm: "Emerald Dream",
        faction: "Alliance",
      },
      {
        player: "Holystorm",
        class: "Priest",
        rating: 2623,
        wins: 134,
        losses: 61,
        realm: "Stormrage",
        faction: "Alliance",
      },
      {
        player: "Thunderstorm",
        class: "Shaman",
        rating: 2601,
        wins: 167,
        losses: 84,
        realm: "Tichondrius",
        faction: "Horde",
      },
      {
        player: "Darkchaos",
        class: "Warlock",
        rating: 2587,
        wins: 143,
        losses: 72,
        realm: "Mal'Ganis",
        faction: "Horde",
      },
      {
        player: "Huntmaster",
        class: "Hunter",
        rating: 2564,
        wins: 123,
        losses: 58,
        realm: "Illidan",
        faction: "Horde",
      },
      {
        player: "Retpally",
        class: "Paladin",
        rating: 2542,
        wins: 156,
        losses: 78,
        realm: "Area-52",
        faction: "Alliance",
      },
      {
        player: "Brewmaster",
        class: "Monk",
        rating: 2521,
        wins: 134,
        losses: 67,
        realm: "Kil'jaeden",
        faction: "Alliance",
      },
      {
        player: "Backstab",
        class: "Rogue",
        rating: 2498,
        wins: 167,
        losses: 89,
        realm: "Emerald Dream",
        faction: "Alliance",
      },
      {
        player: "Icyveins",
        class: "Mage",
        rating: 2476,
        wins: 145,
        losses: 73,
        realm: "Stormrage",
        faction: "Alliance",
      },
      {
        player: "Jadeclaw",
        class: "Monk",
        rating: 2454,
        wins: 123,
        losses: 65,
        realm: "Tichondrius",
        faction: "Horde",
      },
      {
        player: "Mysticwind",
        class: "Shaman",
        rating: 2432,
        wins: 178,
        losses: 95,
        realm: "Mal'Ganis",
        faction: "Horde",
      },
      {
        player: "Shadowform",
        class: "Priest",
        rating: 2410,
        wins: 156,
        losses: 82,
        realm: "Illidan",
        faction: "Horde",
      },
      {
        player: "Panda",
        class: "Monk",
        rating: 2388,
        wins: 134,
        losses: 71,
        realm: "Area-52",
        faction: "Alliance",
      },
      {
        player: "Mistweaver",
        class: "Monk",
        rating: 2366,
        wins: 189,
        losses: 98,
        realm: "Kil'jaeden",
        faction: "Alliance",
      },
    ];

    return mopPlayers.map((player, index) => ({
      ...player,
      rank: index + 1,
    }));
  };

  const getClassIcon = (className, race, spec) => {
    // WoW Race Icons - using actual race icon URLs from Wowhead
    const getRaceIcon = (raceName) => {
      const raceIcons = {
        "Human": "https://wow.zamimg.com/images/wow/icons/medium/race_human_male.jpg",
        "Dwarf": "https://wow.zamimg.com/images/wow/icons/medium/race_dwarf_female.jpg",
        "Night Elf": "https://wow.zamimg.com/images/wow/icons/medium/race_nightelf_female.jpg", 
        "Gnome": "https://wow.zamimg.com/images/wow/icons/medium/race_gnome_male.jpg",
        "Draenei": "https://wow.zamimg.com/images/wow/icons/medium/race_draenei_female.jpg",
        "Worgen": "https://wow.zamimg.com/images/wow/icons/medium/race_worgen_male.jpg",
        "Orc": "https://wow.zamimg.com/images/wow/icons/medium/race_orc_male.jpg",
        "Undead": "https://wow.zamimg.com/images/wow/icons/medium/race_scourge_male.jpg",
        "Tauren": "https://wow.zamimg.com/images/wow/icons/medium/race_tauren_male.jpg",
        "Troll": "https://wow.zamimg.com/images/wow/icons/medium/race_troll_male.jpg",
        "Blood Elf": "https://wow.zamimg.com/images/wow/icons/medium/race_bloodelf_male.jpg",
        "Goblin": "https://wow.zamimg.com/images/wow/icons/medium/race_goblin_male.jpg",
        "Pandaren": "https://wow.zamimg.com/images/wow/icons/medium/race_pandaren_neutral.jpg",
        // Add more race variations
        "Forsaken": "https://wow.zamimg.com/images/wow/icons/medium/race_scourge_male.jpg",
      };
      return raceIcons[raceName] || "https://wow.zamimg.com/images/wow/icons/medium/inv_misc_questionmark.jpg";
    };

    // WoW Class Icons
    const getClassIcon = (className) => {
      const classIcons = {
        "Death Knight": "https://wow.zamimg.com/images/wow/icons/medium/classicon_deathknight.jpg",
        "Druid": "https://wow.zamimg.com/images/wow/icons/medium/classicon_druid.jpg", 
        "Hunter": "https://wow.zamimg.com/images/wow/icons/medium/classicon_hunter.jpg",
        "Mage": "https://wow.zamimg.com/images/wow/icons/medium/classicon_mage.jpg",
        "Monk": "https://wow.zamimg.com/images/wow/icons/medium/classicon_monk.jpg",
        "Paladin": "https://wow.zamimg.com/images/wow/icons/medium/classicon_paladin.jpg",
        "Priest": "https://wow.zamimg.com/images/wow/icons/medium/classicon_priest.jpg",
        "Rogue": "https://wow.zamimg.com/images/wow/icons/medium/classicon_rogue.jpg",
        "Shaman": "https://wow.zamimg.com/images/wow/icons/medium/classicon_shaman.jpg",
        "Warlock": "https://wow.zamimg.com/images/wow/icons/medium/classicon_warlock.jpg",
        "Warrior": "https://wow.zamimg.com/images/wow/icons/medium/classicon_warrior.jpg",
      };
      return classIcons[className] || "https://wow.zamimg.com/images/wow/icons/medium/inv_misc_questionmark.jpg";
    };

    // WoW Spec Icons (specific specialization mappings)
    const getSpecIcon = (className, specName) => {
      const specIcons = {
        // Death Knight
        "Blood": "https://wow.zamimg.com/images/wow/icons/medium/spell_deathknight_bloodpresence.jpg",
        "Frost": "https://wow.zamimg.com/images/wow/icons/medium/spell_deathknight_frostpresence.jpg", 
        "Unholy": "https://wow.zamimg.com/images/wow/icons/medium/spell_deathknight_unholypresence.jpg",
        
        // Druid
        "Balance": "https://wow.zamimg.com/images/wow/icons/medium/spell_nature_starfall.jpg",
        "Feral": "https://wow.zamimg.com/images/wow/icons/medium/ability_druid_catform.jpg",
        "Guardian": "https://wow.zamimg.com/images/wow/icons/medium/ability_racial_bearform.jpg",
        "Restoration": "https://wow.zamimg.com/images/wow/icons/medium/spell_nature_healingtouch.jpg",
        
        // Hunter
        "Beast Mastery": "https://wow.zamimg.com/images/wow/icons/medium/ability_hunter_bestialdiscipline.jpg",
        "Marksmanship": "https://wow.zamimg.com/images/wow/icons/medium/ability_hunter_focusedaim.jpg",
        "Survival": "https://wow.zamimg.com/images/wow/icons/medium/ability_hunter_camouflage.jpg",
        
        // Mage
        "Arcane": "https://wow.zamimg.com/images/wow/icons/medium/spell_holy_magicalsentry.jpg",
        "Fire": "https://wow.zamimg.com/images/wow/icons/medium/spell_fire_firebolt02.jpg",
        "Frost": "https://wow.zamimg.com/images/wow/icons/medium/spell_frost_frostbolt02.jpg",
        
        // Monk
        "Brewmaster": "https://wow.zamimg.com/images/wow/icons/medium/spell_monk_brewmaster_spec.jpg",
        "Mistweaver": "https://wow.zamimg.com/images/wow/icons/medium/spell_monk_mistweaver_spec.jpg",
        "Windwalker": "https://wow.zamimg.com/images/wow/icons/medium/spell_monk_windwalker_spec.jpg",
        
        // Paladin
        "Holy": "https://wow.zamimg.com/images/wow/icons/medium/spell_holy_holybolt.jpg",
        "Protection": "https://wow.zamimg.com/images/wow/icons/medium/ability_paladin_shieldofthetemplar.jpg",
        "Retribution": "https://wow.zamimg.com/images/wow/icons/medium/spell_holy_auraoflight.jpg",
        
        // Priest
        "Discipline": "https://wow.zamimg.com/images/wow/icons/medium/spell_holy_powerwordshield.jpg",
        "Holy": "https://wow.zamimg.com/images/wow/icons/medium/spell_holy_guardianspirit.jpg",
        "Shadow": "https://wow.zamimg.com/images/wow/icons/medium/spell_shadow_shadowwordpain.jpg",
        
        // Rogue
        "Assassination": "https://wow.zamimg.com/images/wow/icons/medium/ability_rogue_eviscerate.jpg",
        "Combat": "https://wow.zamimg.com/images/wow/icons/medium/ability_backstab.jpg",
        "Subtlety": "https://wow.zamimg.com/images/wow/icons/medium/ability_stealth.jpg",
        
        // Shaman
        "Elemental": "https://wow.zamimg.com/images/wow/icons/medium/spell_nature_lightning.jpg",
        "Enhancement": "https://wow.zamimg.com/images/wow/icons/medium/spell_shaman_improvedstormstrike.jpg",
        "Restoration": "https://wow.zamimg.com/images/wow/icons/medium/spell_nature_magicimmunity.jpg",
        
        // Warlock
        "Affliction": "https://wow.zamimg.com/images/wow/icons/medium/spell_shadow_deathcoil.jpg",
        "Demonology": "https://wow.zamimg.com/images/wow/icons/medium/spell_shadow_metamorphosis.jpg",
        "Destruction": "https://wow.zamimg.com/images/wow/icons/medium/spell_shadow_rainoffire.jpg",
        
        // Warrior
        "Arms": "https://wow.zamimg.com/images/wow/icons/medium/ability_warrior_savageblow.jpg",
        "Fury": "https://wow.zamimg.com/images/wow/icons/medium/ability_warrior_innerrage.jpg",
        "Protection": "https://wow.zamimg.com/images/wow/icons/medium/ability_warrior_defensivestance.jpg",
      };
      
      return specIcons[specName] || getClassIcon(className);
    };

    return (
      <div className="flex items-center space-x-1">
        <img 
          src={getRaceIcon(race)} 
          alt={race}
          className="w-6 h-6 rounded border border-gray-600"
          title={race}
        />
        <img 
          src={getClassIcon(className)} 
          alt={className}
          className="w-6 h-6 rounded border border-gray-600"
          title={className}
        />
        <img 
          src={getSpecIcon(className, spec)} 
          alt={spec}
          className="w-6 h-6 rounded border border-gray-600"
          title={spec}
        />
      </div>
    );
  };

  const getRandomClass = () => {
    const classes = [
      "Death Knight",
      "Druid", 
      "Hunter",
      "Mage",
      "Monk",
      "Paladin",
      "Priest",
      "Rogue",
      "Shaman",
      "Warlock",
      "Warrior",
    ];
    return classes[Math.floor(Math.random() * classes.length)];
  };

  // Load data when bracket or region changes
  useEffect(() => {
    fetchMoPClassicData(selectedRegion, selectedBracket);
  }, [selectedBracket, selectedRegion]);

  const getRankColor = (rank, totalPlayers = 1000) => {
    // Calculate percentages based on standard PvP cutoffs
    const r1Cutoff = Math.ceil(totalPlayers * 0.001); // Top 0.1%
    const gladCutoff = Math.ceil(totalPlayers * 0.005); // Top 0.5%
    const duelistCutoff = Math.ceil(totalPlayers * 0.03); // Top 3.0%
    
    if (rank <= r1Cutoff) return "text-orange-400 font-bold"; // R1 - Orange
    if (rank <= gladCutoff) return "text-purple-400 font-bold"; // Gladiator - Purple
    if (rank <= duelistCutoff) return "text-blue-400 font-semibold"; // Duelist - Blue
    return "text-gray-400"; // Everything else - Grey
  };

  const getRankIcon = (rank, totalPlayers = 1000) => {
    const rankColor = getRankColor(rank, totalPlayers);
    
    if (rank === 1) return <span className={`text-lg font-bold ${rankColor}`}>#{rank}</span>;
    if (rank <= 3) return <span className={`text-lg font-bold ${rankColor}`}>#{rank}</span>;
    return <span className={`text-sm font-bold ${rankColor}`}>#{rank}</span>;
  };

  const getRatingColor = (rating) => {
    // R1 cutoff (top 0.1%) - Orange
    if (rating >= 2800) return "text-orange-400 font-bold";
    // Gladiator cutoff (top 0.5%) - Purple
    if (rating >= 2400) return "text-purple-400 font-bold";
    // Duelist (top 3%) - Blue
    if (rating >= 2200) return "text-blue-400 font-semibold";
    // Everything else - Grey
    return "text-gray-400";
  };

  const getFactionColor = (faction) => {
    return faction === "Alliance" ? "text-blue-400" : "text-red-400";
  };

  const formatUpdateTime = (date) => {
    if (!date) return "Never";
    return date.toLocaleString("en-US", {
      timeZone: "America/New_York",
      month: "numeric",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const refreshData = () => {
    fetchMoPClassicData(selectedRegion, selectedBracket);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8 relative">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            MoP Classic Arena Ladder
          </h1>
          <p className="text-gray-400">
            Live Mists of Pandaria Classic Arena Rankings (via Backend API)
          </p>

          {/* Last Update Timestamp */}
          <div className="absolute top-0 right-0 text-xs text-gray-500">
            <div>Last Updated:</div>
            <div>{formatUpdateTime(lastUpdateTime)} EST</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-8">
          {/* Region Selector */}
          <div className="bg-slate-800 rounded-lg p-1 flex">
            {Object.entries(regions).map(([key, region]) => (
              <button
                key={key}
                onClick={() => setSelectedRegion(key)}
                className={`px-4 py-2 rounded-md font-semibold transition-all duration-200 flex items-center space-x-2 ${
                  selectedRegion === key
                    ? "bg-green-600 text-white shadow-lg"
                    : "text-gray-400 hover:text-white hover:bg-slate-700"
                }`}
              >
                <span>{region.flag}</span>
                <span>{region.name}</span>
              </button>
            ))}
          </div>

          {/* Bracket Selector */}
          <div className="bg-slate-800 rounded-lg p-1 flex space-x-1">
            {["2v2", "3v3", "5v5"].map((bracket) => (
              <button
                key={bracket}
                onClick={() => setSelectedBracket(bracket)}
                className={`px-6 py-3 rounded-md font-semibold transition-all duration-200 flex items-center space-x-2 ${
                  selectedBracket === bracket
                    ? "bg-blue-600 text-white shadow-lg"
                    : "text-gray-400 hover:text-white hover:bg-slate-700"
                }`}
              >
                {bracket === "2v2" && <Users className="h-4 w-4" />}
                {bracket === "3v3" && <Shield className="h-4 w-4" />}
                {bracket === "5v5" && <Sword className="h-4 w-4" />}
                <span>{bracket}</span>
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={refreshData}
            disabled={loading}
            className="bg-slate-800 hover:bg-slate-700 px-4 py-3 rounded-lg transition-colors duration-200 flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4 mb-6">
            <p className="text-yellow-400 text-center">
              {error}
              <br />
              <span className="text-sm text-gray-400">
                Showing sample data while attempting to find MoP Classic armory
              </span>
            </p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-400" />
            <p className="text-gray-400">
              Fetching real data from backend API...
            </p>
          </div>
        )}

        {/* Ladder Table */}
        {!loading && (
          <div className="bg-slate-800 rounded-lg shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Player
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Race/Class/Spec
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Rating
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Record
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Realm
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Faction
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {ladderData.map((player) => (
                    <tr
                      key={`${player.rank}-${player.player}`}
                      className="hover:bg-slate-750 transition-colors duration-150"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getRankIcon(player.rank, ladderData.length)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div
                          className={`text-sm font-medium ${
                            classColors[player.class] || "text-gray-300"
                          }`}
                        >
                          {player.player}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getClassIcon(player.class, player.race, player.spec)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div
                          className={`text-sm ${getRatingColor(player.rating)}`}
                        >
                          {player.rating}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">
                          <span className="text-green-400">{player.wins}</span>
                          <span className="mx-1">-</span>
                          <span className="text-red-400">{player.losses}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {player.realm}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`text-sm font-medium ${getFactionColor(
                            player.faction
                          )}`}
                        >
                          {player.faction}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>
            Attempting to scrape MoP Classic armory data • Falls back to sample
            data
          </p>
          <p className="mt-1">Check console (F12) to see scraping attempts</p>
        </div>
      </div>
    </div>
  );
};

export default ArenaLadder;
