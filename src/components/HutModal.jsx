import React, { useState, useEffect } from 'react';
import {
  X,
  Maximize2,
  Minimize2,
  User,
  Scroll,
  BookOpen,
  Clock,
  Sparkles,
  Flame,
  Home,
  Coins,
  Cpu,
} from 'lucide-react';
import CharacterSheet from './CharacterSheet';
import QuestBoard from './QuestBoard';
import ChronicleViewer from './ChronicleViewer';
import sound from './SoundEngine';
import { formatMana, formatGoldCost, formatRelativeTime } from '../utils/rpgHelpers';

export default function HutModal({ session, onClose }) {
  const getInitialTab = () => {
    if (session?.initialStation === 'notice_board') return 'quests';
    if (session?.initialStation === 'library' || session?.initialStation === 'alchemy') return 'chronicle';
    return 'character';
  };
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Keyboard shortcut: Escape to close
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

  if (!session) return null;

  const isActive = session.status === 'active' || (!session.time_archived && !session.revert);
  const totalTokens = (session.tokens_input || 0) + (session.tokens_output || 0);

  const handleTabChange = (tab) => {
    sound.playScroll();
    setActiveTab(tab);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm modal-enter">
      {/* Modal Dialog Container */}
      <div
        className={`pixel-box-gold w-full flex flex-col overflow-hidden transition-all duration-200 ${
          isFullScreen
            ? 'h-full max-h-none rounded-none'
            : 'max-w-5xl max-h-[92vh] rounded-lg'
        }`}
      >
        {/* Modal Header Banner */}
        <div className="bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 p-4 border-b-4 border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative">
          {/* Hut Info / Title */}
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-lg bg-stone-900 border-2 border-amber-600 flex items-center justify-center text-2xl shadow-inner shrink-0">
              🛖
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medieval text-xl text-amber-200 font-bold truncate max-w-md">
                  {session.title || 'Arcane Encampment'}
                </span>

                {/* Status Badge */}
                {isActive ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-pixel bg-emerald-950/80 border border-emerald-600 text-emerald-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-indicator" />
                    ACTIVE FORGING
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-pixel bg-stone-900 border border-stone-700 text-stone-400">
                    <span className="w-2 h-2 rounded-full bg-stone-500" />
                    RESTING AT HEARTH
                  </span>
                )}
              </div>

              {/* Session Meta */}
              <div className="flex items-center gap-3 text-xs text-stone-400 font-vt mt-1 flex-wrap">
                <span className="flex items-center gap-1 text-stone-300">
                  <span className="text-amber-500">Slug:</span> {session.slug || session.id?.slice(0, 10)}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-stone-500" />
                  Inscribed {formatRelativeTime(session.time_created)}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-amber-300">
                  <Coins className="w-3.5 h-3.5 text-yellow-500" />
                  {formatGoldCost(session.cost)}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-sky-300">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  {formatMana(totalTokens)} Mana
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons: Fullscreen & Close */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={() => {
                sound.playClick();
                setIsFullScreen(!isFullScreen);
              }}
              className="p-1.5 text-stone-400 hover:text-amber-200 hover:bg-stone-800 rounded border border-stone-700 transition-colors"
              title={isFullScreen ? 'Restore Size' : 'Expand Fullscreen'}
            >
              {isFullScreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>

            <button
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="p-1.5 text-stone-400 hover:text-red-400 hover:bg-stone-800 rounded border border-stone-700 transition-colors"
              title="Close Hut (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation Bar */}
        <div className="bg-stone-900 border-b-2 border-stone-800 px-4 flex gap-2">
          {[
            { id: 'character', label: 'Character Sheet', icon: User, count: null },
            { id: 'quests', label: 'Quest Board', icon: Scroll, count: session.todos?.length },
            { id: 'chronicle', label: 'The Chronicle', icon: BookOpen, count: null },
          ].map((tab) => {
            const isSelected = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 py-3 px-4 font-pixel text-xs border-b-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-amber-500 text-amber-300 bg-stone-950/60 font-bold'
                    : 'border-transparent text-stone-400 hover:text-stone-200 hover:border-stone-700'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-amber-400' : 'text-stone-500'}`} />
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-800 text-stone-300">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-stone-950/80">
          {activeTab === 'character' && <CharacterSheet session={session} />}
          {activeTab === 'quests' && <QuestBoard session={session} />}
          {activeTab === 'chronicle' && <ChronicleViewer session={session} />}
        </div>
      </div>
    </div>
  );
}
