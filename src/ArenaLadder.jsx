import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Trophy, Sword, Shield, Users, Flag, RefreshCw, Crown, Award } from "lucide-react";

const ArenaLadder = () => {
  const [selectedBracket, setSelectedBracket] = useState("2v2");
  const [selectedRegion, setSelectedRegion] = useState("us");
  const [ladderData, setLadderData] = useState([]);
  const [allBracketData, setAllBracketData] = useState({}); // Store data for all brackets
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false); // Changed from true to false
  const [error, setError] = useState("");
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  
  const PLAYERS_PER_PAGE = 50;

  // Static configurations
  const regions = useMemo(() => ({
    us: { name: "US", flag: "🇺🇸", display: "🇺🇸" },
    eu: { name: "EU", flag: "🇪🇺", display: "🇪🇺" },
  }), []);

  const classColors = useMemo(() => ({
    "Death Knight": "text-[#C41E3A]", // Death Knight red
    "Druid": "text-[#FF7C0A]",        // Druid orange
    "Hunter": "text-[#AAD372]",       // Hunter green
    "Mage": "text-[#3FC7EB]",         // Mage light blue
    "Monk": "text-[#00FF98]",         // Monk jade green
    "Paladin": "text-[#F48CBA]",      // Paladin pink
    "Priest": "text-[#FFFFFF]",       // Priest white
    "Rogue": "text-[#FFF468]",        // Rogue yellow
    "Shaman": "text-[#0070DD]",       // Shaman blue
    "Warlock": "text-[#8788EE]",      // Warlock purple
    "Warrior": "text-[#C69B6D]",      // Warrior tan
  }), []);

  // Get current bracket data
  const currentBracketData = allBracketData[`${selectedRegion}-${selectedBracket}`] || [];

  // Calculate rank cutoffs from current bracket data
  const rankCutoffs = useMemo(() => {
    const totalPlayers = currentBracketData.length;
    if (totalPlayers === 0) return { r1: null, gladiator: null };

    // Find actual R1 and Gladiator cutoffs from the data
    // Sort players by rating (should already be sorted from API)
    const sortedPlayers = [...currentBracketData].sort((a, b) => b.rating - a.rating);
    
    // For now, use the traditional percentage approach until we get API cutoff data
    const r1Count = Math.max(1, Math.ceil(totalPlayers * 0.001)); // Top 0.1%
    const gladiatorCount = Math.max(1, Math.ceil(totalPlayers * 0.005)); // Top 0.5%

    const r1Player = sortedPlayers[r1Count - 1];
    const gladiatorPlayer = sortedPlayers[gladiatorCount - 1];

    return {
      r1: {
        rank: r1Count,
        rating: r1Player?.rating || 0,
        count: r1Count
      },
      gladiator: {
        rank: gladiatorCount,
        rating: gladiatorPlayer?.rating || 0,
        count: gladiatorCount
      },
      totalPlayers
    };
  }, [currentBracketData]);

  // Rank Cutoffs Component
  const RankCutoffs = () => {
    if (!rankCutoffs.r1 || !rankCutoffs.gladiator) return null;

    return (
      <div className="bg-slate-800 rounded-lg shadow-xl p-6 mb-6">
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold text-gray-200 flex items-center justify-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-400" />
            Season 12 Rank Cutoffs
            <Trophy className="h-5 w-5 text-yellow-400" />
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            {selectedBracket} • {regions[selectedRegion].display} • {rankCutoffs.totalPlayers} players
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Rank 1 Cutoff */}
          <div className="bg-gradient-to-r from-orange-900/30 to-orange-800/30 border border-orange-600/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-orange-400" />
                <span className="font-bold text-orange-400">Rank 1</span>
              </div>
              <span className="text-xs text-orange-300 bg-orange-900/50 px-2 py-1 rounded">
                Top 0.1%
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">Cutoff Rating:</span>
                <span className="font-bold text-orange-400 text-lg">
                  {rankCutoffs.r1.rating.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">Cutoff Rank:</span>
                <span className="font-semibold text-orange-300">
                  #{rankCutoffs.r1.rank}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">Total R1s:</span>
                <span className="font-semibold text-orange-300">
                  {rankCutoffs.r1.count} players
                </span>
              </div>
            </div>
          </div>

          {/* Gladiator Cutoff */}
          <div className="bg-gradient-to-r from-purple-900/30 to-purple-800/30 border border-purple-600/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-purple-400" />
                <span className="font-bold text-purple-400">Gladiator</span>
              </div>
              <span className="text-xs text-purple-300 bg-purple-900/50 px-2 py-1 rounded">
                Top 0.5%
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">Cutoff Rating:</span>
                <span className="font-bold text-purple-400 text-lg">
                  {rankCutoffs.gladiator.rating.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">Cutoff Rank:</span>
                <span className="font-semibold text-purple-300">
                  #{rankCutoffs.gladiator.rank}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">Total Glads:</span>
                <span className="font-semibold text-purple-300">
                  {rankCutoffs.gladiator.count} players
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

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
      
      // Mage - FIXED Frost icon
      "Arcane": "https://wow.zamimg.com/images/wow/icons/medium/spell_holy_magicalsentry.jpg",
      "Fire": "https://wow.zamimg.com/images/wow/icons/medium/spell_fire_flamebolt.jpg",
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
    }
  }), []);

  const defaultIcon = "https://wow.zamimg.com/images/wow/icons/medium/inv_misc_questionmark.jpg";

  // Enhanced character detail fetching with error handling
  const fetchCharacterDetails = useCallback(async (realmSlug, characterName, region) => {
    try {
      console.log(`🔍 Fetching details for ${characterName} on ${realmSlug} (${region})`);
      const response = await fetch(
        `/api/character-details?region=${region}&realm=${realmSlug}&character=${characterName.toLowerCase()}`
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Got character details for ${characterName}:`, data);
        return data;
      } else {
        console.warn(`❌ Character details failed for ${characterName}: ${response.status}`);
        return null;
      }
    } catch (error) {
      console.warn(`💥 Failed to fetch character details for ${characterName}:`, error);
      return null;
    }
  }, []);

  // Streamlined data fetching - now loads all brackets for a region
  const fetchAllBracketsData = useCallback(async (region) => {
    setLoading(true);
    setError("");

    try {
      const brackets = ["2v2", "3v3", "5v5"];
      const bracketPromises = brackets.map(async (bracket) => {
        console.log(`Fetching ${region} ${bracket} from backend API...`);

        const response = await fetch(
          `/api/leaderboard?region=${region}&bracket=${bracket}&season=12`
        );

        if (!response.ok) {
          throw new Error(`Backend API failed for ${bracket}: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(`${bracket}: ${data.error}`);
        }

        if (data.entries?.length > 0) {
          console.log(`Found ${data.entries.length} total entries for ${bracket}`);
          const allPlayers = await parseBlizzardDataEnhanced(data.entries, region);
          console.log(`✅ Processed ${allPlayers.length} players for ${bracket}`);
          return { bracket, players: allPlayers };
        } else {
          console.warn(`No data for ${bracket}`);
          return { bracket, players: [] };
        }
      });

      const results = await Promise.all(bracketPromises);
      
      // Store all bracket data
      const newBracketData = {};
      results.forEach(({ bracket, players }) => {
        newBracketData[`${region}-${bracket}`] = players;
      });
      
      setAllBracketData(prev => ({ ...prev, ...newBracketData }));
      setLastUpdateTime(new Date());
      
      // Set initial page data for current bracket
      updatePageData(selectedBracket, region, newBracketData, 1);
      
    } catch (err) {
      console.error("Backend API failed:", err);
      setError(`API Error: ${err.message}`);
      setLadderData([]);
    } finally {
      setLoading(false);
    }
  }, [selectedBracket]);

  // Helper function to update page data
  const updatePageData = useCallback((bracket, region, bracketData = allBracketData, page = 1) => {
    console.log(`updatePageData called: ${bracket}, ${region}, page ${page}`); // Debug log
    
    const data = bracketData[`${region}-${bracket}`] || [];
    console.log(`Data length: ${data.length}`); // Debug log
    
    const newTotalPages = Math.ceil(data.length / PLAYERS_PER_PAGE);
    const startIndex = (page - 1) * PLAYERS_PER_PAGE;
    const endIndex = startIndex + PLAYERS_PER_PAGE;
    const pageData = data.slice(startIndex, endIndex);
    
    console.log(`Page ${page}: showing ${pageData.length} players (${startIndex}-${endIndex})`); // Debug log
    
    setLadderData(pageData);
    setTotalPages(newTotalPages);
    setCurrentPage(page);
  }, [allBracketData]);

  // Fast parsing - use basic data from leaderboard, only fetch details for top players
  const parseBlizzardDataEnhanced = useCallback(async (entries, region) => {
    const players = [];
    console.log(`Processing ${entries.length} players from API (fast mode)...`);

    // Process most players with basic data (no API calls)
    const basicPlayers = entries.map((entry, index) => ({
      rank: entry.rank || index + 1,
      player: entry.character?.name || `Player${index + 1}`,
      class: entry.character?.character_class?.name || "Unknown",
      race: entry.character?.race?.name || "Unknown", 
      spec: entry.character?.active_spec?.name || "Unknown",
      rating: entry.rating || 0,
      wins: entry.season_match_statistics?.won || 0,
      losses: entry.season_match_statistics?.lost || 0,
      realm: entry.character?.realm?.name || "Unknown",
      faction: entry.character?.faction?.type === "ALLIANCE" ? "Alliance" : 
               entry.character?.faction?.type === "HORDE" ? "Horde" : 
               Math.random() > 0.5 ? "Alliance" : "Horde", // Fallback
    }));

    // Only fetch detailed info for top 50 players (for enhanced data)
    const topPlayers = entries.slice(0, 50);
    const batchSize = 10;
    
    console.log(`Fetching enhanced details for top 50 players...`);
    
    for (let i = 0; i < topPlayers.length; i += batchSize) {
      const batch = topPlayers.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (entry, batchIndex) => {
        const index = i + batchIndex;
        
        let characterDetails = null;
        if (entry.character?.realm?.slug && entry.character?.name) {
          characterDetails = await fetchCharacterDetails(
            entry.character.realm.slug,
            entry.character.name,
            region
          );
        }

        // Update the basic player data with enhanced details
        if (characterDetails) {
          basicPlayers[index] = {
            ...basicPlayers[index],
            class: characterDetails.character_class?.name || basicPlayers[index].class,
            race: characterDetails.race?.name || basicPlayers[index].race,
            spec: characterDetails.active_specialization?.name || basicPlayers[index].spec,
            realm: characterDetails.realm?.name || basicPlayers[index].realm,
            faction: characterDetails.faction?.type === "ALLIANCE" ? "Alliance" : 
                    characterDetails.faction?.type === "HORDE" ? "Horde" : 
                    basicPlayers[index].faction,
          };
        }
      });
      
      await Promise.all(batchPromises);
      
      // Small delay between batches
      if (i + batchSize < topPlayers.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`✅ Processed ${basicPlayers.length} players (enhanced details for top 50)`);
    return basicPlayers;
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
    
    // WoW PvP Title Cutoffs based on actual percentages
    if (percentage <= 0.1) return "text-orange-400 font-bold"; // R1 - Orange (Top 0.1%)
    if (percentage <= 0.5) return "text-purple-400 font-bold"; // Gladiator - Purple (Top 0.5%)
    if (percentage <= 3.0) return "text-blue-400 font-semibold"; // Duelist - Blue (Top 3%)
    return "text-gray-400"; // Everything else - Grey
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

  // Updated pagination functions to work with current bracket data
  const goToPage = useCallback((page) => {
    if (page >= 1 && page <= totalPages) {
      console.log(`Going to page ${page}`); // Debug log
      updatePageData(selectedBracket, selectedRegion, allBracketData, page);
    }
  }, [selectedBracket, selectedRegion, allBracketData, totalPages, updatePageData]);

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      console.log(`Next page: ${currentPage + 1}`); // Debug log
      goToPage(currentPage + 1);
    }
  }, [currentPage, totalPages, goToPage]);

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      console.log(`Previous page: ${currentPage - 1}`); // Debug log
      goToPage(currentPage - 1);
    }
  }, [currentPage, goToPage]);

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
    fetchAllBracketsData(selectedRegion);
  }, [fetchAllBracketsData, selectedRegion]);

  // Load all bracket data when region changes - automatically on startup
  useEffect(() => {
    fetchAllBracketsData(selectedRegion);
  }, [selectedRegion, fetchAllBracketsData]);

  // Update page data when bracket changes (instant switching)
  useEffect(() => {
    if (allBracketData[`${selectedRegion}-${selectedBracket}`]) {
      updatePageData(selectedBracket, selectedRegion, allBracketData, 1);
    }
  }, [selectedBracket, selectedRegion, allBracketData, updatePageData]);

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
                <span>{region.display}</span>
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

        {/* Rank Cutoffs */}
        {!loading && currentBracketData.length > 0 && <RankCutoffs />}

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/20 border border-red-600 rounded-lg p-4 mb-6">
            <p className="text-red-400 text-center">
              {error}
            </p>
          </div>
        )}

        {/* Loading State - show when actually loading */}
        {loading && (
          <div className="text-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-400" />
            <p className="text-gray-400 text-lg">
              Loading {regions[selectedRegion].display} Arena Data...
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Processing thousands of players (enhanced details for top 50)
            </p>
            <div className="mt-4 text-xs text-gray-600">
              Loading 2v2, 3v3, and 5v5 brackets
            </div>
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
                        {getRankIcon(player.rank, currentBracketData.length)}
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

        {/* Pagination */}
        {!loading && currentBracketData.length > PLAYERS_PER_PAGE && (
          <div className="flex justify-center items-center space-x-4 mt-8">
            <button
              onClick={prevPage}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors duration-200"
            >
              Previous
            </button>
            
            <div className="flex items-center space-x-2">
              {/* Show page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={(e) => {
                      e.preventDefault();
                      console.log(`Button clicked for page ${pageNum}`);
                      goToPage(pageNum);
                    }}
                    className={`px-3 py-2 rounded-md transition-colors duration-200 ${
                      currentPage === pageNum
                        ? "bg-blue-600 text-white"
                        : "bg-slate-700 hover:bg-slate-600 text-gray-300"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={nextPage}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors duration-200"
            >
              Next
            </button>
            
            <div className="text-sm text-gray-400">
              Page {currentPage} of {totalPages} ({currentBracketData.length} total players)
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
