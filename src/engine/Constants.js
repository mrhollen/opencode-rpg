// Constants.js - Core RPG Engine configurations, biomes, and palettes

export const TILE_SIZE = 32;
export const MAP_COLS = 64;
export const MAP_ROWS = 64;
export const WORLD_WIDTH = MAP_COLS * TILE_SIZE; // 2048 px
export const WORLD_HEIGHT = MAP_ROWS * TILE_SIZE; // 2048 px

export const BIOMES = {
  FOREST: 'forest',
  DESERT: 'desert',
  SNOW: 'snow',
  VOID: 'void',
};

export const TILE_TYPES = {
  GRASS_1: 0,
  GRASS_2: 1,
  GRASS_FLOWERS: 2,
  GRASS_PEBBLES: 3,
  COBBLESTONE: 4,
  COBBLE_EDGE: 5,
  PLAZA_STONE: 6,
  WATER: 7,
  WATER_SHALLOW: 8,
  DIRT: 9,
  WOOD_FLOOR: 10,
};

export const STATION_TYPES = {
  FORGE: 'forge',
  LIBRARY: 'library',
  ALCHEMY: 'alchemy',
  NOTICE_BOARD: 'notice_board',
  TREASURY: 'treasury',
};

export const AGENT_ROLES = {
  MASTER: 'master',       // Grand Mage / Guildmaster
  BUILD: 'build',         // Dwarf Blacksmith (builder/coder)
  EXPLORE: 'explore',     // Elf Scholar (search/reader)
  REVIEW: 'review',       // Alchemist Mage (tester/linter)
  TASK: 'task',           // Apprentice Rogue (dispatcher)
  COURIER: 'courier',     // Courier Apprentice (messenger)
};

export const AGENT_STATUSES = {
  IDLE: 'idle',
  WORKING: 'working',
  THINKING: 'thinking',
  RESTING: 'resting',
  DELIVERING: 'delivering',
};

// Biome-specific configuration and thematic color palettes
export const BIOME_CONFIGS = {
  [BIOMES.FOREST]: {
    id: 'forest',
    name: 'Verdant Forest',
    icon: '🌲',
    description: 'Emerald meadows, blooming poppies, babbling brook, and ancient oaks',
    groundBase: '#3b7a24',
    groundDark: '#265819',
    groundLight: '#549c32',
    groundAccent1: '#fbbf24', // Buttercups
    groundAccent2: '#ef4444', // Poppies
    pathBase: '#57524d',
    pathDark: '#33302e',
    pathLight: '#78716c',
    pathHighlight: '#a8a29e',
    plazaBase: '#44403c',
    waterDeep: '#0369a1',
    waterBase: '#0284c7',
    waterLight: '#38bdf8',
    waterFoam: '#e0f2fe',
    minimapGround: '#26341d',
    minimapWater: '#0284c7',
  },
  [BIOMES.DESERT]: {
    id: 'desert',
    name: 'Shifting Dunes',
    icon: '🏜️',
    description: 'Sun-scorched golden sands, sandstone avenues, date palms, and turquoise oasis',
    groundBase: '#d97706',
    groundDark: '#b45309',
    groundLight: '#f59e0b',
    groundAccent1: '#fde68a', // Sand ripples
    groundAccent2: '#78350f', // Clay pebbles
    pathBase: '#d4a373',
    pathDark: '#99582a',
    pathLight: '#faedcd',
    pathHighlight: '#fefae0',
    plazaBase: '#bc6c25',
    waterDeep: '#0891b2',
    waterBase: '#06b6d4',
    waterLight: '#67e8f9',
    waterFoam: '#cffafe',
    minimapGround: '#b45309',
    minimapWater: '#06b6d4',
  },
  [BIOMES.SNOW]: {
    id: 'snow',
    name: 'Frostpeak Glade',
    icon: '❄️',
    description: 'Pristine snowdrifts, frosted pines, braziers, and frozen cracked lake',
    groundBase: '#e2e8f0',
    groundDark: '#cbd5e1',
    groundLight: '#f8fafc',
    groundAccent1: '#93c5fd', // Ice crystals
    groundAccent2: '#64748b', // Frosted pebbles
    pathBase: '#64748b',
    pathDark: '#334155',
    pathLight: '#94a3b8',
    pathHighlight: '#cbd5e1',
    plazaBase: '#475569',
    waterDeep: '#0284c7',
    waterBase: '#38bdf8',
    waterLight: '#bae6fd',
    waterFoam: '#ffffff', // Ice cracks
    minimapGround: '#cbd5e1',
    minimapWater: '#38bdf8',
  },
  [BIOMES.VOID]: {
    id: 'void',
    name: 'Arcane Obsidian Void',
    icon: '🔮',
    description: 'Dark obsidian bedrock, glowing neon runic avenues, mana crystals, and cosmic purple pools',
    groundBase: '#171126',
    groundDark: '#0a0614',
    groundLight: '#261b3d',
    groundAccent1: '#a855f7', // Mana veins
    groundAccent2: '#06b6d4', // Arcane sparkles
    pathBase: '#3b0764',
    pathDark: '#1e0338',
    pathLight: '#581c87',
    pathHighlight: '#d946ef',
    plazaBase: '#2e1065',
    waterDeep: '#3b0764',
    waterBase: '#6b21a8',
    waterLight: '#a855f7',
    waterFoam: '#f0abfc',
    minimapGround: '#171126',
    minimapWater: '#6b21a8',
  },
};

// Retro 16-bit / 32-bit color palette
export const PALETTE = {
  // Greens
  grassDark: '#265819',
  grassBase: '#3b7a24',
  grassLight: '#549c32',
  grassHighlight: '#74bf43',
  clover: '#10b981',

  // Dirt & Wood
  dirtDark: '#452b14',
  dirtBase: '#6b4423',
  dirtLight: '#8a5c34',
  woodDark: '#382212',
  woodBase: '#5c381e',
  woodLight: '#82532f',
  woodHighlight: '#b37848',

  // Stone & Cobblestone
  stoneDark: '#33302e',
  stoneBase: '#57524d',
  stoneLight: '#78716c',
  stoneHighlight: '#a8a29e',

  // Water
  waterDeep: '#0369a1',
  waterBase: '#0284c7',
  waterLight: '#38bdf8',
  waterFoam: '#e0f2fe',

  // Accents & Embers
  amberGold: '#f59e0b',
  brightGold: '#fde047',
  deepGold: '#b45309',
  torchOrange: '#ea580c',
  torchYellow: '#fef08a',
  crimson: '#dc2626',
  rubyRed: '#ef4444',
  manaCyan: '#06b6d4',
  arcanePurple: '#9333ea',
  potionGreen: '#22c55e',

  // Dark & Shadows
  shadow: 'rgba(0, 0, 0, 0.35)',
  ambientNight: 'rgba(10, 15, 36, 0.82)',
  ambientDusk: 'rgba(92, 38, 56, 0.45)',
  ambientDawn: 'rgba(120, 80, 100, 0.28)',
};
