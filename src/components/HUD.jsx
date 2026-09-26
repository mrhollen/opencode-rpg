import React, { useState } from 'react';
import {
  Castle,
  Search,
  Volume2,
  VolumeX,
  Tv,
  Sun,
  Moon,
  HelpCircle,
  Sparkles,
  Coins,
  ChevronDown,
  Clock,
  Filter,
  Users,
  Compass,
  Zap,
  Hammer,
  Music,
  Scroll,
  Trees,
} from 'lucide-react';
import sound from './SoundEngine';
import { formatMana, formatGoldCost } from '../utils/rpgHelpers';

const BIOME_NAMES = {
  forest: { name: 'Verdant Forest', icon: '🌲' },
  desert: { name: 'Desert Citadel', icon: '🏜️' },
  snow: { name: 'Snow Fortress', icon: '❄️' },
  void: { name: 'Arcane Void', icon: '🔮' },
};

export default function HUD({
  currentProject,
  projects = [],
  sessions = [],
  onOpenWorldSelect,
  onOpenHelp,
  onOpenForge,
  onOpenTreasury,
  onOpenScribe,
  onOpenStargate,
  onOpenQueue,
  gpuStatus = 'idle',
  onSelectSession,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  isMuted,
  onToggleMute,
  isBgmPlaying,
  onToggleBgm,
  isCrtActive,
  onToggleCrt,
  isNightMode,
  onToggleNight,
  currentBiome = 'forest',
  onCycleBiome,
}) {
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Compute Realm Totals
  const activeSessionsCount = sessions.filter(
    (s) => s.status === 'active' || (!s.time_archived && !s.revert)
  ).length;

  const totalTokens = sessions.reduce(
    (acc, s) => acc + (s.tokens_input || 0) + (s.tokens_output || 0),
    0
  );

  const totalCost = sessions.reduce((acc, s) => acc + (s.cost || 0), 0);

  // Format Realm Name
  const realmName = currentProject
    ? currentProject.fantasyName ||
      `Realm of ${(currentProject.name || currentProject.worktree?.split('/').pop() || 'Arcane')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())}`
    : 'The OpenCode Realm';

  // Search Results preview
  const searchResults = searchQuery.trim()
    ? sessions
        .filter((s) => {
          const q = searchQuery.toLowerCase();
          const titleMatch = (s.title || '').toLowerCase().includes(q);
          const slugMatch = (s.slug || '').toLowerCase().includes(q);
          const agentMatch = (s.agent || '').toLowerCase().includes(q);
          return titleMatch || slugMatch || agentMatch;
        })
        .slice(0, 6)
    : [];

  const handleSelectSearchResult = (sess) => {
    sound.playScroll();
    onSelectSession(sess);
    setShowSearchDropdown(false);
  };

  const biomeInfo = BIOME_NAMES[currentBiome] || BIOME_NAMES.forest;

  return (
    <div className="fixed top-0 left-0 right-0 z-40 pointer-events-none p-2 sm:p-3 space-y-2">
      {/* Top Main HUD Bar */}
      <div className="pointer-events-auto bg-stone-950/90 border-b-4 border-amber-900/80 shadow-2xl rounded-lg p-2 sm:px-4 sm:py-2 flex flex-wrap items-center justify-between gap-3 text-stone-200">
        {/* Left: Realm Selector Button */}
        <button
          onClick={() => {
            sound.playClick();
            onOpenWorldSelect();
          }}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-stone-900/90 border-2 border-amber-600/70 hover:border-amber-400 hover:bg-amber-950/40 transition-all cursor-pointer group shadow"
          title="Switch Realm / Project"
        >
          <div className="w-8 h-8 rounded bg-stone-950 border border-amber-600 flex items-center justify-center text-lg shadow-inner group-hover:scale-105 transition-transform">
            🏰
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="font-medieval font-bold text-amber-300 text-sm tracking-wide">
                {realmName}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-amber-500 group-hover:translate-y-0.5 transition-transform" />
            </div>
            <div className="text-[10px] text-stone-400 font-mono flex items-center gap-2">
              <span>{sessions.length} Huts</span>
              <span>•</span>
              <span className="text-amber-400 font-semibold">{formatGoldCost(totalCost)}</span>
            </div>
          </div>
        </button>

        {/* Center: Realm Stats Badges & Station Shortcuts */}
        <div className="hidden lg:flex items-center gap-2.5 text-xs font-vt bg-stone-900/80 px-3 py-1.5 rounded border border-stone-800">
          {/* Active Agents Badge */}
          <div className="flex items-center gap-2 px-2 py-0.5 rounded bg-stone-950/80 border border-stone-800">
            <span
              className={`w-2 h-2 rounded-full ${
                activeSessionsCount > 0 ? 'bg-emerald-400 pulse-indicator' : 'bg-stone-600'
              }`}
            />
            <span className="text-stone-300">
              <strong className="text-emerald-400 font-bold">{activeSessionsCount}</strong>{' '}
              {activeSessionsCount === 1 ? 'Agent Working' : 'Agents Working'}
            </span>
          </div>

          <div className="text-stone-600">|</div>

          {/* Total Tokens / Mana */}
          <div className="flex items-center gap-1.5 text-stone-300">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>Realm Mana:</span>
            <strong className="text-sky-300">{formatMana(totalTokens)}</strong>
          </div>

          <div className="text-stone-600">|</div>

          {/* Treasury Shortcut */}
          <button
            onClick={() => {
              sound.playCoin();
              onOpenTreasury?.();
            }}
            className="flex items-center gap-1.5 text-stone-300 hover:text-amber-300 hover:bg-stone-800/80 px-2 py-0.5 rounded transition-colors cursor-pointer"
            title="Inspect Royal Treasury Analytics"
          >
            <Coins className="w-3.5 h-3.5 text-yellow-500" />
            <span>Treasury:</span>
            <strong className="text-amber-300 underline decoration-dotted">{formatGoldCost(totalCost)}</strong>
          </button>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Station Shortcuts (Forge, Treasury, Scribe) */}
          <button
            onClick={() => {
              sound.playHammer();
              onOpenForge?.();
            }}
            className="p-1.5 px-2 bg-stone-900 hover:bg-amber-950/50 border border-stone-700 hover:border-amber-600 text-stone-300 hover:text-amber-300 rounded text-xs font-pixel flex items-center gap-1 transition-all cursor-pointer"
            title="Open Forge Diffs"
          >
            <span>⚒️</span>
            <span className="hidden sm:inline text-[10px]">Forge</span>
          </button>

          <button
            onClick={() => {
              sound.playScroll();
              onOpenScribe?.();
            }}
            className="p-1.5 px-2 bg-stone-900 hover:bg-amber-950/50 border border-stone-700 hover:border-amber-600 text-stone-300 hover:text-amber-300 rounded text-xs font-pixel flex items-center gap-1 transition-all cursor-pointer"
            title="Open Royal Scribe Tale"
          >
            <span>🪶</span>
            <span className="hidden sm:inline text-[10px]">Scribe</span>
          </button>

          {/* Stargate Portal Button */}
          <button
            onClick={() => {
              sound.playDhdClick();
              onOpenStargate?.();
            }}
            className="p-1.5 px-2 bg-slate-900 hover:bg-cyan-950/60 border border-cyan-700/80 hover:border-cyan-400 text-cyan-300 rounded text-xs font-pixel flex items-center gap-1 transition-all cursor-pointer shadow-sm shadow-cyan-950/40"
            title="Stargate Command / Galactic World Map"
          >
            <span>🌌</span>
            <span className="hidden sm:inline text-[10px]">Stargate</span>
          </button>

          {/* Single-GPU Safety Queue Button */}
          <button
            onClick={() => {
              sound.playClick();
              onOpenQueue?.();
            }}
            className={`p-1.5 px-2 border rounded text-xs font-pixel flex items-center gap-1.5 transition-all cursor-pointer ${
              gpuStatus === 'busy'
                ? 'bg-amber-950/70 border-amber-500 text-amber-300 shadow-sm shadow-amber-950/50'
                : 'bg-stone-900 border-stone-700 text-stone-300 hover:text-emerald-300 hover:border-emerald-600'
            }`}
            title={`Single-GPU Safety Queue (${gpuStatus === 'busy' ? 'GPU BUSY - Generating' : 'GPU IDLE - Ready'})`}
          >
            <span className={`w-2 h-2 rounded-full ${gpuStatus === 'busy' ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
            <span className="hidden sm:inline text-[10px]">Queue</span>
          </button>

          {/* Biome Cycle Button */}
          <button
            onClick={() => {
              sound.playPortal();
              onCycleBiome?.();
            }}
            className="p-1.5 px-2 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 hover:text-amber-300 rounded text-xs font-pixel flex items-center gap-1 transition-all cursor-pointer"
            title={`Current Biome: ${biomeInfo.name} (Click to Cycle)`}
          >
            <span>{biomeInfo.icon}</span>
            <span className="hidden md:inline text-[10px]">{biomeInfo.name.split(' ')[0]}</span>
          </button>

          {/* Procedural Chiptune BGM Button */}
          <button
            onClick={() => {
              onToggleBgm?.();
            }}
            className={`p-2 rounded border transition-all cursor-pointer ${
              isBgmPlaying
                ? 'bg-amber-950/80 border-amber-500 text-amber-300 shadow-sm shadow-amber-900/40'
                : 'bg-stone-900 border-stone-700 text-stone-500 hover:text-stone-300'
            }`}
            title={isBgmPlaying ? 'Pause 8-Bit Chiptune BGM' : 'Play 8-Bit Chiptune BGM'}
          >
            <Music className={`w-4 h-4 ${isBgmPlaying ? 'animate-bounce' : ''}`} />
          </button>

          {/* Day / Night Toggle */}
          <button
            onClick={() => {
              sound.playClick();
              onToggleNight();
            }}
            className={`p-2 rounded border transition-all cursor-pointer ${
              isNightMode
                ? 'bg-indigo-950/80 border-indigo-500 text-indigo-300 shadow-sm shadow-indigo-900/50'
                : 'bg-stone-900 border-stone-700 text-amber-400 hover:bg-stone-800'
            }`}
            title={isNightMode ? 'Switch to Day (Dawn)' : 'Switch to Night (Lanterns)'}
          >
            {isNightMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          {/* Retro CRT Scanline Toggle */}
          <button
            onClick={() => {
              sound.playClick();
              onToggleCrt();
            }}
            className={`p-2 rounded border transition-all cursor-pointer ${
              isCrtActive
                ? 'bg-amber-950/80 border-amber-500 text-amber-300'
                : 'bg-stone-900 border-stone-700 text-stone-400 hover:text-stone-200'
            }`}
            title="Toggle Vintage CRT Scanlines"
          >
            <Tv className="w-4 h-4" />
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => {
              onToggleMute();
            }}
            className={`p-2 rounded border transition-all cursor-pointer ${
              !isMuted
                ? 'bg-stone-900 border-stone-700 text-emerald-400 hover:bg-stone-800'
                : 'bg-stone-900 border-stone-700 text-stone-500 hover:text-stone-300'
            }`}
            title={isMuted ? 'Unmute SFX' : 'Mute SFX'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Overseer Grimoire / Help */}
          <button
            onClick={() => {
              sound.playClick();
              onOpenHelp();
            }}
            className="p-2 rounded bg-amber-950/70 border border-amber-600/80 text-amber-300 hover:bg-amber-900 transition-all cursor-pointer"
            title="Open Grimoire / Guide"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Secondary Bar: Search & Quick Filters */}
      <div className="pointer-events-auto max-w-xl mx-auto flex items-center gap-2 bg-stone-950/80 backdrop-blur-md border border-stone-800/90 rounded-lg p-1.5 shadow-lg relative">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchDropdown(true);
            }}
            onFocus={() => setShowSearchDropdown(true)}
            placeholder="Search huts, quests, or agent classes..."
            className="w-full bg-stone-900/90 border border-stone-800 rounded pl-8 pr-3 py-1 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-600 font-sans"
          />

          {/* Quick Search Dropdown Results */}
          {showSearchDropdown && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-stone-950 border-2 border-amber-700/80 rounded-lg shadow-2xl overflow-hidden z-50">
              <div className="p-1.5 bg-stone-900 border-b border-stone-800 text-[10px] font-pixel text-amber-400">
                MATCHING HUTS ({searchResults.length})
              </div>
              <div className="max-h-60 overflow-y-auto p-1 space-y-1">
                {searchResults.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => handleSelectSearchResult(s)}
                    className="p-2 rounded bg-stone-900/60 hover:bg-amber-950/40 border border-transparent hover:border-amber-600 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="font-medieval text-xs text-amber-200 font-bold truncate max-w-xs">
                        {s.title}
                      </div>
                      <div className="text-[10px] text-stone-400 font-mono">
                        {s.slug || s.id?.slice(0, 8)}
                      </div>
                    </div>
                    <span className="text-[10px] font-pixel text-amber-400">
                      {formatMana((s.tokens_input || 0) + (s.tokens_output || 0))} M
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick Filter: All vs Active */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => {
              sound.playClick();
              setStatusFilter('all');
            }}
            className={`px-2 py-1 text-[10px] font-pixel rounded transition-all ${
              statusFilter === 'all'
                ? 'bg-amber-800 text-amber-100 border border-amber-500'
                : 'bg-stone-900 text-stone-400 border border-stone-800 hover:text-stone-200'
            }`}
          >
            All ({sessions.length})
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setStatusFilter('active');
            }}
            className={`px-2 py-1 text-[10px] font-pixel rounded transition-all flex items-center gap-1 ${
              statusFilter === 'active'
                ? 'bg-emerald-900 text-emerald-100 border border-emerald-500'
                : 'bg-stone-900 text-stone-400 border border-stone-800 hover:text-stone-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Active ({activeSessionsCount})
          </button>
        </div>
      </div>
    </div>
  );
}
