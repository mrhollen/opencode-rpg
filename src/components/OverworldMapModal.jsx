import React, { useState, useEffect, useRef } from 'react';
import { X, Globe, Sparkles, Compass, Shield, Terminal, ArrowRight, Zap, Play, Volume2 } from 'lucide-react';
import sound from './SoundEngine';
import { formatMana, formatGoldCost } from '../utils/rpgHelpers';

// Ancient Stargate Glyphs
const GLYPHS = ['ᚠ', 'ᛚ', 'ᛟ', 'ᚱ', 'ᛖ', 'ᛊ', 'ᛒ', 'ᛏ', 'ᛞ', 'ᚲ', 'ᚺ', 'ᛗ', 'ᛉ', 'ᚷ', 'ᚨ', 'ᛃ', 'ᛋ', 'ᛐ', 'ᛜ', 'ᚦ'];

export default function OverworldMapModal({
  projects = [],
  currentProject,
  onSelectProject,
  onClose,
}) {
  const [selectedPlanetIndex, setSelectedPlanetIndex] = useState(0);
  const [dialingStep, setDialingStep] = useState(0); // 0 = idle, 1-7 = dialing chevrons, 8 = kawoosh / locked
  const [isWormholeActive, setIsWormholeActive] = useState(false);
  const [dialingStatus, setDialingStatus] = useState('');
  const dialingTimerRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && dialingStep === 0) {
        sound.playClick();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (dialingTimerRef.current) clearTimeout(dialingTimerRef.current);
    };
  }, [onClose, dialingStep]);

  // Map projects to Galactic Planet Designations with 7-Chevron Addresses
  const planets = projects.map((p, idx) => {
    // Deterministic planet code based on project id/name
    const hash = (p.id || p.name || 'P3X-000')
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const codeNum = (hash % 899) + 100;
    const prefixes = ['P3X', 'P4X', 'P8Y', 'P2M', 'KS7', 'PX9'];
    const prefix = prefixes[idx % prefixes.length];
    const designation = `${prefix}-${codeNum}`;

    // 7-glyph Stargate address
    const address = Array.from({ length: 7 }).map((_, gIdx) => {
      const gIndex = (hash + gIdx * 7) % GLYPHS.length;
      return GLYPHS[gIndex];
    });

    const sessionCount = p.sessionCount ?? p.sessions?.length ?? 1;
    const activeCount = p.activeAgentCount ?? p.activeCount ?? 0;
    const totalTokens = p.totalTokens ?? (sessionCount * 45000);
    const totalCost = p.totalCost ?? (sessionCount * 0.45);
    const biome = idx % 4 === 0 ? 'Forest' : idx % 4 === 1 ? 'Desert' : idx % 4 === 2 ? 'Snow' : 'Arcane Void';

    return {
      ...p,
      designation,
      planetName: `${designation} (${p.name || 'Realm'})`,
      address,
      biome,
      sessionCount,
      activeCount,
      totalTokens,
      totalCost,
    };
  });

  const activePlanet = planets[selectedPlanetIndex] || planets[0];

  // Initiate Stargate Dialing Sequence
  const handleDialPlanet = (planet) => {
    if (dialingStep > 0) return; // Already dialing

    const planetIdx = planets.findIndex((p) => p.id === planet.id);
    if (planetIdx >= 0) setSelectedPlanetIndex(planetIdx);

    setDialingStep(1);
    setDialingStatus('Dialing Computer Online: Encoding Chevron 1...');
    sound.playChevronLock(1);

    // Sequence through chevrons 1 to 7
    let currentStep = 1;

    const stepInterval = () => {
      currentStep++;
      if (currentStep <= 7) {
        setDialingStep(currentStep);
        setDialingStatus(`Chevron ${currentStep} ${currentStep === 7 ? 'LOCKED!' : 'encoded...'}`);
        sound.playChevronLock(currentStep);
        dialingTimerRef.current = setTimeout(stepInterval, 480);
      } else {
        // Step 8: Wormhole KAWOOSH!
        setDialingStep(8);
        setDialingStatus('WORMHOLE ESTABLISHED! KAWOOSH!');
        setIsWormholeActive(true);
        sound.playKawoosh();

        // Complete teleportation after wormhole settles
        dialingTimerRef.current = setTimeout(() => {
          onSelectProject(planet);
          onClose();
        }, 1600);
      }
    };

    dialingTimerRef.current = setTimeout(stepInterval, 520);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md modal-enter">
      <div className="pixel-box-gold w-full max-w-5xl max-h-[92vh] flex flex-col rounded-xl overflow-hidden shadow-2xl border-4 border-amber-600 bg-stone-950">
        {/* SGC Header Banner */}
        <div className="bg-gradient-to-r from-stone-950 via-slate-900 to-stone-950 p-4 border-b-4 border-amber-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-slate-950 border-2 border-cyan-500/80 flex items-center justify-center text-2xl shadow-inner shadow-cyan-500/40 animate-pulse">
              🌌
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-cinzel text-xl sm:text-2xl text-amber-200 font-extrabold tracking-wider">
                  STARGATE COMMAND — GALACTIC DIAL DEVICE
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-pixel bg-cyan-950 border border-cyan-500 text-cyan-300">
                  CHEVRON LEVEL 7
                </span>
              </div>
              <p className="text-xs text-stone-400 font-mono mt-0.5">
                Subspace Wormhole Matrix • Overworld Interplanetary Gate System
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (dialingStep === 0) {
                sound.playClick();
                onClose();
              }
            }}
            disabled={dialingStep > 0}
            className="p-1.5 text-stone-400 hover:text-red-400 hover:bg-stone-800 rounded border border-stone-700 transition-colors disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content Area: Stargate Ring + Planet Catalog */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 bg-stone-950">
          {/* Left Column: Interactive Stargate Ring Viewport & DHD */}
          <div className="lg:col-span-7 p-6 flex flex-col items-center justify-between border-b lg:border-b-0 lg:border-r border-stone-800 bg-gradient-to-b from-stone-950 via-slate-950 to-stone-950 relative">
            {/* Stargate Status Ticker */}
            <div className="w-full bg-stone-900/90 border border-cyan-800/80 rounded px-4 py-2 flex items-center justify-between text-xs font-mono mb-4">
              <span className="flex items-center gap-2 text-cyan-300">
                <span className={`w-2 h-2 rounded-full ${isWormholeActive ? 'bg-cyan-400 animate-ping' : dialingStep > 0 ? 'bg-amber-400 animate-pulse' : 'bg-stone-500'}`} />
                <span>{dialingStatus || 'GATE DIALER IDLE: Select Planet Address'}</span>
              </span>
              <span className="text-[10px] font-pixel text-amber-400">
                {dialingStep > 0 && dialingStep <= 7 ? `CHEVRON ${dialingStep} LOCKED` : isWormholeActive ? 'VORTEX STABLE' : 'READY'}
              </span>
            </div>

            {/* The Stargate Ring Visual */}
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center my-2">
              {/* Outer Metallic Ring with 9 Chevrons */}
              <div className={`absolute inset-0 rounded-full border-8 border-stone-700 shadow-2xl bg-stone-900/40 flex items-center justify-center transition-all duration-700 ${isWormholeActive ? 'shadow-cyan-500/50 border-cyan-700' : ''}`}>
                {/* 9 Chevrons around perimeter */}
                {[0, 40, 80, 120, 160, 200, 240, 280, 320].map((deg, i) => {
                  const isLocked = i < dialingStep;
                  return (
                    <div
                      key={deg}
                      style={{ transform: `rotate(${deg}deg) translateY(-132px)` }}
                      className={`absolute w-6 h-4 rounded-sm border-2 transition-all duration-200 flex items-center justify-center ${
                        isLocked
                          ? 'bg-amber-500 border-yellow-300 shadow-md shadow-amber-500/80 scale-110'
                          : 'bg-stone-800 border-stone-600'
                      }`}
                    >
                      <span className={`w-2 h-1 rounded-full ${isLocked ? 'bg-yellow-100' : 'bg-stone-600'}`} />
                    </div>
                  );
                })}

                {/* Spinning Inner Glyph Ring */}
                <div
                  className={`w-52 h-52 sm:w-56 sm:h-56 rounded-full border-4 border-dashed border-stone-600/70 flex items-center justify-center transition-transform duration-1000 ${
                    dialingStep > 0 && !isWormholeActive ? 'animate-spin' : ''
                  }`}
                  style={{ animationDuration: '6s' }}
                >
                  <div className="grid grid-cols-6 gap-1 p-2 text-stone-500 text-[10px] select-none font-mono">
                    {GLYPHS.slice(0, 18).map((g, gi) => (
                      <span key={gi} className="text-center">{g}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Event Horizon (The Puddle / Kawoosh) */}
              <div
                className={`absolute w-44 h-44 sm:w-48 sm:h-48 rounded-full transition-all duration-700 flex items-center justify-center overflow-hidden ${
                  isWormholeActive
                    ? 'bg-gradient-to-r from-cyan-600 via-sky-400 to-blue-700 shadow-inner shadow-cyan-300 opacity-95 scale-100 animate-pulse'
                    : dialingStep > 0
                    ? 'bg-amber-950/20 scale-95 opacity-50'
                    : 'bg-stone-950 opacity-90 scale-90'
                }`}
              >
                {isWormholeActive ? (
                  <div className="w-full h-full bg-[radial-gradient(circle,rgba(255,255,255,0.8)_0%,rgba(6,182,212,0.6)_40%,rgba(3,105,161,0.9)_100%)] flex items-center justify-center">
                    <span className="font-pixel text-xs text-white drop-shadow-md animate-bounce">
                      EVENT HORIZON
                    </span>
                  </div>
                ) : (
                  <div className="text-stone-700 text-xs font-mono text-center px-4">
                    {dialingStep > 0 ? 'Dialing gate coordinates...' : 'Awaiting DHD input'}
                  </div>
                )}
              </div>
            </div>

            {/* DHD Glyph Address Display */}
            <div className="w-full mt-3 bg-stone-900/80 border border-stone-800 p-3 rounded-lg">
              <div className="text-[10px] font-pixel text-stone-400 mb-2 flex items-center justify-between">
                <span>ACTIVE STARGATE COORDINATES (7-CHEVRON SEQUENCE):</span>
                <span className="text-amber-400">{activePlanet?.designation}</span>
              </div>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {(activePlanet?.address || []).map((glyph, gIndex) => {
                  const isLocked = gIndex < dialingStep;
                  return (
                    <div
                      key={gIndex}
                      className={`w-9 h-11 rounded border-2 flex flex-col items-center justify-center font-bold text-base transition-all ${
                        isLocked
                          ? 'bg-amber-950/80 border-amber-500 text-amber-200 shadow-md shadow-amber-500/40 scale-105'
                          : 'bg-stone-950 border-stone-800 text-stone-500'
                      }`}
                    >
                      <span className="text-base leading-none">{glyph}</span>
                      <span className="text-[8px] font-mono mt-0.5 text-stone-400">{gIndex + 1}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Manual DHD Quick Input Buttons */}
            <div className="w-full mt-3 flex items-center justify-between gap-3">
              <button
                onClick={() => handleDialPlanet(activePlanet)}
                disabled={dialingStep > 0}
                className={`flex-1 py-2.5 px-4 rounded-lg font-pixel text-xs flex items-center justify-center gap-2 transition-all ${
                  dialingStep > 0
                    ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                    : 'pixel-btn-gold text-stone-950 font-bold hover:scale-[1.02]'
                }`}
              >
                <Zap className="w-4 h-4 text-stone-950" />
                <span>{dialingStep > 0 ? 'GATE ENGAGED...' : 'ENGAGE STARGATE & DIAL'}</span>
              </button>
            </div>
          </div>

          {/* Right Column: Planetary World Atlas Catalog */}
          <div className="lg:col-span-5 p-4 overflow-y-auto space-y-3 bg-stone-950/60 max-h-[70vh] lg:max-h-none">
            <div className="text-xs font-pixel text-amber-300 pb-1 flex items-center justify-between border-b border-stone-800">
              <span>EXPLORED WORLDS ({planets.length})</span>
              <span className="text-[10px] text-stone-400 font-mono">MILKY WAY NETWORK</span>
            </div>

            {planets.map((planet, idx) => {
              const isSelected = idx === selectedPlanetIndex;
              const isCurrent = currentProject?.id === planet.id;

              return (
                <div
                  key={planet.id || idx}
                  onClick={() => {
                    if (dialingStep === 0) {
                      sound.playDhdClick();
                      setSelectedPlanetIndex(idx);
                    }
                  }}
                  className={`p-3.5 rounded-lg border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-900/90 border-cyan-500 shadow-md shadow-cyan-900/30'
                      : 'bg-stone-900/60 border-stone-800 hover:border-stone-700 hover:bg-stone-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🪐</span>
                      <div>
                        <div className="font-medieval font-bold text-amber-200 text-sm">
                          {planet.planetName}
                        </div>
                        <div className="text-[10px] text-cyan-400 font-mono">
                          {planet.designation} • Biome: {planet.biome}
                        </div>
                      </div>
                    </div>

                    {isCurrent && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-pixel bg-cyan-950 border border-cyan-500 text-cyan-300">
                        ORIGIN GATE
                      </span>
                    )}
                  </div>

                  {/* Stargate Address Glyphs Preview */}
                  <div className="bg-stone-950/80 p-1.5 rounded border border-stone-800 flex items-center gap-1.5 text-xs font-mono text-amber-400/90 mb-2">
                    <span className="text-[9px] font-pixel text-stone-500">GATE:</span>
                    {planet.address.join(' ')}
                  </div>

                  {/* Planet Stats */}
                  <div className="flex items-center justify-between text-xs font-vt text-stone-300 pt-1 border-t border-stone-800/80">
                    <div className="flex items-center gap-3">
                      <span>🏠 {planet.sessionCount} Huts</span>
                      {planet.activeCount > 0 && (
                        <span className="text-emerald-400 font-bold">
                          ⚡ {planet.activeCount} Working
                        </span>
                      )}
                    </div>
                    <div className="text-stone-400">
                      <span className="text-sky-300">{formatMana(planet.totalTokens)} M</span>
                      <span> • </span>
                      <span className="text-amber-300">{formatGoldCost(planet.totalCost)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
