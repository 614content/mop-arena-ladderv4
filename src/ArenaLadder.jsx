import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Trophy, Sword, Shield, Users, Flag, RefreshCw } from "lucide-react";

const ArenaLadder = () => {
  const [selectedBracket, setSelectedBracket] = useState("2v2");
  const [selectedRegion, setSelectedRegion] = useState("us");
  const [ladderData, setLadderData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdateTime, setLastUpdateTime] = useState(null);

  // Static configurations
  const regions = useMemo(() => ({
    us: { name: "US", flag: "🇺🇸" },
    eu: { name: "EU", flag: "🇪🇺" },
  }), []);

  const classColors = useMemo(() => ({
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
  }), []);

  // Memoized icon mappings for better performance
  const iconMappings = useMemo(() => ({
    race: {
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
      "Forsaken": "https://wow.zamimg.com/images/wow/icons/medium/race_scourge_male.jpg",
    },
    class: {
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
    },
    spec: {
      "Blood": "https://wow.zamimg.com/images/wow/icons/medium/spell_deathknight_bloodpresence.jpg",
      "Frost": "https://wow.zamimg.com/images/wow/icons/medium/spell_deathknight_frostpresence.jpg",
      "Unholy": "https://wow.zamimg.com/images/wow/icons/medium/spell_deathknight_unholypresence.jpg",
      "Balance": "https://wow.zamimg.com/images/wow/icons/medium/spell_nature_starfall.jpg",
      "Feral": "https://wow.zamimg.com/images/wow/icons/medium/ability_druid_catform.jpg",
      "Guardian": "https://wow.zamimg.com/images/wow/icons/medium/ability_racial_bearform.jpg",
      "Restoration": "https://wow.zamimg.com/images/wow/icons/medium/spell_nature_healingtouch.jpg",
      "Beast Mastery": "https://wow.zamimg.com/images/wow/icons/medium/ability_hunter_bestialdiscipline.jpg",
      "Marksmanship": "https://wow.zamimg.com/images/wow/icons/medium/ability_hunter_focusedaim.jpg",
      "Survival": "https://wow.zamimg.com/images/wow/icons/medium/ability_hunter_camouflage.jpg",
      "Arcane": "https://wow.zamimg.com/images/wow/icons/medium/spell_holy_magicalsentry.jpg",
      "Fire": "https://wow.zamimg.com/images/wow/icons/medium/spell_fire_firebolt02.jpg",
      "Brewmaster": "https://wow.zamimg.com/images/wow/icons/medium/spell_monk_brewmaster_spec.jpg",
      "Mistweaver": "https://wow.zamimg.com/images/wow/icons/medium/spell_monk_mistweaver_spec.jpg",
      "Windwalker": "https://wow.zamimg.com/images/wow/icons/medium/spell_monk_windwalker_spec.jpg",
      "Holy": "https://wow.zamimg.com/images/wow/icons/medium/spell_holy_holybolt.jpg",
      "Protection": "https://wow.zamimg.com/images/wow/icons/medium/ability_paladin_shieldofthetemplar.jpg",
      "Retribution": "https://wow.zamimg.com/images/wow/icons/medium/spell_holy_auraoflight.jpg",
      "Discipline": "https://wow.zamimg.com/images/wow/icons/medium/spell_holy_powerwordshield.jpg",
      "Shadow": "https://wow.zamimg.com/images/wow/icons/medium/spell_shadow_shadowwordpain.jpg",
      "Assassination": "https://wow.zamimg.com/images/wow/icons/medium/ability_rogue_eviscerate.jpg",
      "Combat": "https://wow.zamimg.com/images/wow/icons/medium/ability_backstab.jpg",
      "Subtlety": "https://wow.zamimg.com/images/wow/icons/medium/ability_stealth.jpg",
      "Elemental": "https://wow.zamimg.com/images/wow/icons/medium/spell_nature_lightning.jpg",
      "Enhancement": "https://wow.zamimg.com/images/wow/icons/medium/spell_shaman_improvedstormstrike.jpg",
      "Affliction": "https://wow.zamimg.com/images/wow/icons/medium/spell_shadow_deathcoil.jpg",
      "Demonology": "https://wow.zamimg.com/images/wow/icons/medium/spell_shadow_metamorphosis.jpg",
      "Destruction": "https://wow.zamimg.com/images/wow/icons/medium/spell_shadow_rainoffire.jpg",
      "Arms": "https://wow.zamimg.com/images/wow/icons/medium/ability_warrior_savageblow.jpg",
      "Fury": "https://wow.zamimg.com/images/wow/icons/medium/ability_warrior_innerrage.jpg",
    }
  }), []);

  const defaultIcon = "https://wow.zamimg.com/images/wow/icons/medium/inv_misc_questionmark.jpg";

  // Enhanced character detail fetching with error handling
  const fetchCharacterDetails = useCallback(async (realmSlug, characterName, region) => {
    try {
      const response = await fetch(
        `/api/character-details?region=${region}&realm=${realmSlug}&character=${characterName.toLowerCase()}`
      );
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.warn(`Failed to fetch character details for ${characterName}:`, error);
      return null;
    }
  }, []);

  // Streamlined data fetching
  const fetchMoPClassicData = useCallback(async (region, bracket) => {
    setLoading(true);
    setError("");

    try {
      console.log(`Fetching ${region} ${bracket} from backend API...`);

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

      if (data.entries?.length > 0) {
        const players = await parseBlizzardDataEnhanced(data.entries, region);
        console.log(`✅ Success! Found ${players.length} players from Blizzard API`);
        setLadderData(players);
        setLastUpdateTime(new Date());
      } else {
        throw new Error("No player data returned from API");
      }
    } catch (err) {
      console.error("Backend API failed:", err);
      setError(`API Error: ${err.message}`);
      setLadderData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Optimized parsing with complete character details for all players
  const parseBlizzardDataEnhanced = useCallback(async (entries, region) => {
    const players = [];
    const limitedEntries = entries.slice(0, 50);
    const batchSize = 8; // Optimized batch size for all character details

    for (let i = 0; i < limitedEntries.length; i += batchSize) {
      const batch = limitedEntries.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (entry, batchIndex) => {
        const index = i + batchIndex;
        
        // Get enhanced character details for ALL players
        let characterDetails = null;
        if (entry.character?.realm?.slug && entry.character?.name) {
          characterDetails = await fetchCharacterDetails(
            entry.character.realm.slug,
            entry.character.name,
            region
          );
        }

        return {
          rank: entry.rank || index + 1,
          player: entry.character?.name || `Player${index + 1}`,
          class: characterDetails?.character_class?.name || 
                 entry.character?.character_class?.name || 
                 "Unknown",
          race: characterDetails?.race?.name || 
                entry.character?.race?.name || 
                "Unknown",
          spec: characterDetails?.active_specialization?.name || 
                entry.character?.active_spec?.name || 
                "Unknown",
          rating: entry.rating || 0,
          wins: entry.season_match_statistics?.won || 0,
          losses: entry.season_match_statistics?.lost || 0,
          realm: characterDetails?.realm?.name || 
                 entry.character?.realm?.name || 
                 "Unknown",
          faction: determineFaction(characterDetails, entry),
        };
      });
      
      const batchResults = await Promise.all(batchPromises);
      players.push(...batchResults);
      
      // Rate limiting for API stability
      if (i + batchSize < limitedEntries.length) {
        await new Promise(resolve => setTimeout(resolve, 150));
      }
    }

    return players;
  }, [fetchCharacterDetails]);

  // Helper function to determine faction
  const determineFaction = useCallback((characterDetails, entry) => {
    const detailsFaction = characterDetails?.faction?.type;
    const entryFaction = entry.character?.faction?.type;
    
    if (detailsFaction === "ALLIANCE" || entryFaction === "ALLIANCE") return "Alliance";
    if (detailsFaction === "HORDE" || entryFaction === "HORDE") return "Horde";
    return Math.random() > 0.5 ? "Alliance" : "Horde"; // Fallback
  }, []);

  // Memoized icon component for better performance
  const ClassIcon = useMemo(() => ({ className, race, spec }) => {
    const getRaceIcon = (raceName) => iconMappings.race[raceName] || defaultIcon;
    const getClassIcon = (className) => iconMappings.class[className] || defaultIcon;
    const getSpecIcon = (specName) => iconMappings.spec[specName] || getClassIcon(className);

    return (
      <div className="flex items-center space-x-1">
        <img 
          src={getRaceIcon(race)} 
          alt={race}
          className="w-6 h-6 rounded border border-gray-600"
          title={race}
          loading="lazy"
        />
        <img 
          src={getClassIcon(className)} 
          alt={className}
          className="w-6 h-6 rounded border border-gray-600"
          title={className}
          loading="lazy"
        />
        <img 
          src={getSpecIcon(spec)} 
          alt={spec}
          className="w-6 h-6 rounded border border-gray-600"
          title={spec}
          loading="lazy"
        />
      </div>
    );
  }, [iconMappings, defaultIcon]);

  // Memoized color functions
  const getRankColor = useCallback((rank, totalPlayers = 1000) => {
    const percentage = (rank / totalPlayers) * 100;
    if (percentage <= 0.1) return "text-orange-400 font-bold";
    if (percentage <= 0.5) return "text-purple-400 font-bold";
    if (percentage <= 3.0) return "text-blue-400 font-semibold";
    if (percentage <= 10.0) return "text-green-400";
    return "text-gray-400";
  }, []);

  const getRankIcon = useCallback((rank, totalPlayers) => {
    const rankColor = getRankColor(rank, totalPlayers);
    const className = `font-bold ${rankColor}`;
    
    if (rank <= 3) return <span className={`text-lg ${className}`}>#{rank}</span>;
    return <span className={`text-sm ${className}`}>#{rank}</span>;
  }, [getRankColor]);

  const getRatingColor = useCallback((rating) => {
    if (rating >= 2800) return "text-orange-400 font-bold";
    if (rating >= 2400) return "text-purple-400 font-bold";
    if (rating >= 2100) return "text-blue-400 font-semibold";
    if (rating >= 1800) return "text-green-400";
    return "text-gray-400";
  }, []);

  const getFactionColor = useCallback((faction) => {
    return faction === "Alliance" ? "text-blue-400" : "text-red-400";
  }, []);

  const formatUpdateTime = useCallback((date) => {
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
  }, []);

  const refreshData = useCallback(() => {
    fetchMoPClassicData(selectedRegion, selectedBracket);
  }, [fetchMoPClassicData, selectedRegion, selectedBracket]);

  // Load data when bracket or region changes
  useEffect(() => {
    fetchMoPClassicData(selectedRegion, selectedBracket);
  }, [selectedBracket, selectedRegion, fetchMoPClassicData]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8 relative">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            MoP Classic Arena Ladder
          </h1>
          <p className="text-gray-400">
            Live Mists of Pandaria Classic Arena Rankings
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
            className="bg-slate-800 hover:bg-slate-700 px-4 py-3 rounded-lg transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/20 border border-red-600 rounded-lg p-4 mb-6">
            <p className="text-red-400 text-center">
              {error}
            </p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-400" />
            <p className="text-gray-400">
              Fetching arena data...
            </p>
          </div>
        )}

        {/* Ladder Table */}
        {!loading && ladderData.length > 0 && (
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
                        {getRankIcon(player.rank, ladderData.length)}
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
                        <ClassIcon className={player.class} race={player.race} spec={player.spec} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${getRatingColor(player.rating)}`}>
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
                        <span className={`text-sm font-medium ${getFactionColor(player.faction)}`}>
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

        {/* No Data State */}
        {!loading && ladderData.length === 0 && !error && (
          <div className="text-center py-12">
            <p className="text-gray-400">No arena data available</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>MoP Classic Arena Ladder • Powered by Blizzard API</p>
        </div>
      </div>
    </div>
  );
};

export default ArenaLadder;
