# 🏰 OpenCode RPG — Realm of Agents ⚔️

An interactive 2D retro pixel RPG interface for checking in on **OpenCode**'s projects, sessions, subagents, and tasks.

Each OpenCode project is rendered as a distinct **Realm/World**, and each session is represented as a **Guild Workshop / Hut** where the master agent and subagents work at specialized stations in real time.

---

## 🌟 Key Features

### 1. 🗺️ One World Per Project (The Atlas of Known Realms)
- Switch seamlessly between your OpenCode workspaces/projects (`corvus`, `crowban`, `opencode-rpg`, `media-streamer`, etc.).
- Displays aggregate realm statistics: session count, active agent count, total token mana consumed, and gold spent.

### 2. 🏠 Walk-In House Interior Views (Guild Workshops)
Step directly into any session's house! Walking through the doorway (or pressing `Space`/`E` near it) smoothly transitions the canvas into a full interactive **Interior Workshop View**:
- Hand-crafted interior architecture: Polished oak parquet floor, crimson guild crest rug, dark timber walls, leaded glass windows, and a roaring stone fireplace with flickering firelight.
- 7 specialized indoor workstations:
  - 🔮 **Master Command Lectern**: Scrying crystal ball, project blueprints, and the Grand Mage.
  - 🔨 **Corner Forge & Anvil**: Hot coals, anvil, water trough, and Dwarf Blacksmith with spark bursts.
  - 📚 **Royal Scriptorium**: Twin mahogany bookshelves, reading lectern, and Elf Scholar studying floating runes.
  - 🧪 **Alchemical Laboratory**: Heavy workbench, retort coils, bubbling flasks, and Alchemist Mage.
  - 📜 **Guild Wall Bounty Board**: Interactive quest scrolls with wax seals.
  - 🕊️ **Royal Messenger Desk**: Pigeon post dispatch box for enqueuing commands.
  - 💰 **Treasury & Vault**: Iron-bound token vault.
- Full interior player navigation with furniture collision physics. Step onto the exit rug (`▼ EXIT TO VILLAGE`) to return outside.

### 3. 🌀 The Ancient Stargate & Galactic Overworld Map
Modeled after the iconic Naquadah ring and DHD from *Stargate*:
- **In-Village Stargate Portal**: Situated on an elevated stone dais North of the town square with 9 mechanical chevrons, DHD pedestal, spinning glyph ring, and a swirling aquatic event horizon ("the puddle").
- **Iconic "Kawoosh" Wormhole Eruption**: Locking chevron 7 triggers an unstable plasma blast wave and particle eruption that settles into the wormhole vortex!
- **Stargate Command / Galactic Dial Device**: Interactive dialing computer mapping all project workspaces as planets (e.g. `P3X-357 (crowban)`). Displays authentic 7-chevron gate addresses (`ᚠ ᛚ ᛟ ᚱ ᛖ ᛊ ᛒ`), planetary biomes, and live beacon telemetry.
- Press `G` or click the DHD to initiate the automated 7-chevron dialing sequence with metallic lock sounds and wormhole transition!

### 4. ⏳ Single-GPU Smart Decree Queue (VRAM Protector)
Designed specifically for local single-GPU workstations running Ollama, llama.cpp, or local models:
- **Active Lock & Token Generation Monitor**: Scans `/home/hollen/.local/state/opencode/locks` and database activity in real time.
- **Safe Message Buffering**: When OpenCode is actively processing, new user instructions/prompts are held safely in a priority queue without overloading the GPU.
- **Automatic Idle Dispatch**: The split-second the GPU finishes its current generation and goes idle, the worker automatically dispatches the next queued decree via `opencode run -s <sessionId> "<prompt>"`.
- Real-time `🟡 GPU BUSY (Generating tokens...)` vs `🟢 GPU IDLE (Ready for dispatch)` status indicators in the HUD.

### 5. 🌲 4 Dynamic Biomes
Switch realms and watch the world dynamically adapt its terrain, vegetation, and lighting:
- 🌲 **Verdant Forest**: Emerald meadow grass, buttercups & poppies, oak trees, and cobblestone avenues.
- 🏜️ **Desert Citadel**: Golden sands, sandstone avenues, date palms, blooming saguaro cacti, and turquoise oasis water.
- ❄️ **Snow Fortress**: Frosted snowdrifts, icy pathways, snow-capped pines, and translucent frozen lake.
- 🔮 **Arcane Void**: Obsidian ground, glowing neon cyan/magenta runes, crystal monoliths, and cosmic purple mana pools.

### 6. 🧙‍♂️ Live Agent Activity & Overhead Thoughts
- **Real-Time Working Animations**: Watch agents hammer at the forge, brew bubbling potions, page through glowing grimoires, or cast runes.
- **Overhead Speech Bubbles**: See what each agent is thinking or working on in real time (e.g. *"Brewing regression test suite"*, *"Forging AST code"*).
- **Courier Apprentice (*Pip the Swift*)**: An animated messenger running between the town square and active huts delivering scrolls with trailing golden sparkles.

### 7. 📜 The Chronicle & Inspector Modals
- **Character Sheet**: Master & subagents with RPG classes, model catalyst (`Qwen`, `Claude`, `GPT-4o`), level progression, HP/MP vitals, and attributes (STR, INT, AGI, LCK).
- **Quest Board**: Interactive checklist with click-to-complete fanfare chime, new quest creation, priority ribbons, and campaign progress bar.
- **The Chronicle**: Full chronological session history separating user decrees, inner monologue contemplations, and alchemical tool calls (terminal commands, file diffs, git operations) with syntax formatting and search.
- **The Great Forge**: Dedicated code diff viewer with file tree, colored additions and deletions, and commit SHAs.
- **The Royal Scribe**: 4-chapter illuminated high-fantasy saga translating code commits and todos into a medieval quest tale.
- **The Royal Treasury**: Visual token usage charts, cache hit rate gauge (e.g. 96% hit rate saving $74+ USD), and model catalyst breakdown.

