import React, { useState } from 'react';
import { Shield, Sparkles, Sword, Coins, Zap, BookOpen, Compass, Cpu, Flame, Layers } from 'lucide-react';
import sound from './SoundEngine';
import {
  calculateLevel,
  calculateXpProgress,
  formatMana,
  formatGoldCost,
  getAgentClass,
} from '../utils/rpgHelpers';

export default function CharacterSheet({ session }) {
  const [selectedAgentIndex, setSelectedAgentIndex] = useState(0);

  if (!session) {
    return (
      <div className="p-8 text-center text-stone-400 font-pixel text-xs">
        No character data inscribed in this scroll.
      </div>
    );
  }

  // Derive agents list: master agent + any subagents from metadata or default list
  const masterAgentName = session.agent || 'Master Architect';
  const masterModel = session.model || 'Claude 3.7 Sonnet';
  const subagents = session.subagents || [];

  const allAgents = [
    {
      id: 'master',
      name: masterAgentName,
      model: masterModel,
      isMaster: true,
      tokensInput: session.tokens_input || 0,
      tokensOutput: session.tokens_output || 0,
      tokensReasoning: session.tokens_reasoning || 0,
      tokensCacheRead: session.tokens_cache_read || 0,
      tokensCacheWrite: session.tokens_cache_write || 0,
      cost: session.cost || 0,
      status: session.status || (session.time_archived ? 'resting' : 'active'),
      currentTask: session.currentTask || session.title || 'Orchestrating Realm Quests',
    },
    ...subagents.map((sub, idx) => ({
      id: sub.id || `sub-${idx}`,
      name: sub.name || `Adept ${idx + 1}`,
      model: sub.model || masterModel,
      isMaster: false,
      tokensInput: sub.tokens_input || Math.round((session.tokens_input || 1000) * 0.3),
      tokensOutput: sub.tokens_output || Math.round((session.tokens_output || 500) * 0.3),
      tokensReasoning: sub.tokens_reasoning || 0,
      tokensCacheRead: sub.tokens_cache_read || 0,
      tokensCacheWrite: 0,
      cost: sub.cost || (session.cost || 0) * 0.25,
      status: sub.status || 'active',
      currentTask: sub.currentTask || 'Executing subtask ritual',
    })),
  ];

  const agent = allAgents[selectedAgentIndex] || allAgents[0];
  const agentClass = getAgentClass(agent.name, agent.model);
  const totalTokens = (agent.tokensInput || 0) + (agent.tokensOutput || 0);
  const level = calculateLevel(totalTokens);
  const xpPercent = calculateXpProgress(totalTokens);

  // Derived RPG Stats based on tokens
  const strStat = Math.min(99, Math.floor(Math.sqrt((agent.tokensOutput || 100) / 10)) + 12);
  const intStat = Math.min(99, Math.floor(Math.sqrt(((agent.tokensReasoning || 0) + 500) / 8)) + 18);
  const agiStat = Math.min(99, 14 + (level % 15));
  const lckStat = Math.min(99, Math.floor(((agent.tokensCacheRead || 0) / (totalTokens || 1)) * 50) + 10);
  const hpStat = 100;
  const mpStat = Math.min(9999, Math.floor(totalTokens / 10) + 120);

  const handleSelectAgent = (idx) => {
    sound.playClick();
    setSelectedAgentIndex(idx);
  };

  return (
    <div className="space-y-6">
      {/* Agent Roster Tabs (if multiple agents exist) */}
      {allAgents.length > 1 && (
        <div className="flex flex-wrap gap-2 border-b-2 border-stone-800 pb-3">
          {allAgents.map((ag, idx) => {
            const isSelected = idx === selectedAgentIndex;
            const agCls = getAgentClass(ag.name, ag.model);
            return (
              <button
                key={ag.id}
                onClick={() => handleSelectAgent(idx)}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-pixel rounded transition-all ${
                  isSelected
                    ? 'bg-amber-900/60 border-2 border-amber-500 text-amber-200 shadow-md shadow-amber-900/40'
                    : 'bg-stone-900/60 border border-stone-700 text-stone-400 hover:text-stone-200 hover:border-stone-500'
                }`}
              >
                <span>{agCls.avatar}</span>
                <span>{ag.name}</span>
                {ag.isMaster && (
                  <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    MASTER
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Main Character Sheet Card */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-stone-950/80 border-2 border-amber-900/60 p-5 rounded-lg shadow-inner">
        {/* Left Column: Portrait, Class, Level & XP */}
        <div className="md:col-span-4 flex flex-col items-center text-center p-4 bg-stone-900/80 border border-stone-800 rounded">
          {/* Avatar Portrait with pulsing arcane ring */}
          <div className="relative mb-3">
            <div className="w-24 h-24 rounded-lg bg-gradient-to-b from-stone-800 to-stone-950 border-4 border-amber-600/80 flex items-center justify-center text-5xl shadow-lg shadow-black/80">
              {agentClass.avatar}
            </div>
            {agent.status === 'active' && (
              <div
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-500 border-2 border-stone-950 pulse-indicator"
                title="Active Working"
              />
            )}
          </div>

          {/* Name & Class Title */}
          <h2 className="text-amber-100 font-cinzel font-bold text-lg leading-tight mb-1">
            {agent.name}
          </h2>
          <div className="font-medieval text-sm text-amber-400 font-semibold mb-2">
            {agentClass.title}
          </div>
          <div className="text-[11px] text-stone-400 font-sans italic mb-4">
            {agentClass.specialty}
          </div>

          {/* Level Badge */}
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-amber-950/90 border border-amber-600 font-pixel text-xs text-amber-300 rounded shadow">
              LVL {level}
            </span>
            <span className="text-xs font-vt text-stone-400 uppercase">
              {agent.isMaster ? 'Master Agent' : 'Apprentice Subagent'}
            </span>
          </div>

          {/* XP Bar */}
          <div className="w-full mt-2">
            <div className="flex justify-between text-[10px] font-pixel text-stone-400 mb-1">
              <span>EXP</span>
              <span>{xpPercent}%</span>
            </div>
            <div className="w-full h-3 bg-stone-950 rounded border border-stone-700 overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-amber-600 to-yellow-400 rounded-sm transition-all duration-500"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
            <div className="text-[9px] font-vt text-stone-500 mt-1">
              {formatMana(totalTokens)} / Next Level
            </div>
          </div>

          {/* Station Banner */}
          <div className="w-full mt-5 pt-3 border-t border-stone-800 text-left">
            <div className="flex items-center gap-2 text-xs font-medieval text-stone-300">
              <Compass className="w-4 h-4 text-amber-500" />
              <span>Station:</span>
              <span className="text-amber-300 font-semibold">{agentClass.station}</span>
            </div>
            <div className="mt-2 text-[11px] text-stone-400 bg-stone-950/60 p-2 rounded border border-stone-800/80 truncate">
              <span className="text-stone-500 font-pixel text-[9px] block mb-0.5">CURRENT TASK:</span>
              <span className="text-stone-300">{agent.currentTask}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Attributes, Token Pool, Model Equipment */}
        <div className="md:col-span-8 space-y-5">
          {/* Equipment / Model Card */}
          <div className="bg-stone-900/90 border border-amber-900/60 p-3 rounded">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-2 text-xs font-pixel text-amber-400">
                <Cpu className="w-4 h-4" /> Arcane Model Catalyst
              </span>
              <span className="text-xs font-pixel px-2 py-0.5 rounded bg-amber-950 border border-amber-700/60 text-amber-200">
                {agent.model}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-stone-800 text-center">
              <div className="bg-stone-950/70 p-2 rounded border border-stone-800">
                <div className="text-[10px] font-pixel text-stone-400">GOLD COST</div>
                <div className="text-xs font-pixel text-amber-300 mt-1">
                  {formatGoldCost(agent.cost)}
                </div>
              </div>
              <div className="bg-stone-950/70 p-2 rounded border border-stone-800">
                <div className="text-[10px] font-pixel text-stone-400">TOTAL MANA</div>
                <div className="text-xs font-pixel text-sky-300 mt-1">
                  {formatMana(totalTokens)}
                </div>
              </div>
              <div className="bg-stone-950/70 p-2 rounded border border-stone-800">
                <div className="text-[10px] font-pixel text-stone-400">STATUS</div>
                <div className="text-xs font-pixel text-emerald-400 mt-1 uppercase">
                  {agent.status}
                </div>
              </div>
              <div className="bg-stone-950/70 p-2 rounded border border-stone-800">
                <div className="text-[10px] font-pixel text-stone-400">AFFINITY</div>
                <div className="text-xs font-pixel text-purple-300 mt-1">
                  {agent.tokensReasoning > 0 ? 'Arcane Deep' : 'Swift Craft'}
                </div>
              </div>
            </div>
          </div>

          {/* Vitals: HP & MP Bars */}
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs font-pixel mb-1">
                <span className="text-emerald-400 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> HP (Sanity & Stability)
                </span>
                <span className="text-stone-300">{hpStat} / 100</span>
              </div>
              <div className="w-full h-3 bg-stone-950 rounded border border-emerald-900/80 p-0.5">
                <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-sm w-full" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-pixel mb-1">
                <span className="text-sky-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> MP (Mana Flux Capacity)
                </span>
                <span className="text-stone-300">{formatMana(agent.tokensOutput)} Mana</span>
              </div>
              <div className="w-full h-3 bg-stone-950 rounded border border-sky-900/80 p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-sky-600 to-cyan-400 rounded-sm"
                  style={{
                    width: `${Math.min(100, Math.max(15, (agent.tokensOutput / (totalTokens || 1)) * 100))}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* RPG Core Attributes Pentagon / Matrix */}
          <div>
            <div className="text-xs font-pixel text-stone-400 mb-2.5 flex items-center gap-1.5">
              <Sword className="w-3.5 h-3.5 text-amber-400" /> CHARACTER ATTRIBUTES
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-stone-900/90 border border-stone-800 p-2.5 rounded flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-pixel text-amber-400">STR (Output)</div>
                  <div className="text-[11px] font-sans text-stone-400">Generation force</div>
                </div>
                <div className="text-lg font-pixel text-stone-200">{strStat}</div>
              </div>

              <div className="bg-stone-900/90 border border-stone-800 p-2.5 rounded flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-pixel text-purple-400">INT (Logic)</div>
                  <div className="text-[11px] font-sans text-stone-400">Reasoning depths</div>
                </div>
                <div className="text-lg font-pixel text-stone-200">{intStat}</div>
              </div>

              <div className="bg-stone-900/90 border border-stone-800 p-2.5 rounded flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-pixel text-emerald-400">AGI (Haste)</div>
                  <div className="text-[11px] font-sans text-stone-400">Step dispatch</div>
                </div>
                <div className="text-lg font-pixel text-stone-200">{agiStat}</div>
              </div>

              <div className="bg-stone-900/90 border border-stone-800 p-2.5 rounded flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-pixel text-sky-400">LCK (Cache)</div>
                  <div className="text-[11px] font-sans text-stone-400">Context hit rate</div>
                </div>
                <div className="text-lg font-pixel text-stone-200">{lckStat}</div>
              </div>
            </div>
          </div>

          {/* Token Breakdown Table (Medieval Vault) */}
          <div className="bg-stone-950/90 border border-stone-800 p-3 rounded">
            <div className="text-xs font-pixel text-stone-400 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-yellow-500" /> MANA & TREASURY BREAKDOWN
              </span>
              <span className="text-[10px] font-vt text-amber-300">
                Total Mana: {formatMana(totalTokens)}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-vt">
              <div className="bg-stone-900/60 p-2 rounded border border-stone-800/80">
                <span className="text-stone-400 block text-[11px]">Input Invocations:</span>
                <span className="text-sky-300 font-bold text-sm">
                  {formatMana(agent.tokensInput)}
                </span>
              </div>
              <div className="bg-stone-900/60 p-2 rounded border border-stone-800/80">
                <span className="text-stone-400 block text-[11px]">Output Runes:</span>
                <span className="text-emerald-300 font-bold text-sm">
                  {formatMana(agent.tokensOutput)}
                </span>
              </div>
              <div className="bg-stone-900/60 p-2 rounded border border-stone-800/80">
                <span className="text-stone-400 block text-[11px]">Reasoning Mana:</span>
                <span className="text-purple-300 font-bold text-sm">
                  {formatMana(agent.tokensReasoning)}
                </span>
              </div>
              <div className="bg-stone-900/60 p-2 rounded border border-stone-800/80">
                <span className="text-stone-400 block text-[11px]">Cache Saved:</span>
                <span className="text-amber-300 font-bold text-sm">
                  {formatMana(agent.tokensCacheRead)}
                </span>
              </div>
            </div>
          </div>

          {/* Arcane Inventory & Relics */}
          <div>
            <div className="text-xs font-pixel text-stone-400 mb-2 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-amber-500" /> EQUIPPED RELICS & TOOLS
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2.5 bg-stone-900/80 border border-stone-800 p-2 rounded">
                <span className="text-lg">🗡️</span>
                <div>
                  <div className="font-medieval font-semibold text-amber-200">Terminal Broadsword +4</div>
                  <div className="text-[10px] text-stone-400">Fast Bash execution & error cleaving</div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 bg-stone-900/80 border border-stone-800 p-2 rounded">
                <span className="text-lg">💎</span>
                <div>
                  <div className="font-medieval font-semibold text-sky-200">Gem of Context Memory</div>
                  <div className="text-[10px] text-stone-400">Saves mana via prompt caching</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
