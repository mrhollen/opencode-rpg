import React, { useState, useEffect } from 'react';
import { X, Scroll, BookOpen, Copy, Check, Sparkles, Feather, Shield } from 'lucide-react';
import sound from './SoundEngine';

export default function RoyalScribeModal({ session, onClose }) {
  const [scribeData, setScribeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

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

  useEffect(() => {
    if (!session?.id) return;
    setLoading(true);

    fetch(`/api/sessions/${session.id}/scribe`)
      .then((res) => {
        if (!res.ok) throw new Error('No scribe chronicle found');
        return res.json();
      })
      .then((data) => {
        setScribeData(data);
        setLoading(false);
      })
      .catch(() => {
        setScribeData(getFallbackScribeStory(session));
        setLoading(false);
      });
  }, [session?.id]);

  const handleCopyStory = () => {
    sound.playScroll();
    const fullText = `${scribeData?.title}\n\n${(scribeData?.chapters || [])
      .map((c) => `=== ${c.title} ===\n${c.body}`)
      .join('\n\n')}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-sm modal-enter">
      <div className="scroll-paper w-full max-w-3xl max-h-[90vh] flex flex-col rounded-lg overflow-hidden shadow-2xl border-4 border-amber-900 relative">
        {/* Scroll Header */}
        <div className="bg-amber-950/20 p-4 border-b-2 border-amber-900/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-900/40 border-2 border-amber-800 flex items-center justify-center text-xl shadow">
              🪶
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-medieval text-2xl text-amber-950 font-bold">
                  The Royal Scribe's Illuminated Tale
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-pixel bg-amber-900/30 border border-amber-800 text-amber-950">
                  HISTORIC CHRONICLE
                </span>
              </div>
              <p className="text-xs text-amber-900/80 font-sans mt-0.5">
                Session: <strong>{session?.title || 'Arcane Quest'}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyStory}
              className="px-2.5 py-1.5 bg-amber-900/20 hover:bg-amber-900/30 text-amber-950 text-xs font-pixel rounded border border-amber-900/40 flex items-center gap-1.5 transition-colors"
              title="Copy Chronicle"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-800" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Inscribed!' : 'Copy Scroll'}</span>
            </button>

            <button
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="p-1 text-amber-950/70 hover:text-amber-950 rounded hover:bg-amber-900/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Story Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 select-text text-amber-950 leading-relaxed font-medieval">
          {loading ? (
            <div className="py-24 text-center font-pixel text-xs text-amber-900 animate-pulse">
              The Royal Scribe is grinding squid ink and illuminating parchment...
            </div>
          ) : (
            <>
              {/* Epic Banner */}
              <div className="text-center border-b-2 border-amber-900/30 pb-4">
                <span className="text-2xl">👑</span>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-wide mt-1 text-amber-950">
                  {scribeData?.title || 'The Ballad of the Codecrafters'}
                </h1>
                <p className="text-xs italic text-amber-900/70 mt-1 font-sans">
                  Transcribed in the High Era of OpenCode by the Chief Royal Chronicler
                </p>
              </div>

              {/* Chapters */}
              <div className="space-y-6">
                {(scribeData?.chapters || []).map((chap, idx) => (
                  <div key={idx} className="space-y-2">
                    <h3 className="text-lg font-bold text-amber-900 flex items-center gap-2 border-b border-amber-900/20 pb-1">
                      <Feather className="w-4 h-4 text-amber-800" />
                      <span>{chap.title}</span>
                    </h3>
                    <p className="text-sm sm:text-base leading-relaxed text-amber-950 whitespace-pre-line pl-2 first-letter:text-3xl first-letter:font-bold first-letter:float-left first-letter:mr-2 first-letter:text-amber-900">
                      {chap.body}
                    </p>
                  </div>
                ))}
              </div>

              {/* Royal Seal Footer */}
              <div className="pt-6 border-t-2 border-amber-900/30 flex items-center justify-between text-xs text-amber-900/80 font-sans">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📜</span>
                  <span>Recorded in the Kingdom Annals</span>
                </div>
                <div className="font-pixel text-[10px] bg-amber-900/20 px-2.5 py-1 rounded border border-amber-900/40 text-amber-950">
                  SEALED & WITNESSED
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function getFallbackScribeStory(session) {
  const agent = session?.agent || 'Archmage Commander';
  const title = session?.title || 'The Great Awakening';

  return {
    title: `The Ballad of ${title}`,
    chapters: [
      {
        title: 'Prologue: The Royal Decree',
        body: `In the dawn of the digital era, the High Council of the Realm summoned ${agent}. A decree was proclaimed throughout the taverns and towers: a new artifact of wisdom and retro pixel wonder must be forged from raw ast and syntax stones.`,
      },
      {
        title: 'Chapter I: The Gathering of Arcane Runes',
        body: `Under the flickering torchlight of the Great Anvil, the Dwarf Blacksmith and Elf Scholar poured through dusty scrolls of react, audio synthesis, and canvas geometry. With each bash spell intoned, the terminal echoed like thunder against castle ramparts.`,
      },
      {
        title: 'Chapter II: The Trial of the Crucible',
        body: `Dark bugs and errant tokens sought to breach the sanctum. Yet with unwavering resolve, ${agent} drew the vim broadsword, striking down broken imports and balancing the mana economy. 8-bit fanfares rang out across the village square as quests were accomplished one by one.`,
      },
      {
        title: 'Epilogue: The Kingdom Preserved',
        body: `And so, as twilight settled upon the kingdom and glowing lanterns illuminated the cobbled lanes, the OpenCode Realm was at peace once more. The chronicle was bound in golden leather, sealed for all eternity.`,
      },
    ],
  };
}