### 8. 🎮 Immersive Controls & Atmosphere
- **Controllable Overseer Avatar**: Walk around using `W` `A` `S` `D` or arrow keys, or click on the terrain to move.
- **Day / Night Lighting Cycle**: Dynamic ambient lighting with radial halos around lanterns, torches, and forge embers in the dark.
- **8-Bit Web Audio Synthesizer**: Pure Web Audio API retro sound effects (blip, click, fanfare, hammer clink, parchment rustle, Stargate chevron lock, kawoosh, door open/close) and procedural day/night chiptune background music.
- **Radar Minimap with Click-to-Teleport**: Click anywhere on the radar minimap to instantly teleport the Overseer!
- **Vintage CRT Overlay**: Optional retro scanlines and curvature effect.

---

## 🚀 Quick Start

### Prerequisites
- Node.js v20+ (Node 26 recommended)
- OpenCode installed (`~/.local/share/opencode/opencode.db` is read automatically in read-only mode)

### Installation
```bash
git clone ssh://git@forgejo.lan:2222/mrhollen/opencode-rpg.git
cd opencode-rpg
npm install
```

### Running in Development
Start both the backend API server and the Vite dev client with live hot reload:
```bash
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

### Running in Production
Build the static bundle and run the self-contained server:
```bash
npm run build
npm start
```
Open **[http://localhost:3001](http://localhost:3001)** in your browser.

### Verification Suite
Run the automated test suite to verify DB connectivity and endpoints:
```bash
npm run test:server
```

Run the visual test using Puppeteer:
```bash
node test/visual-test.cjs
```

---

## ⌨️ Controls & Hotkeys

| Action | Control / Hotkey |
| :--- | :--- |
| **Walk Overseer** | `W` `A` `S` `D` or `Arrow Keys` |
| **Click to Move** | `Left Click` on terrain |
| **Inspect Hut / Agent** | `Space`, `E`, or `Left Click` on Hut |
| **Pan Camera** | `Right Click + Drag` |
| **Zoom Camera** | `Mouse Wheel` or `+` / `-` |
| **Reset Camera** | `0` or click **Center** |
| **Toggle Follow Cam** | `F` |
| **Cycle Day / Night** | `T` |
| **Toggle Sound FX** | `M` |
| **Close Modal** | `Escape` or `✕` |

---

## 🏛️ Architecture

```
opencode-rpg/
├── server/
│   ├── db.js          # SQLite reader (node:sqlite) + fallback mock generator
│   ├── queue.js       # Single-GPU smart decree queue & lock monitor
│   ├── index.js       # Express REST API (port 3001) + SSE live stream + static server
│   └── verify.js      # Comprehensive backend & queue test suite
├── src/
│   ├── engine/        # HTML5 2D Canvas RPG Engine
│   │   ├── TileMap.js         # Procedural multi-biome terrain generator
│   │   ├── HouseInterior.js   # Walk-in interior workshop scene with stations
│   │   ├── StargatePortal.js  # Naquadah ring, spinning glyphs, and kawoosh vortex
│   │   ├── HutRenderer.js     # Exterior pixel-art guild huts & chimneys
│   │   ├── StationRenderer.js # Forge, Library, Cauldron, Notice Board, Vault
│   │   ├── AgentSprite.js     # Animated Master & Subagent pixel characters
│   │   ├── PlayerAvatar.js    # Controllable Overseer character
│   │   ├── CourierApprentice.js # Animated messenger delivery boy (Pip the Swift)
│   │   ├── ParticleSystem.js  # Smoke, sparks, runes, potion bubbles, kawoosh
│   │   ├── Lighting.js        # Day/Night lighting and radial lantern halos
│   │   ├── Minimap.js         # Radar navigation with click-to-teleport
│   │   └── RpgCanvas.jsx      # React canvas wrapper & interior/exterior state
│   ├── components/    # Retro Pixel UI Overlays
│   │   ├── HUD.jsx            # Top stats bar, search, time/sound/CRT toggles
│   │   ├── HutModal.jsx       # Inspector modal with tabs
│   │   ├── CharacterSheet.jsx # Agent stats, model catalyst, XP, attributes
│   │   ├── QuestBoard.jsx     # Session tasks & campaign completion
│   │   ├── ChronicleViewer.jsx# Full logs: user decrees, thoughts, tool traces
│   │   ├── OverworldMapModal.jsx # Stargate DHD dialing computer & galaxy map
│   │   ├── DecreeQueueModal.jsx  # Single-GPU buffer & prompt dispatch console
│   │   ├── ForgeModal.jsx     # The Great Forge code diff & patch viewer
│   │   ├── TreasuryModal.jsx  # Royal Treasury token analytics & cache savings
│   │   ├── RoyalScribeModal.jsx # 4-chapter illuminated high-fantasy saga
│   │   ├── WorldSelectModal.jsx # Realm / Project switcher
│   │   ├── HelpModal.jsx      # Controls grimoire
│   │   └── SoundEngine.js     # Web Audio API 8-bit sound synthesizer & BGM
│   ├── App.jsx        # State manager connecting SSE events, API, and Canvas
│   └── index.css      # Retro medieval pixel styling & animations
└── test/
    └── visual-test.cjs# Puppeteer visual verification script
```