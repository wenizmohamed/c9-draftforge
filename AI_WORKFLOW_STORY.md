# AI Workflow Story — Building C9 DraftForge with JetBrains WebStorm, Junie CLI & Air

**Project:** C9 DraftForge (Cloud9 x JetBrains Hackathon 2026 — Category 2: LoL Macro Scouting & Draft Management System)  
**Verified Junie Session ID:** `session-261120-022709-1mth`  
**Committed Session Artifact:** [`.junie/sessions/junie-fearless-squeeze-session.json`](.junie/sessions/junie-fearless-squeeze-session.json)

---

## 1. Why We Used JetBrains WebStorm + Junie + Air

Professional League of Legends draft preparation leaves zero room for hallucinated math or flaky state transitions. Under 2025/2026 **Fearless Draft** rules, a single off-by-one lockout bug in Game 3 or a miscalculated champion pool squeeze score undermines a coaching staff's entire BO5 prep.

To ship a zero-build, zero-dependency, 100% deterministic application fast enough for a hackathon while maintaining pro-grade engineering rigor, we split work cleanly across JetBrains tools:

1. **JetBrains WebStorm (`.idea/runConfigurations/`)**
   - Configured two shared XML run profiles committed right into the repository:
     - `C9 DraftForge Dev Server` (`scripts/dev-server.mjs` on port `4173`)
     - `Run Draft & Macro Tests` (`npm test` -> `node --test test/*.test.js`)
   - Annotated every module (`src/champions.js`, `src/fearlessDraft.js`, `src/gridLolParser.js`, `src/macroAnalytics.js`, `src/fearlessSqueeze.js`) with JSDoc signatures so WebStorm gives full static type inference and refactoring safety without needing a TypeScript compile step.

2. **Junie CLI (`26.11.2`) — Real Authenticated Red-Green TDD Sprint**
   - Authored repository-level rules in [`.junie/guidelines.md`](.junie/guidelines.md) enforcing pure deterministic functions, zero runtime dependencies, and strict `node:test` verification.
   - Authored an explicit contract spec in [`.junie/tasks/fearless-squeeze-spec.md`](.junie/tasks/fearless-squeeze-spec.md) for the **Fearless Pool-Squeeze & Target Ban Engine**.
   - Invoked authenticated Junie CLI non-interactively with `--output-format=json --json-output-file=.junie/sessions/junie-fearless-squeeze-session.json`.
   - **What Junie actually built (`session-261120-022709-1mth`):**
     - Wrote failing tests first in `test/fearlessSqueeze.test.js` (confirmed red state).
     - Implemented `src/fearlessSqueeze.js` (84 lines of pure, immutable ESM computing `rolePressures`, ranked `targetBans`, and `summary.coachDirective`).
     - Added 7 edge-case unit tests covering Game 1 baselines, cross-game Fearless escalation (`G1 -> G2`), distinguishing previous-game picks (locked) from previous-game bans (re-open), `BO3`/`BO5` remaining-game math, empty/missing scouting profiles, fully exhausted comfort pools, flex-pick deduplication, and strict input immutability.
     - Verified `npm test` -> **17 passed, 0 failed** at sprint completion, later expanded with 14 deterministic Series Delta & Game 1->5 Pool Collapse Matrix tests (`test/seriesSimulator.test.js`) to **31 passed, 0 failed**.

3. **JetBrains Air — Parallel Specification-Driven Workflow**
   - Because the contract between `src/fearlessSqueeze.js`, `src/seriesSimulator.js`, `src/macroAnalytics.js`, and `app.js` was locked upfront in `.junie/tasks/fearless-squeeze-spec.md`, Junie executed its TDD sprint autonomously while the editorial war-room UI (`index.html`, `styles.css`, `app.js`), official Riot Data Dragon asset vendoring (`scripts/fetch-lol-assets.mjs`), and Playwright E2E harness (`scripts/verify-e2e.mjs`) were built in parallel — integrating on the first try with zero runtime or console errors.
   - Live workspace capture from WebStorm 2026.3 + JetBrains Air + Junie is committed at [`assets/jetbrains-air-junie-workspace.png`](assets/jetbrains-air-junie-workspace.png) and displayed on [`workflow.html`](workflow.html).

---

## 2. Reproducing Our Verification Locally

```bash
# 1. Run all 31 deterministic unit tests (including Junie's 7 Fearless Squeeze TDD tests + 14 Series Simulator tests)
npm test

# 2. Launch local dev server (or click "C9 DraftForge Dev Server" in WebStorm)
npm run dev

# 3. Run headless Playwright E2E assertions (1440px + 390px, 0 console/page errors, 0px overflow)
npm run verify:e2e
```
