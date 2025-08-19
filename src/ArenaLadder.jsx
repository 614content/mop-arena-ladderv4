import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Trophy, Sword, Shield, Users, RefreshCw, Crown, Award } from "lucide-react";

const ArenaLadder = () => {
  const [selectedBracket, setSelectedBracket] = useState("2v2");
  const [selectedRegion, setSelectedRegion] = useState("us");
  const [ladderData, setLadderData] = useState([]);
  const [allBracketData, setAllBracketData] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [cutoffData, setCutoffData] = useState({});
  
  const PLAYERS_PER_PAGE = 50;

  // Static configurations
  const regions = useMemo(() => ({
    us: { name: "US", flag: "🇺🇸", display: "🇺🇸" },
    eu: { name: "EU", flag: "🇪🇺", display: "🇪🇺" },
  }), []);

  const classColors = useMemo(() => ({
    "Death Knight": "text-[#C41E3A]",
    "Druid": "text-[#FF7C0A]",
    "Hunter": "text-[#AAD372]",
    "Mage": "text-[#3FC7EB]",
    "Monk": "text-[#00FF98]",
    "Paladin": "text-[#F48CBA]",
    "Priest": "text-[#FFFFFF]",
    "Rogue": "text-[#FFF468]",
    "Shaman": "text-[#0070DD]",
    "Warlock": "text-[#8788EE]",
    "Warrior": "text-[#C69B6D]",
  }), []);

  // Get current bracket data
  const currentBracketData = allBracketData[`${selectedRegion}-${selectedBracket}`] || [];
  const currentCutoffs = cutoffData[`${selectedRegion}-${selectedBracket}`] || {};

  // Fetch real cutoffs from Blizzard API
  const fetchCutoffs = useCallback(async (region, bracket) => {
    try {
      console.log(`🏆 Fetching cutoffs for ${region} ${bracket}...`);
      
      // Try to get cutoffs from Blizzard API first
      const response = await fetch(
        `/api/pvp-titles?region=${region}&bracket=${bracket}&season=12`
      );

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Got real cutoffs from Blizzard API:`, data);
        return data;
      } else {
        console.warn(`❌ Blizzard cutoffs failed, calculating from leaderboard...`);
        // Fallback to calculated cutoffs
        return await calculateCutoffsFromLeaderboard(region, bracket);
      }
    } catch (error) {
      console.warn(`💥 Failed to fetch cutoffs, using fallback:`, error);
      return await calculateCutoffsFromLeaderboard(region, bracket);
    }
  }, []);

  // Fallback: calculate cutoffs from leaderboard data
  const calculateCutoffsFromLeaderboard = useCallback(async (region, bracket) => {
    try {
      const response = await fetch(
        `/api/leaderboard?region=${region}&bracket=${bracket}&season=12`
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      if (!data.entries || data.entries.length === 0) return null;
      
      const totalPlayers = data.entries.length;
      const sortedPlayers = data.entries.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      
      const cutoffs = {};
      
      // Use ironforge.pro style cutoffs (more accurate percentages)
      // R1: ~0.1% (but check actual rank ranges)
      const r1Count = Math.max(1, Math.ceil(totalPlayers * 0.0006)); // Slightly lower than 0.1%
      if (sortedPlayers[r1Count - 1]) {
        cutoffs.r1 = {
          rank: r1Count,
          rating: sortedPlayers[r1Count - 1].rating || 0,
          count: r1Count
        };
      }
      
      // Gladiator: ~0.5%
      const gladCount = Math.max(1, Math.ceil(totalPlayers * 0.005));
      if (sortedPlayers[gladCount - 1]) {
        cutoffs.gladiator = {
          rank: gladCount,
          rating: sortedPlayers[gladCount - 1].rating || 0,
          count: gladCount
        };
      }
      
      return cutoffs;
    } catch (error) {
      console.error('Failed to calculate cutoffs:', error);
      return null;
    }
  }, []);

  // Rank Cutoffs Component - simplified, no duelist
  const RankCutoffs = () => {
    if (!currentCutoffs.r1 && !currentCutoffs.gladiator) return null;

    const totalPlayers = currentBracketData.length;

    return (
      <div className="bg-slate-800 rounded-lg shadow-xl p-6 mb-6">
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold text-gray-200 flex items-center justify-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-400" />
            Season 12 Rank Cutoffs
            <Trophy className="h-5 w-5 text-yellow-400" />
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            {selectedBracket} • {regions[selectedRegion].display} • {totalPlayers} players
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Rank 1 Cutoff */}
          {currentCutoffs.r1 && (
            <div className="bg-gradient-to-r from-orange-900/30 to-orange-800/30 border border-orange-600/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-orange-400" />
                  <span className="font-bold text-orange-400">Rank 1</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 text-sm">Cutoff Rating:</span>
                  <span className="font-bold text-orange-400 text-lg">
                    {currentCutoffs.r1.rating?.toLocaleString() || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 text-sm">Ranks:</span>
                  <span className="font-semibold text-orange-300">
                    ~{currentCutoffs.r1.rangeStart || 1}-{currentCutoffs.r1.rangeEnd || currentCutoffs.r1.rank}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Gladiator Cutoff */}
          {currentCutoffs.gladiator && (
            <div className="bg-gradient-to-r from-purple-900/30 to-purple-800/30 border border-purple-600/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-purple-400" />
                  <span className="font-bold text-purple-400">Gladiator</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 text-sm">Cutoff Rating:</span>
                  <span className="font-bold text-purple-400 text-lg">
                    {currentCutoffs.gladiator.rating?.toLocaleString() || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 text-sm">Ranks:</span>
                  <span className="font-semibold text-purple-300">
                    ~{currentCutoffs.gladiator.rangeStart || (currentCutoffs.r1?.rangeEnd + 1 || 1)}-{currentCutoffs.gladiator.rangeEnd || currentCutoffs.gladiator.rank}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Icon mappings
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
      "Fire": "https://wow.zamimg.com/images/wow/icons/medium/spell_fire_flamebolt.jpg",
      "Frost": "https://wow.zamimg.com/images/wow/icons/medium/spell_frost_frostbolt02.jpg",
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

  // Enhanced character detail fetching
  const fetchCharacterDetails = useCallback(async (realmSlug, characterName, region) => {
    try {
      const response = await fetch(
        `/api/character-details?region=${region}&realm=${realmSlug}&character=${characterName.toLowerCase()}`
      );
      
      if (response.ok) {
        const data = await response.json();
        return data;
      }
      return null;
    } catch (error) {
      console.warn(`Failed to fetch character details for ${characterName}:`, error);
      return null;
    }
  }, []);

  // Fast initial load - only fetch first 50 players with full details
  const fetchInitialData = useCallback(async (region, bracket) => {
    try {
      console.log(`🚀 Fast loading first 50 players for ${region} ${bracket}...`);
      
      const response = await fetch(
        `/api/leaderboard?region=${region}&bracket=${bracket}&season=12&limit=50`
      );

      if (!response.ok) {
        throw new Error(`API failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Process first 50 with full details
      const initialPlayers = await parseBlizzardDataEnhanced(data.entries, region, true);
      
      return initialPlayers;
    } catch (error) {
      console.error("Initial data fetch failed:", error);
      throw error;
    }
  }, []);

  // Background prefetch for remaining data
  const prefetchRemainingData = useCallback(async (region, bracket) => {
    try {
      console.log(`📦 Background loading remaining data for ${region} ${bracket}...`);
      
      const response = await fetch(
        `/api/leaderboard?region=${region}&bracket=${bracket}&season=12&skip=50`
      );

      if (!response.ok) {
        throw new Error(`API failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Process remaining players with basic data (no individual API calls)
      const remainingPlayers = await parseBlizzardDataEnhanced(data.entries, region, false, 50);
      
      return remainingPlayers;
    } catch (error) {
      console.error("Background prefetch failed:", error);
      return [];
    }
  }, []);

  // Smart data loading strategy
  const loadBracketData = useCallback(async (region, bracket, isInitial = false) => {
    const key = `${region}-${bracket}`;
    
    if (isInitial) {
      setInitialLoading(true);
      setError("");
      
      try {
        // Step 1: Load first 50 players instantly
        const initialPlayers = await fetchInitialData(region, bracket);
        
        // Step 2: Load cutoffs
        const cutoffs = await fetchCutoffs(region, bracket);
        if (cutoffs) {
          setCutoffData(prev => ({ ...prev, [key]: cutoffs }));
        }
        
        // Step 3: Update state with first 50
        setAllBracketData(prev => ({ ...prev, [key]: initialPlayers }));
        updatePageData(bracket, region, { ...allBracketData, [key]: initialPlayers }, 1);
        setInitialLoading(false);
        
        // Step 4: Background load remaining data
        const remainingPlayers = await prefetchRemainingData(region, bracket);
        
        // Step 5: Merge all data
        const allPlayers = [...initialPlayers, ...remainingPlayers];
        setAllBracketData(prev => ({ ...prev, [key]: allPlayers }));
        updatePageData(bracket, region, { ...allBracketData, [key]: allPlayers }, currentPage);
        
        setLastUpdateTime(new Date());
        
      } catch (error) {
        setError(`Failed to load ${bracket} data: ${error.message}`);
        setInitialLoading(false);
      }
    } else {
      // For non-initial loads, check if we already have data
      if (!allBracketData[key] || allBracketData[key].length === 0) {
        setLoading(true);
        try {
          const initialPlayers = await fetchInitialData(region, bracket);
          const cutoffs = await fetchCutoffs(region, bracket);
          
          if (cutoffs) {
            setCutoffData(prev => ({ ...prev, [key]: cutoffs }));
          }
          
          setAllBracketData(prev => ({ ...prev, [key]: initialPlayers }));
          updatePageData(bracket, region, { ...allBracketData, [key]: initialPlayers }, 1);
          
          // Background load the rest
          const remainingPlayers = await prefetchRemainingData(region, bracket);
          const allPlayers = [...initialPlayers, ...remainingPlayers];
          setAllBracketData(prev => ({ ...prev, [key]: allPlayers }));
          
        } catch (error) {
          setError(`Failed to load ${bracket} data: ${error.message}`);
        } finally {
          setLoading(false);
        }
      }
    }
  }, [fetchInitialData, fetchCutoffs, prefetchRemainingData, allBracketData, currentPage]);

  // Enhanced parsing with better character data handling
  const parseBlizzardDataEnhanced = useCallback(async (entries, region, withFullDetails = false, startRank = 0) => {
    const players = [];
    console.log(`Processing ${entries.length} players (full details: ${withFullDetails})...`);

    if (withFullDetails) {
      // Process with full details (for first 50)
      const batchSize = 10;
      
      for (let i = 0; i < entries.length; i += batchSize) {
        const batch = entries.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (entry, batchIndex) => {
          const rank = startRank + i + batchIndex + 1;
          
          let characterDetails = null;
          if (entry.character?.realm?.slug && entry.character?.name) {
            characterDetails = await fetchCharacterDetails(
              entry.character.realm.slug,
              entry.character.name,
              region
            );
          }

          // Better data merging - prioritize API data, fallback to leaderboard data
          const mergedCharacter = {
            name: entry.character?.name || `Player${rank}`,
            class: (characterDetails?.character_class?.name || 
                   entry.character?.character_class?.name || 
                   characterDetails?.class?.name || 
                   "Unknown"),
            race: (characterDetails?.race?.name || 
                  entry.character?.race?.name || 
                  "Unknown"),
            spec: (characterDetails?.active_specialization?.name || 
                  characterDetails?.active_spec?.name ||
                  entry.character?.active_spec?.name || 
                  "Unknown"),
            realm: (characterDetails?.realm?.name || 
                   entry.character?.realm?.name || 
                   "Unknown"),
            faction: determineFaction(characterDetails, entry)
          };

          return {
            rank,
            player: mergedCharacter.name,
            class: mergedCharacter.class,
            race: mergedCharacter.race,
            spec: mergedCharacter.spec,
            rating: entry.rating || 0,
            wins: entry.season_match_statistics?.won || 0,
            losses: entry.season_match_statistics?.lost || 0,
            realm: mergedCharacter.realm,
            faction: mergedCharacter.faction,
          };
        });
        
        const batchResults = await Promise.all(batchPromises);
        players.push(...batchResults);
        
        // Small delay between batches
        if (i + batchSize < entries.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
    } else {
      // Process with basic data only (much faster)
      entries.forEach((entry, index) => {
        const rank = startRank + index + 1;
        
        // Better fallback data extraction
        const character = entry.character || {};
        
        players.push({
          rank,
          player: character.name || `Player${rank}`,
          class: character.character_class?.name || character.class?.name || "Unknown",
          race: character.race?.name || "Unknown",
          spec: character.active_spec?.name || character.spec?.name || "Unknown",
          rating: entry.rating || 0,
          wins: entry.season_match_statistics?.won || 0,
          losses: entry.season_match_statistics?.lost || 0,
          realm: character.realm?.name || "Unknown",
          faction: character.faction?.type === "ALLIANCE" ? "Alliance" : 
                  character.faction?.type === "HORDE" ? "Horde" : 
                  Math.random() > 0.5 ? "Alliance" : "Horde",
        });
      });
    }

    return players;
  }, [fetchCharacterDetails]);

  // Better faction determination
  const determineFaction = useCallback((characterDetails, entry) => {
    // Check character details first
    if (characterDetails?.faction?.type === "ALLIANCE") return "Alliance";
    if (characterDetails?.faction?.type === "HORDE") return "Horde";
    
    // Check entry data
    if (entry.character?.faction?.type === "ALLIANCE") return "Alliance";
    if (entry.character?.faction?.type === "HORDE") return "Horde";
    
    // Determine by race if no faction data
    const race = characterDetails?.race?.name || entry.character?.race?.name;
    const allianceRaces = ["Human", "Dwarf", "Night Elf", "Gnome", "Draenei", "Worgen"];
    const hordeRaces = ["Orc", "Undead", "Tauren", "Troll", "Blood Elf", "Goblin", "Forsaken"];
    
    if (race && allianceRaces.includes(race)) return "Alliance";
    if (race && hordeRaces.includes(race)) return "Horde";
    
    // Last resort fallback
    return Math.random() > 0.5 ? "Alliance" : "Horde";
  }, []);

  // Update page data helper
  const updatePageData = useCallback((bracket, region, bracketData = allBracketData, page = 1) => {
    const data = bracketData[`${region}-${bracket}`] || [];
    const newTotalPages = Math.ceil(data.length / PLAYERS_PER_PAGE);
    const startIndex = (page - 1) * PLAYERS_PER_PAGE;
    const endIndex = startIndex + PLAYERS_PER_PAGE;
    const pageData = data.slice(startIndex, endIndex);
    
    setLadderData(pageData);
    setTotalPages(newTotalPages);
    setCurrentPage(page);
  }, [allBracketData]);

  // Icon component
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

  // Color and styling functions using real cutoffs
  const getRankColor = useCallback((rank, cutoffs) => {
    if (cutoffs.r1 && rank <= (cutoffs.r1.rangeEnd || cutoffs.r1.rank)) return "text-orange-400 font-bold";
    if (cutoffs.gladiator && rank <= (cutoffs.gladiator.rangeEnd || cutoffs.gladiator.rank)) return "text-purple-400 font-bold";
    return "text-gray-400";
  }, []);

  const getRankIcon = useCallback((rank, cutoffs) => {
    const rankColor = getRankColor(rank, cutoffs);
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

  // Pagination functions with instant switching
  const goToPage = useCallback((page) => {
    if (page >= 1 && page <= totalPages) {
      updatePageData(selectedBracket, selectedRegion, allBracketData, page);
    }
  }, [selectedBracket, selectedRegion, allBracketData, totalPages, updatePageData]);

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  }, [currentPage, totalPages, goToPage]);

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
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
    // Clear existing data and reload
    setAllBracketData({});
    setCutoffData({});
    loadBracketData(selectedRegion, selectedBracket, true);
  }, [loadBracketData, selectedRegion, selectedBracket]);

  // Initial load on mount
  useEffect(() => {
    loadBracketData(selectedRegion, selectedBracket, true);
  }, []);

  // Load data when region changes
  useEffect(() => {
    const brackets = ["2v2", "3v3", "5v5"];
    brackets.forEach(bracket => {
      loadBracketData(selectedRegion, bracket, bracket === selectedBracket);
    });
  }, [selectedRegion]);

  // Instant bracket switching
  useEffect(() => {
    if (allBracketData[`${selectedRegion}-${selectedBracket}`]) {
      updatePageData(selectedBracket, selectedRegion, allBracketData, 1);
    } else {
      loadBracketData(selectedRegion, selectedBracket, false);
    }
  }, [selectedBracket]);

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

        {/* Loading Progress for Initial Load */}
        {initialLoading && (
          <div className="bg-slate-800 rounded-lg p-6 mb-6">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-400" />
              <h3 className="text-lg font-semibold mb-2">Loading Arena Data</h3>
              <p className="text-gray-400">
                Loading {regions[selectedRegion].display} {selectedBracket} ladder...
              </p>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-8">
          {/* Region Selector */}
          <div className="bg-slate-800 rounded-lg p-1 flex">
            {Object.entries(regions).map(([key, region]) => (
              <button
                key={key}
                onClick={() => setSelectedRegion(key)}
                disabled={initialLoading}
                className={`px-4 py-2 rounded-md font-semibold transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 ${
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
                disabled={initialLoading}
                className={`px-6 py-3 rounded-md font-semibold transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 ${
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
            disabled={loading || initialLoading}
            className="bg-slate-800 hover:bg-slate-700 px-4 py-3 rounded-lg transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${(loading || initialLoading) ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Rank Cutoffs */}
        {!initialLoading && currentBracketData.length > 0 && <RankCutoffs />}

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/20 border border-red-600 rounded-lg p-4 mb-6">
            <p className="text-red-400 text-center">
              {error}
            </p>
          </div>
        )}

        {/* Secondary Loading State - for bracket switching */}
        {loading && !initialLoading && (
          <div className="text-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-400" />
            <p className="text-gray-400">
              Loading {selectedBracket} data...
            </p>
          </div>
        )}

        {/* Ladder Table */}
        {!initialLoading && ladderData.length > 0 && (
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
                        {getRankIcon(player.rank, currentCutoffs)}
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
        {!initialLoading && currentBracketData.length > PLAYERS_PER_PAGE && (
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
                    onClick={() => goToPage(pageNum)}
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
        {!initialLoading && !loading && ladderData.length === 0 && !error && (
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
