import React, { useState, useEffect } from 'react';
import { X, Search, Compass, Castle, Sparkles, Folder, Coins, Check, ArrowRight } from 'lucide-react';
import sound from './SoundEngine';
import { formatMana, formatGoldCost } from '../utils/rpgHelpers';

const BIOMES_LIST = [
  { id: 'forest', name: 'Verdant Forest', icon: '🌲', color: 'text-emerald-400 border-emerald-700' },
  { id: 'desert', name: 'Desert Citadel', icon: '🏜️', color: 'text-amber-400 border-amber-700' },
  { id: 'snow', name: 'Snow Fortress', icon: '❄️', color: 'text-sky-300 border-sky-700' },
  { id: 'void', name: 'Arcane Void', icon: '🔮', color: 'text-purple-400 border-purple-700' },
];

export default function WorldSelectModal({
  projects = [],
  currentProject,
  currentBiome = 'forest',
  onSelectBiome,
  onSelectProject,
  onClose,
}) {
  const [search, setSearch] = useState('');

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        sound.playClick();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const filteredProjects = projects.filter((p) => {
    const q = search.toLowerCase();
    const nameMatch = (p.name || '').toLowerCase().includes(q);
    const pathMatch = (p.worktree || p.directory || p.id || '').toLowerCase().includes(q);
    return nameMatch || pathMatch;
  });

  const getRealmName = (project) => {
    if (project.fantasyName) return project.fantasyName;
    const baseName = project.name || (project.worktree || '').split('/').filter(Boolean).pop() || 'Arcane Realm';
    const capitalized = baseName
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    return `Realm of ${capitalized}`;
  };

  const handleSelect = (project) => {
    sound.playPortal();
    onSelectProject(project);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm modal-enter">
      <div className="pixel-box-gold w-full max-w-3xl max-h-[85vh] flex flex-col rounded-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 p-4 border-b-4 border-amber-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Castle className="w-6 h-6 text-amber-400" />
            <div>
              <h2 className="font-medieval text-2xl text-amber-200 font-bold">
                The Atlas of Known Realms
              </h2>
              <p className="text-xs text-stone-400 font-sans">
                Select a kingdom and choose your realm's terrain biome
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-1.5 text-stone-400 hover:text-red-400 hover:bg-stone-800 rounded border border-stone-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Biome Selector Strip */}
        <div className="bg-stone-950 px-4 py-2.5 border-b border-stone-800 flex items-center justify-between flex-wrap gap-2">
          <span className="text-[11px] font-pixel text-stone-400 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-amber-500" /> REALM BIOME TERRAIN:
          </span>
          <div className="flex items-center gap-1.5">
            {BIOMES_LIST.map((b) => (
              <button
                key={b.id}
                onClick={() => {
                  sound.playPortal();
                  onSelectBiome?.(b.id);
                }}
                className={`px-2.5 py-1 text-xs font-pixel rounded border flex items-center gap-1.5 transition-all ${
                  currentBiome === b.id
                    ? 'bg-amber-950/80 border-amber-500 text-amber-300 shadow'
                    : 'bg-stone-900/80 border-stone-800 text-stone-400 hover:text-stone-200'
                }`}
              >
                <span>{b.icon}</span>
                <span>{b.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="p-4 bg-stone-900/90 border-b border-stone-800">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search kingdoms, paths, or realm titles..."
              className="w-full bg-stone-950 border border-stone-700 rounded pl-9 pr-4 py-2 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500 font-sans"
              autoFocus
            />
          </div>
        </div>

        {/* Realms Grid */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-950/80">
          {filteredProjects.length === 0 ? (
            <div className="py-16 text-center text-stone-500 font-medieval text-lg">
              No kingdoms found in this direction of the map.
            </div>
          ) : (
            filteredProjects.map((project) => {
              const isCurrent = currentProject?.id === project.id;
              const realmTitle = getRealmName(project);
              const sessionCount = project.sessionCount ?? project.sessions?.length ?? 0;
              const activeCount = project.activeAgentCount ?? project.activeCount ?? 0;
              const totalTokens = project.totalTokens ?? 0;
              const totalCost = project.totalCost ?? 0;

              return (
                <div
                  key={project.id}
                  onClick={() => handleSelect(project)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isCurrent
                      ? 'bg-amber-950/40 border-amber-500 shadow-md shadow-amber-950/40'
                      : 'bg-stone-900/70 border-stone-800 hover:border-amber-700/80 hover:bg-stone-900'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-lg bg-stone-950 border border-amber-600/70 flex items-center justify-center text-2xl shrink-0 shadow">
                      🏰
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medieval text-lg text-amber-200 font-bold">
                          {realmTitle}
                        </span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded text-[9px] font-pixel bg-amber-500/20 border border-amber-500 text-amber-300">
                            CURRENT REALM
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-stone-400 font-mono mt-0.5">
                        <Folder className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                        <span className="truncate max-w-sm sm:max-w-md">
                          {project.worktree || project.directory || project.id}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Realm Stats & Enter Button */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-800">
                    <div className="text-right text-xs font-vt space-y-0.5">
                      <div className="flex items-center gap-2 text-stone-300">
                        <span>🏠 {sessionCount} Huts</span>
                        {activeCount > 0 && (
                          <span className="text-emerald-400 font-bold">
                            ⚡ {activeCount} Active
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-stone-400">
                        <span className="text-sky-300">{formatMana(totalTokens)} Mana</span>
                        <span>•</span>
                        <span className="text-amber-300">{formatGoldCost(totalCost)}</span>
                      </div>
                    </div>

                    <button
                      className={`px-3 py-1.5 rounded font-pixel text-xs flex items-center gap-1.5 transition-all ${
                        isCurrent
                          ? 'bg-amber-600 text-stone-950 font-bold'
                          : 'pixel-btn text-amber-200 hover:text-white'
                      }`}
                    >
                      <span>{isCurrent ? 'Entered' : 'Travel'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
