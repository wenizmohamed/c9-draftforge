# Junie Project Guidelines — C9 DraftForge

## Architecture
- **Zero-build native ESM**: Pure browser + Node 22+ ES Modules (`"type": "module"` in `package.json`). No TypeScript compilation, no bundlers, no external runtime npm dependencies.
- **Core domain modules (`src/`)**:
  - `src/champions.js`: Canonical 28-champion LCS/MSI pro meta catalog (`CHAMPIONS`, `CHAMPION_BY_ID`, `ROLES`). Each champion has `{ id, name, roles, damageType, tags, counters, synergies, tier, pickRate, asset }`.
  - `src/fearlessDraft.js`: BO3/BO5 Fearless Draft state engine (hard lockouts across games, 10-ban / 10-pick draft order, composition synergy & AP/AD damage profile, counter-pick recommendations).
  - `src/gridLolParser.js`: Official GRID LoL Series State JSON parser (`data.seriesState.games[]`) and 3 pro match presets.
  - `src/macroAnalytics.js`: Deterministic Gold@15 delta, objective control rates, calibrated Summoner's Rift jungle proximity & first-gank heat coordinates, player pool depth & Fearless fatigue, and Markdown/JSON dossier export.
  - `src/fearlessSqueeze.js`: Opponent Pool-Squeeze & Target Ban Engine (built via Junie TDD sprint).

## Engineering Standards
- Write pure, deterministic functions with zero side effects and zero external dependencies.
- Use Node's built-in test runner (`node:test` and `node:assert/strict`).
- Always verify changes by running `npm test` and confirming 100% passing tests.
- Validate edge cases cleanly (empty pools, locked-out champions, BO3 vs BO5 remaining games, invalid role inputs).
- Keep JSDoc annotations concise and accurate so JetBrains WebStorm provides full type inference without a build step.
