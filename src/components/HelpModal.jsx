import React, { useEffect } from 'react';
import { X, Book, Compass, Shield, Sword, Sparkles, Terminal, Flame, Eye, Music } from 'lucide-react';
import sound from './SoundEngine';

export default function HelpModal({ onClose }) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm modal-enter">
      <div className="pixel-box-gold w-full max-w-2xl max-h-[88vh] flex flex-col rounded-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 p-4 border-b-4 border-amber-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Book className="w-6 h-6 text-amber-400" />
            <div>
              <h2 className="font-medieval text-2xl text-amber-200 font-bold">
                The Overseer's Grimoire
              </h2>
              <p className="text-xs text-stone-400 font-sans">
                Guide to Navigating and Inspecting the Agent Realm
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-stone-950/85 text-stone-300">
          {/* Section 1: Navigation Controls */}
          <div className="bg-stone-900/90 border border-stone-800 p-4 rounded-lg">
            <h3 className="font-medieval text-lg text-amber-300 font-bold flex items-center gap-2 mb-3">
              <Compass className="w-4 h-4 text-amber-400" /> Movement & Navigation
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2.5 bg-stone-950 p-2.5 rounded border border-stone-800">
                <span className="font-pixel text-[10px] bg-stone-800 px-2 py-1 rounded text-amber-400 border border-stone-700">
                  W A S D
                </span>
                <span>Walk the Overseer wanderer</span>
              </div>
              <div className="flex items-center gap-2.5 bg-stone-950 p-2.5 rounded border border-stone-800">
                <span className="font-pixel text-[10px] bg-stone-800 px-2 py-1 rounded text-amber-400 border border-stone-700">
                  CLICK
                </span>
                <span>Inspect any Hut, Agent, or Station</span>
              </div>
              <div className="flex items-center gap-2.5 bg-stone-950 p-2.5 rounded border border-stone-800">
                <span className="font-pixel text-[10px] bg-stone-800 px-2 py-1 rounded text-amber-400 border border-stone-700">
                  DRAG
                </span>
                <span>Pan the realm camera view</span>
              </div>
              <div className="flex items-center gap-2.5 bg-stone-950 p-2.5 rounded border border-stone-800">
                <span className="font-pixel text-[10px] bg-stone-800 px-2 py-1 rounded text-amber-400 border border-stone-700">
                  SCROLL
                </span>
                <span>Zoom camera perspective in or out</span>
              </div>
            </div>
          </div>

          {/* Section 2: Village Stations */}
          <div className="bg-stone-900/90 border border-stone-800 p-4 rounded-lg">
            <h3 className="font-medieval text-lg text-amber-300 font-bold flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-amber-400" /> Village Crafting Stations
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-start gap-3 bg-stone-950/70 p-2.5 rounded border border-stone-800">
                <span className="text-xl">⚒️</span>
                <div>
                  <span className="font-medieval font-bold text-amber-300">The Great Anvil (Blacksmith):</span>
                  <p className="text-stone-400 mt-0.5">
                    Agents hammer out code, execute terminal commands, and run tests.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-stone-950/70 p-2.5 rounded border border-stone-800">
                <span className="text-xl">📚</span>
                <div>
                  <span className="font-medieval font-bold text-emerald-300">The Royal Library (Scriptorium):</span>
                  <p className="text-stone-400 mt-0.5">
                    Agents inspect files, search repositories, and study documentation scrolls.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-stone-950/70 p-2.5 rounded border border-stone-800">
                <span className="text-xl">⚗️</span>
                <div>
                  <span className="font-medieval font-bold text-purple-300">The Transmutation Lab (Alchemy):</span>
                  <p className="text-stone-400 mt-0.5">
                    Deep chain-of-thought contemplation and multi-step strategy planning.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-stone-950/70 p-2.5 rounded border border-stone-800">
                <span className="text-xl">🍺</span>
                <div>
                  <span className="font-medieval font-bold text-yellow-300">The Village Tavern:</span>
                  <p className="text-stone-400 mt-0.5">
                    Resting quarters for agents who have accomplished their bounties.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Inspector Tabs */}
          <div className="bg-stone-900/90 border border-stone-800 p-4 rounded-lg">
            <h3 className="font-medieval text-lg text-amber-300 font-bold flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-amber-400" /> Hut Inspector & Chronicle
            </h3>
            <ul className="list-disc list-inside space-y-1.5 text-xs text-stone-400 font-sans">
              <li>
                <strong className="text-amber-200">Character Sheet:</strong> View agent classes (Master Mage, Blacksmith, Scholar), level based on token usage, XP bar, stats, and gold cost.
              </li>
              <li>
                <strong className="text-amber-200">Quest Board:</strong> Inspect active, completed, and pending todos with progress bar and priority badges.
              </li>
              <li>
                <strong className="text-amber-200">The Chronicle:</strong> Browse full logs including royal user decrees, arcane thought traces, and spell tool invocations with copy buttons.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-900 border-t border-stone-800 text-center">
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="pixel-btn px-6 py-2 rounded text-xs font-pixel"
          >
            I Understand the Realm
          </button>
        </div>
      </div>
    </div>
  );
}
