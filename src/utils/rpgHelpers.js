// rpgHelpers.js - RPG Stats, Classes, and Spell Mappings

/**
 * Calculates RPG level based on tokens and step count.
 * Level range: 1 to 99.
 */
export function calculateLevel(tokens = 0, steps = 0) {
  const totalWeight = Number(tokens || 0) + Number(steps || 0) * 800;
  if (totalWeight <= 0) return 1;
  const lvl = Math.floor(Math.sqrt(totalWeight / 350)) + 1;
  return Math.min(99, Math.max(1, lvl));
}

/**
 * Calculates XP percentage towards the next level.
 */
export function calculateXpProgress(tokens = 0, steps = 0) {
  const currentLvl = calculateLevel(tokens, steps);
  if (currentLvl >= 99) return 100;

  const currentLevelMinTokens = Math.pow(currentLvl - 1, 2) * 350;
  const nextLevelMinTokens = Math.pow(currentLvl, 2) * 350;
  const totalWeight = Number(tokens || 0) + Number(steps || 0) * 800;

  const range = nextLevelMinTokens - currentLevelMinTokens;
  if (range <= 0) return 0;
  const progress = ((totalWeight - currentLevelMinTokens) / range) * 100;
  return Math.min(100, Math.max(0, Math.round(progress)));
}

/**
 * Formats tokens as Mana with suffix (k, M).
 */
export function formatMana(tokens = 0) {
  const num = Number(tokens || 0);
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(2) + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + 'k';
  }
  return num.toLocaleString();
}

/**
 * Formats USD cost into Fantasy Gold & Silver coins.
 * $0.01 = 1 Silver, $1.00 = 100 Gold.
 */
export function formatGoldCost(costUsd = 0) {
  const usd = Number(costUsd || 0);
  if (usd === 0) return '0 🪙';
  const gold = Math.floor(usd * 100);
  const silver = Math.round((usd * 100 - gold) * 10);
  if (gold > 0 && silver > 0) {
    return `${gold}g ${silver}s 🪙`;
  }
  if (gold > 0) {
    return `${gold} Gold 🪙`;
  }
  return `${Math.max(1, silver)} Silver 🥈`;
}

/**
 * Assigns an RPG Class based on agent role or model.
 */
export function getAgentClass(agentName = '', model = '') {
  const name = (agentName || '').toLowerCase();
  const mdl = (model || '').toLowerCase();

  if (name.includes('blacksmith') || name.includes('builder') || name.includes('coder') || mdl.includes('coder')) {
    return {
      title: 'Code Engineer (Builder)',
      specialty: 'File edits, patches, and build tools',
      avatar: '⚒️',
      color: 'text-amber-400',
      badgeClass: 'badge-gold',
      station: 'Code Forge & Anvil',
    };
  }

  if (name.includes('scholar') || name.includes('researcher') || name.includes('planner') || mdl.includes('qwen')) {
    return {
      title: 'Codebase Researcher (Explore)',
      specialty: 'Code search, file reading, and symbol lookups',
      avatar: '📜',
      color: 'text-emerald-400',
      badgeClass: 'badge-active',
      station: 'Research Desk & Docs',
    };
  }

  if (name.includes('alchemist') || name.includes('debugger') || name.includes('reason') || mdl.includes('r1')) {
    return {
      title: 'Test & QA Savant (Reviewer)',
      specialty: 'Running test suites, linters, and verification',
      avatar: '⚗️',
      color: 'text-purple-400',
      badgeClass: 'badge-purple',
      station: 'Testing & QA Lab',
    };
  }

  if (name.includes('scout') || name.includes('subtask') || name.includes('terminal')) {
    return {
      title: 'Task Dispatcher (Subagent)',
      specialty: 'Autonomous subtasks and rapid execution',
      avatar: '🗡️',
      color: 'text-sky-400',
      badgeClass: 'badge-mana',
      station: 'Task Dispatch Board',
    };
  }

  // Default Master
  return {
    title: 'Session Lead (Master Agent)',
    specialty: 'High-level orchestration and reasoning',
    avatar: '🧙‍♂️',
    color: 'text-indigo-400',
    badgeClass: 'badge-mana',
    station: 'Master Command Desk',
  };
}

/**
 * Maps a tool invocation to an RPG Spell or Ritual.
 */
export function getToolSpell(toolName = '') {
  const t = (toolName || '').toLowerCase();
  switch (t) {
    case 'bash':
    case 'run_command':
    case 'execute':
      return {
        spellName: 'Alchemical Ignition',
        actionLabel: 'Command Invoked',
        icon: '⚡',
        theme: 'amber',
      };
    case 'edit':
    case 'edit_file':
    case 'replace_file_content':
      return {
        spellName: 'Rune Inscription',
        actionLabel: 'Scroll Modified',
        icon: '✍️',
        theme: 'emerald',
      };
    case 'write':
    case 'write_to_file':
    case 'create_file':
      return {
        spellName: 'Genesis Glyph',
        actionLabel: 'Tome Inscribed',
        icon: '✨',
        theme: 'emerald',
      };
    case 'read':
    case 'view_file':
    case 'cat':
      return {
        spellName: 'Eye of True Sight',
        actionLabel: 'Scroll Examined',
        icon: '👁️',
        theme: 'sky',
      };
    case 'git':
    case 'commit':
      return {
        spellName: 'Chronicle Seal',
        actionLabel: 'State Sealed into History',
        icon: '📜',
        theme: 'purple',
      };
    case 'search':
    case 'grep':
    case 'find':
      return {
        spellName: 'Divination Whispers',
        actionLabel: 'Scrying Codebase',
        icon: '🔮',
        theme: 'indigo',
      };
    default:
      return {
        spellName: 'Arcane Ritual',
        actionLabel: 'Ritual Cast',
        icon: '🪄',
        theme: 'amber',
      };
  }
}

/**
 * Relative time formatter (e.g. "Just now", "5m ago", "2h ago", "Yesterday")
 */
export function formatRelativeTime(timestamp) {
  if (!timestamp) return 'Ancient Era';
  const time = typeof timestamp === 'number' && timestamp < 1e11 ? timestamp * 1000 : timestamp;
  const now = Date.now();
  const diffSec = Math.floor((now - new Date(time).getTime()) / 1000);

  if (diffSec < 10) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  const days = Math.floor(diffSec / 86400);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  return new Date(time).toLocaleDateString();
}
