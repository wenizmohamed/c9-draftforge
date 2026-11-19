# Junie TDD Task Spec — Fearless Pool-Squeeze & Target Ban Engine

Follow `.junie/guidelines.md` strictly. Execute genuine **red-green TDD**:
1. Write failing unit tests first in `test/fearlessSqueeze.test.js` (using `node:test` and `node:assert/strict`) and confirm they fail before implementation.
2. Implement `src/fearlessSqueeze.js` as a pure, zero-dependency native ESM module importing from `./champions.js` and `./fearlessDraft.js`.
3. Run `npm test` and confirm 100% passing tests across all suites (0 failures).

## Module Contract: `src/fearlessSqueeze.js`

Export `analyzeFearlessSqueeze({ series, macroReport, activeSide = 'blue' })`:
- Uses `getFearlessLockouts(series, series.currentGameIndex)` and `getCurrentGameUsedSet(series.games[series.currentGameIndex])` from `./fearlessDraft.js` to identify every unavailable champion (Fearless-locked from prior games OR banned/picked in the current game).
- Evaluates opponent players from `macroReport.opponentPoolProfiles` (gracefully falling back to empty pools if `macroReport` or `opponentPoolProfiles` is missing/empty) across all 5 roles (`TOP`, `JGL`, `MID`, `BOT`, `SUP`).
- Returns:
  ```js
  {
    rolePressures: [
      {
        role: 'TOP' | 'JGL' | 'MID' | 'BOT' | 'SUP',
        playerName: string,
        knownPool: string[],            // opponent's scouted champion IDs
        lockedOutPool: string[],        // subset of knownPool currently Fearless-locked or used in active game
        remainingComfortIds: string[],  // subset of knownPool still available
        remainingComfortCount: number,
        metaPoolRemaining: number,      // total CHAMPIONS for this role still available
        squeezeIndex: number,           // deterministic integer 0..100
        pressureLevel: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW', // >=78 CRITICAL, >=60 HIGH, >=40 MODERATE, else LOW
        recommendedAction: string
      }
    ],
    targetBans: [
      // Top 3 currently AVAILABLE (not Fearless-locked, not used in active game) champions sorted by squeezeScore desc
      {
        championId: string,
        championName: string,
        role: string,
        targetPlayer: string,
        squeezeScore: number,           // deterministic integer 0..100
        rationale: string
      }
    ],
    summary: {
      highestPressureRole: string,
      highestPressurePlayer: string,
      totalLockedChampions: number,     // number of Fearless-locked champions from prior games
      remainingSeriesGames: number,     // series.maxGames - series.currentGameIndex
      coachDirective: string
    }
  }
  ```

## Test Requirements: `test/fearlessSqueeze.test.js`
Include at least 5 deterministic tests:
1. Game 1 baseline squeeze analysis on `PRO_SCOUTING_PRESETS['c9-tl-lcs-finals']` (verifying 5 `rolePressures`, 3 `targetBans`, valid integer `squeezeIndex` in `0..100`, valid `summary`).
2. Cross-game Fearless lockout escalation from Game 1 -> Game 2: after drafting opponent signature champions in Game 1 and advancing to Game 2, verify `lockedOutPool` increases, `remainingComfortCount` decreases, and `summary.totalLockedChampions === 10`.
3. `targetBans` strictly exclude all Fearless-locked champions AND all champions already banned/picked in the current game.
4. `BO3` vs `BO5` `remainingSeriesGames` calculation accurately tracks `maxGames - currentGameIndex`.
5. Graceful edge-case handling when `opponentPoolProfiles` is empty or all opponent comfort champions are locked out.
