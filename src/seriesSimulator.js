/**
 * Deterministic Game 1->5 Fearless Pool Collapse Matrix & Side-by-Side
 * Series Delta / Win-Condition Simulator for C9 DraftForge.
 *
 * Pure zero-dependency ES module designed for both Node 22+ `node:test`
 * verification and instant zero-build browser recalculation.
 */

import { CHAMPIONS, CHAMPION_BY_ID, ROLES } from './champions.js';
import { getFearlessLockouts, getCurrentGameUsedSet } from './fearlessDraft.js';

export const BAN_WAVE_INTENSITIES = Object.freeze({
  STANDARD: { id: 'STANDARD', label: 'Standard', extraPinchBans: 0, attritionBonus: 0, edgeBonus: 0 },
  AGGRESSIVE: { id: 'AGGRESSIVE', label: 'Aggressive', extraPinchBans: 1, attritionBonus: 8, edgeBonus: 2.6 },
  ALL_IN: { id: 'ALL_IN', label: 'All-In Pinch', extraPinchBans: 2, attritionBonus: 15, edgeBonus: 4.8 }
});

export const SIMULATOR_SCENARIOS = Object.freeze([
  {
    id: 'mid-pinch',
    label: 'Mid Pinch (Default)',
    description: 'Choke opponent mid-lane comfort pool into Game 4/5.',
    pinchRole: 'MID',
    banWaveIntensity: 'AGGRESSIVE',
    voidgrubPriority: true
  },
  {
    id: 'jgl-tempo',
    label: 'Jungle Tempo Choke',
    description: 'Strip engage junglers early while contesting 6:00 Voidgrubs.',
    pinchRole: 'JGL',
    banWaveIntensity: 'AGGRESSIVE',
    voidgrubPriority: true
  },
  {
    id: 'bot-denial',
    label: 'Bot Dive Denial',
    description: 'Squeeze opponent ADC lane prio & cross-map dragon trades.',
    pinchRole: 'BOT',
    banWaveIntensity: 'ALL_IN',
    voidgrubPriority: false
  },
  {
    id: 'g5-stress',
    label: 'Game 5 Stress Test',
    description: 'Maximum All-In ban pressure + Voidgrub tempo across a full series.',
    pinchRole: 'AUTO',
    banWaveIntensity: 'ALL_IN',
    voidgrubPriority: true
  }
]);

const DEFAULT_C9_ROSTER = Object.freeze({
  TOP: { name: 'Thanatos', pool: ['KSante', 'Rumble', 'Jax', 'Renekton'] },
  JGL: { name: 'Blaber', pool: ['Vi', 'Sejuani', 'XinZhao', 'Skarner'] },
  MID: { name: 'Loki', pool: ['Azir', 'Orianna', 'Ahri', 'Corki'] },
  BOT: { name: 'Zven', pool: ['Varus', 'Kaisa', 'Jinx', 'Kalista'] },
  SUP: { name: 'Vulcan', pool: ['Renata', 'Alistar', 'Rakan', 'Nautilus'] }
});

const COLLAPSE_SEVERITY = Object.freeze({
  OPEN: 0,
  STRAINED: 1,
  SQUEEZED: 2,
  CRITICAL_SQUEEZE: 3,
  EXHAUSTED: 4
});

const COLLAPSE_LABELS = Object.freeze({
  OPEN: 'OPEN',
  STRAINED: 'STRAINED',
  SQUEEZED: 'SQUEEZED',
  CRITICAL_SQUEEZE: 'CRITICAL SQUEEZE',
  EXHAUSTED: 'EXHAUSTED'
});

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function round1(val) {
  return Number(val.toFixed(1));
}

function validRolePool(ids) {
  if (!Array.isArray(ids)) return [];
  return [...new Set(ids.filter((id) => typeof id === 'string' && Object.hasOwn(CHAMPION_BY_ID, id)))];
}

function getRoleMetaChampions(role) {
  return CHAMPIONS.filter((c) => c.roles.includes(role)).sort(
    (a, b) => b.pickRate - a.pickRate || a.id.localeCompare(b.id)
  );
}

/**
 * Normalize simulator options safely so invalid inputs always resolve deterministically.
 * @param {object} [options]
 * @param {object} [macroReport]
 */
export function normalizeSimulatorOptions(options = {}, macroReport = null) {
  const rawPinch = typeof options?.pinchRole === 'string' ? options.pinchRole.toUpperCase() : 'AUTO';
  const pinchRole = rawPinch === 'AUTO' || ROLES.includes(rawPinch) ? rawPinch : 'AUTO';

  const rawIntensity = typeof options?.banWaveIntensity === 'string' ? options.banWaveIntensity.toUpperCase() : 'AGGRESSIVE';
  const banWaveIntensity = Object.hasOwn(BAN_WAVE_INTENSITIES, rawIntensity) ? rawIntensity : 'AGGRESSIVE';

  const voidgrubPriority = options?.voidgrubPriority !== undefined ? Boolean(options.voidgrubPriority) : true;

  // Determine effective pinch role when AUTO is selected
  let effectivePinchRole = pinchRole;
  if (effectivePinchRole === 'AUTO') {
    const oppProfiles = Array.isArray(macroReport?.opponentPoolProfiles) ? macroReport.opponentPoolProfiles : [];
    const ranked = [...oppProfiles]
      .filter((p) => ROLES.includes(p?.role))
      .sort(
        (a, b) =>
          (b.fearlessFatigueScore || 0) - (a.fearlessFatigueScore || 0) ||
          (a.uniqueCount || 99) - (b.uniqueCount || 99) ||
          ROLES.indexOf(a.role) - ROLES.indexOf(b.role)
      );
    effectivePinchRole = ranked[0]?.role || 'MID';
  }

  return {
    pinchRole,
    effectivePinchRole,
    banWaveIntensity,
    voidgrubPriority
  };
}

/**
 * Extract per-role rosters & comfort pools for Cloud9 (focus) and opponent.
 */
function resolveTeamRolePools(macroReport, series) {
  const oppProfiles = Array.isArray(macroReport?.opponentPoolProfiles) ? macroReport.opponentPoolProfiles : [];
  const focusProfiles = Array.isArray(macroReport?.focusPoolProfiles) ? macroReport.focusPoolProfiles : [];

  // Also absorb any live drafted picks in current series as known played comfort champions
  const bluePickedByRole = new Map(ROLES.map((r) => [r, []]));
  const redPickedByRole = new Map(ROLES.map((r) => [r, []]));
  for (const g of series?.games || []) {
    for (const id of g.bluePicks || []) {
      const c = id ? CHAMPION_BY_ID[id] : null;
      if (c && c.roles[0]) bluePickedByRole.get(c.roles[0]).push(id);
    }
    for (const id of g.redPicks || []) {
      const c = id ? CHAMPION_BY_ID[id] : null;
      if (c && c.roles[0]) redPickedByRole.get(c.roles[0]).push(id);
    }
  }

  const byRole = {};
  for (const role of ROLES) {
    const oppP = oppProfiles.find((p) => p?.role === role);
    const focP = focusProfiles.find((p) => p?.role === role);
    const metaChamps = getRoleMetaChampions(role);

    const oppPool = validRolePool(oppP?.uniqueChampions);
    // Cloud9 comfort pool: scouted picks + fallback to default C9 LCS comfort picks so C9 always has calibrated depth
    const scoutedFocus = validRolePool(focP?.uniqueChampions);
    const defaultFocus = DEFAULT_C9_ROSTER[role].pool;
    const mergedFocus = validRolePool([
      ...scoutedFocus,
      ...bluePickedByRole.get(role),
      ...defaultFocus.slice(0, Math.max(0, 4 - scoutedFocus.length))
    ]);

    byRole[role] = {
      role,
      metaIds: metaChamps.map((c) => c.id),
      c9PlayerName: focP?.name || DEFAULT_C9_ROSTER[role].name,
      c9ComfortIds: mergedFocus,
      oppPlayerName: oppP?.name || `Opponent ${role}`,
      oppComfortIds: oppPool,
      oppFatigueBaseline: Number(oppP?.fearlessFatigueScore ?? 55),
      oppHasScoutedPool: oppPool.length > 0,
      liveOppPicked: validRolePool(redPickedByRole.get(role))
    };
  }
  return byRole;
}

/**
 * Classify opponent pool collapse status for a (role, game) cell.
 */
function classifyCollapseState({ oppComfortTotal, oppComfortRemaining, oppMetaRemaining, oppMetaTotal }) {
  if (oppMetaRemaining <= 0) return 'EXHAUSTED';
  if (oppComfortTotal > 0 && oppComfortRemaining <= 0 && oppMetaRemaining <= 1) return 'EXHAUSTED';
  if ((oppComfortTotal > 0 && oppComfortRemaining <= 0) || oppMetaRemaining <= 2) return 'CRITICAL_SQUEEZE';
  const metaDepletion = oppMetaTotal > 0 ? (oppMetaTotal - oppMetaRemaining) / oppMetaTotal : 0;
  if ((oppComfortTotal > 0 && oppComfortRemaining <= 1) || oppMetaRemaining <= 3) return 'SQUEEZED';
  if (metaDepletion >= 0.35 || (oppComfortTotal > 0 && oppComfortRemaining < oppComfortTotal)) return 'STRAINED';
  return 'OPEN';
}

/**
 * Build the interactive Game 1->N (BO3/BO5) Fearless Pool Collapse Matrix.
 *
 * Tracks cumulative Fearless lockouts across all 5 roles (TOP/JGL/MID/BOT/SUP)
 * and all games (G1..G5 for BO5, G1..G3 for BO3), reacting dynamically to:
 *  - Live drafted Fearless lockouts in `series`
 *  - Format toggle (BO3 vs BO5)
 *  - Coaching levers (`pinchRole`, `banWaveIntensity`)
 *
 * @param {{
 *   series: ReturnType<typeof import('./fearlessDraft.js').createFearlessSeries>,
 *   macroReport?: object | null,
 *   options?: { pinchRole?: string, banWaveIntensity?: string, voidgrubPriority?: boolean }
 * }} params
 */
export function buildFearlessCollapseMatrix({ series, macroReport = null, options = {} }) {
  const maxGames = series?.format === 'BO3' ? 3 : 5;
  const currentGameIndex = clamp(Number(series?.currentGameIndex || 0), 0, maxGames - 1);
  const normOpts = normalizeSimulatorOptions(options, macroReport);
  const banCfg = BAN_WAVE_INTENSITIES[normOpts.banWaveIntensity];
  const rolePools = resolveTeamRolePools(macroReport, series);

  // Build cumulative Fearless lockouts game-by-game.
  // For games <= currentGameIndex, use ACTUAL Fearless lockouts from `series`.
  // For games > currentGameIndex, project realistic 2-picks-per-role-per-game Fearless lockouts
  // prioritizing opponent comfort picks (especially on effectivePinchRole) and highest-presence meta picks.
  const cumulativeLocksByGame = [];
  const projectedGlobalLocks = new Set();

  // Seed with actual lockouts up through currentGameIndex
  const actualLockAtCurrent = getFearlessLockouts(series, currentGameIndex);
  for (const id of actualLockAtCurrent.keys()) projectedGlobalLocks.add(id);

  // Also capture current game's already-drafted picks (which will lock entering currentGameIndex + 1)
  const activeGameObj = series?.games?.[currentGameIndex];
  const activeGamePicks = activeGameObj
    ? [...(activeGameObj.bluePicks || []), ...(activeGameObj.redPicks || [])].filter(Boolean)
    : [];
  const activeGameUsed = activeGameObj ? getCurrentGameUsedSet(activeGameObj) : new Set();

  for (let gIdx = 0; gIdx < maxGames; gIdx++) {
    if (gIdx <= currentGameIndex) {
      const actualMap = getFearlessLockouts(series, gIdx);
      cumulativeLocksByGame.push(new Set(actualMap.keys()));
    } else {
      // Advance locks from the previous game
      if (gIdx === currentGameIndex + 1) {
        // Incorporate actual picks from current game first
        for (const id of activeGamePicks) projectedGlobalLocks.add(id);
      }

      // Ensure each role consumes up to 2 champions from the previous game (Blue + Red pick)
      for (const role of ROLES) {
        const rp = rolePools[role];
        const prevGame = series?.games?.[gIdx - 1];
        const prevPicksInRole =
          gIdx === currentGameIndex + 1 && prevGame
            ? [...(prevGame.bluePicks || []), ...(prevGame.redPicks || [])].filter(
                (id) => id && CHAMPION_BY_ID[id]?.roles.includes(role)
              ).length
            : 0;
        const neededPicks = Math.max(0, 2 - prevPicksInRole);

        // Priority order for simulated Fearless consumption:
        // 1. Opponent comfort picks in this role (pressured by opponent picking them or C9 denying them)
        // 2. Cloud9 comfort picks in this role
        // 3. Remaining role meta champions by pickRate
        const orderedCandidates = validRolePool([
          ...rp.oppComfortIds,
          ...rp.c9ComfortIds,
          ...rp.metaIds
        ]).filter((id) => !projectedGlobalLocks.has(id));

        for (let k = 0; k < neededPicks && k < orderedCandidates.length; k++) {
          projectedGlobalLocks.add(orderedCandidates[k]);
        }
      }

      cumulativeLocksByGame.push(new Set(projectedGlobalLocks));
    }
  }

  let firstCollapse = null;
  let criticalCellsCount = 0;

  const rows = ROLES.map((role) => {
    const rp = rolePools[role];
    const isPinchTarget = role === normOpts.effectivePinchRole;

    const cells = Array.from({ length: maxGames }, (_, gIdx) => {
      const gameNumber = gIdx + 1;
      const lockedSet = cumulativeLocksByGame[gIdx];

      // Champions in this role permanently locked by Fearless entering Game `gameNumber`
      const lockedInRoleIds = rp.metaIds.filter((id) => lockedSet.has(id));

      // In-game ban-wave compression (does NOT permanently lock future games; reduces active-game availability)
      const inGameUnavailable = new Set(lockedSet);
      const targetedBanIds = [];

      if (gIdx === currentGameIndex) {
        // Respect active game's live bans too for immediate visibility
        for (const id of activeGameUsed) {
          if (!lockedSet.has(id) && rp.metaIds.includes(id)) {
            inGameUnavailable.add(id);
          }
        }
      }

      // Apply targeted ban-wave intensity against effective pinch role (plus 1 baseline meta ban on high-fatigue roles)
      const extraBans = isPinchTarget ? banCfg.extraPinchBans : 0;
      if (extraBans > 0) {
        const banPool = validRolePool([...rp.oppComfortIds, ...rp.metaIds]).filter(
          (id) => !inGameUnavailable.has(id)
        );
        for (let b = 0; b < extraBans && b < banPool.length; b++) {
          targetedBanIds.push(banPool[b]);
          inGameUnavailable.add(banPool[b]);
        }
      }

      const oppRemainingComfortIds = rp.oppComfortIds.filter((id) => !inGameUnavailable.has(id));
      const c9RemainingComfortIds = rp.c9ComfortIds.filter((id) => !lockedSet.has(id));
      const metaRemainingIds = rp.metaIds.filter((id) => !inGameUnavailable.has(id));
      const c9MetaRemainingIds = rp.metaIds.filter((id) => !lockedSet.has(id));

      const collapseState = classifyCollapseState({
        oppComfortTotal: rp.oppComfortIds.length,
        oppComfortRemaining: oppRemainingComfortIds.length,
        oppMetaRemaining: metaRemainingIds.length,
        oppMetaTotal: rp.metaIds.length
      });

      const isCritical = collapseState === 'CRITICAL_SQUEEZE' || collapseState === 'EXHAUSTED';
      if (isCritical) criticalCellsCount += 1;

      const comfortEdge = c9RemainingComfortIds.length - oppRemainingComfortIds.length;
      const metaEdge = c9MetaRemainingIds.length - metaRemainingIds.length;
      const advantageDelta = comfortEdge + metaEdge;

      const coachNote = !rp.oppHasScoutedPool
        ? `No scouted comfort picks for ${rp.oppPlayerName} (${role}) — ${metaRemainingIds.length}/${rp.metaIds.length} meta options open in G${gameNumber}.`
        : oppRemainingComfortIds.length === 0
          ? `${rp.oppPlayerName} is completely off scouted comfort in G${gameNumber} (${metaRemainingIds.length} meta fallbacks left). ${rp.c9PlayerName} holds ${c9RemainingComfortIds.length} comfort pick(s).`
          : `${rp.oppPlayerName} has ${oppRemainingComfortIds.length}/${rp.oppComfortIds.length} comfort pick(s) open in G${gameNumber}${targetedBanIds.length ? ` after ${targetedBanIds.length} targeted pinch ban(s)` : ''}; ${rp.c9PlayerName} retains ${c9RemainingComfortIds.length}/${rp.c9ComfortIds.length}.`;

      const cell = {
        role,
        gameNumber,
        gameIndex: gIdx,
        isCurrentGame: gIdx === currentGameIndex,
        isProjected: gIdx > currentGameIndex,
        isPinchTarget,
        c9PlayerName: rp.c9PlayerName,
        oppPlayerName: rp.oppPlayerName,
        c9ComfortTotal: rp.c9ComfortIds.length,
        c9ComfortRemaining: c9RemainingComfortIds.length,
        c9RemainingComfortIds,
        c9MetaRemaining: c9MetaRemainingIds.length,
        oppComfortTotal: rp.oppComfortIds.length,
        oppComfortRemaining: oppRemainingComfortIds.length,
        oppRemainingComfortIds,
        oppMetaTotal: rp.metaIds.length,
        oppMetaRemaining: metaRemainingIds.length,
        metaRemainingIds,
        lockedInRoleIds,
        targetedBanIds,
        collapseState,
        collapseLabel: COLLAPSE_LABELS[collapseState],
        severity: COLLAPSE_SEVERITY[collapseState],
        advantageDelta,
        isFirstCollapse: false,
        coachNote
      };

      if (isCritical) {
        if (
          !firstCollapse ||
          gameNumber < firstCollapse.gameNumber ||
          (gameNumber === firstCollapse.gameNumber &&
            (cell.severity > firstCollapse.severity ||
              (cell.severity === firstCollapse.severity && isPinchTarget && !firstCollapse.isPinchTarget)))
        ) {
          firstCollapse = {
            role,
            playerName: rp.oppPlayerName,
            c9PlayerName: rp.c9PlayerName,
            gameNumber,
            gameIndex: gIdx,
            collapseState,
            collapseLabel: COLLAPSE_LABELS[collapseState],
            severity: cell.severity,
            isPinchTarget,
            reason: coachNote
          };
        }
      }

      return cell;
    });

    return {
      role,
      c9PlayerName: rp.c9PlayerName,
      oppPlayerName: rp.oppPlayerName,
      isPinchTarget,
      metaTotal: rp.metaIds.length,
      c9ComfortTotal: rp.c9ComfortIds.length,
      oppComfortTotal: rp.oppComfortIds.length,
      cells
    };
  });

  // Mark the exact first-collapse cell on the matrix
  if (firstCollapse) {
    const row = rows.find((r) => r.role === firstCollapse.role);
    const targetCell = row?.cells.find((c) => c.gameNumber === firstCollapse.gameNumber);
    if (targetCell) targetCell.isFirstCollapse = true;
  }

  return {
    format: maxGames === 3 ? 'BO3' : 'BO5',
    maxGames,
    currentGameIndex,
    gameHeaders: Array.from({ length: maxGames }, (_, i) => `G${i + 1}`),
    rows,
    summary: {
      effectivePinchRole: normOpts.effectivePinchRole,
      banWaveIntensity: normOpts.banWaveIntensity,
      criticalCellsCount,
      firstCollapse,
      totalActiveLockouts: actualLockAtCurrent.size
    }
  };
}

/**
 * Simulate Side-by-Side Series Delta & Win-Condition Projections:
 * **Unconstrained Standard Draft** vs **Fearless Pool-Squeeze Plan**.
 *
 * @param {{
 *   series: ReturnType<typeof import('./fearlessDraft.js').createFearlessSeries>,
 *   macroReport?: object | null,
 *   squeezeReport?: object | null,
 *   options?: { pinchRole?: string, banWaveIntensity?: string, voidgrubPriority?: boolean }
 * }} params
 */
export function simulateSeriesDelta({ series, macroReport = null, squeezeReport = null, options = {} }) {
  const normOpts = normalizeSimulatorOptions(options, macroReport);
  const banCfg = BAN_WAVE_INTENSITIES[normOpts.banWaveIntensity];
  const matrix = buildFearlessCollapseMatrix({ series, macroReport, options: normOpts });
  const maxGames = matrix.maxGames;

  // Baseline telemetry from GRID macro report (falls back gracefully if omitted)
  const baseGold15 = Number(macroReport?.avgGoldDelta15 ?? 0);
  const baseGrubsPct = clamp(Number(macroReport?.objectiveControl?.voidgrubsPct ?? 50), 0, 100);
  const baseHeraldPct = clamp(Number(macroReport?.objectiveControl?.riftHeraldPct ?? 50), 0, 100);
  const primaryGankLane = macroReport?.firstGankDistribution?.primaryLane || 'MID';

  // Compute baseline Cloud9 single-game win probability under Unconstrained Standard Draft
  const goldFactor = clamp(baseGold15 / 320, -8.5, 8.5);
  const objFactor = (baseGrubsPct - 50) * 0.14 + (baseHeraldPct - 50) * 0.05;
  const stdSingleGameWin = clamp(50 + goldFactor + objFactor, 28, 76);

  // Opponent average comfort-pool depth vs Cloud9 depth from the matrix
  const finalGameIdx = maxGames - 1;
  const totalOppComfort = matrix.rows.reduce((s, r) => s + r.oppComfortTotal, 0);
  const finalOppRemaining = matrix.rows.reduce((s, r) => s + r.cells[finalGameIdx].oppComfortRemaining, 0);
  const totalC9Comfort = matrix.rows.reduce((s, r) => s + r.c9ComfortTotal, 0);
  const finalC9Remaining = matrix.rows.reduce((s, r) => s + r.cells[finalGameIdx].c9ComfortRemaining, 0);

  const rawFearlessAttrition =
    totalOppComfort > 0
      ? Math.round(((totalOppComfort - finalOppRemaining) / totalOppComfort) * 100)
      : Math.round(
          (matrix.rows.reduce(
            (s, r) => s + (r.metaTotal - r.cells[finalGameIdx].oppMetaRemaining) / Math.max(1, r.metaTotal),
            0
          ) /
            ROLES.length) *
            100
        );

  const oppComfortAttritionStd = clamp(12 + Math.round(banCfg.extraPinchBans * 4), 10, 28);
  const oppComfortAttritionFearless = clamp(
    Math.max(oppComfortAttritionStd + 10, rawFearlessAttrition + Math.round(banCfg.attritionBonus * 0.35)),
    15,
    100
  );

  // Depth edge in final game
  const finalDepthDelta =
    totalOppComfort > 0
      ? finalC9Remaining - finalOppRemaining
      : matrix.rows.reduce((s, r) => s + r.cells[finalGameIdx].advantageDelta, 0) * 0.4;

  // Voidgrubs early priority lever synergy
  const grubPriorityGoldBoost = normOpts.voidgrubPriority ? 360 : -110;
  const grubPriorityShareBoost = normOpts.voidgrubPriority ? 11 : -4;
  const pinchRoleSynergy =
    normOpts.effectivePinchRole === 'TOP' || normOpts.effectivePinchRole === 'JGL' || normOpts.effectivePinchRole === 'MID'
      ? 4
      : 1;

  const pinchOffComfortGoldBonus = Math.round(
    (oppComfortAttritionFearless - oppComfortAttritionStd) * 5.8 + banCfg.extraPinchBans * 115
  );

  const standardGold15 = Math.round(baseGold15);
  const fearlessGold15 = Math.round(baseGold15 + grubPriorityGoldBoost + pinchOffComfortGoldBonus);

  const standardGrubsPct = Math.round(baseGrubsPct);
  const fearlessGrubsPct = clamp(
    Math.round(baseGrubsPct + grubPriorityShareBoost + (normOpts.voidgrubPriority ? pinchRoleSynergy : 0)),
    5,
    98
  );

  // Game-by-game win probability trajectory across G1..G5 (or G1..G3)
  const squeezePressureBoost = squeezeReport?.summary?.totalLockedChampions
    ? Math.min(3.5, squeezeReport.summary.totalLockedChampions * 0.18)
    : 0;

  const perGameWinCurve = Array.from({ length: maxGames }, (_, gIdx) => {
    const gameNumber = gIdx + 1;
    // Under standard draft, teams recycle comfort picks — slight adaptation drift only
    const stdWin = round1(clamp(stdSingleGameWin + (gIdx % 2 === 0 ? 1.1 : -0.9), 22, 82));

    // Under Fearless Pool-Squeeze, each game's cumulative collapse expands Cloud9's draft edge
    const criticalInGame = matrix.rows.filter((r) => r.cells[gIdx].severity >= COLLAPSE_SEVERITY.CRITICAL_SQUEEZE).length;
    const squeezedInGame = matrix.rows.filter((r) => r.cells[gIdx].severity >= COLLAPSE_SEVERITY.SQUEEZED).length;
    const avgAdvDelta =
      matrix.rows.reduce((s, r) => s + r.cells[gIdx].advantageDelta, 0) / ROLES.length;

    const fearlessProgression =
      gIdx * 1.85 +
      criticalInGame * 2.1 +
      squeezedInGame * 0.75 +
      Math.max(0, avgAdvDelta) * 1.15 +
      banCfg.edgeBonus * (0.45 + gIdx * 0.18) +
      (normOpts.voidgrubPriority ? 2.4 : 0.3) +
      squeezePressureBoost;

    const fearlessWin = round1(clamp(stdSingleGameWin + fearlessProgression, 24, 91));
    return {
      gameNumber,
      label: `G${gameNumber}`,
      standardWinPct: stdWin,
      fearlessWinPct: fearlessWin,
      deltaPct: round1(fearlessWin - stdWin),
      criticalRolesCount: criticalInGame
    };
  });

  // Late-series draft advantage (G4-G5 average for BO5, G3 decider for BO3)
  const lateSlice = maxGames === 5 ? perGameWinCurve.slice(3) : perGameWinCurve.slice(2);
  const lateSeriesLabel = maxGames === 5 ? 'G4–G5 Deciders' : 'G3 Decider';

  const stdLateAdvantage = round1(
    lateSlice.reduce((s, g) => s + (g.standardWinPct - 50), 0) / Math.max(1, lateSlice.length)
  );
  const fearlessLateAdvantage = round1(
    lateSlice.reduce((s, g) => s + (g.fearlessWinPct - 50), 0) / Math.max(1, lateSlice.length)
  );

  // Series Win% from weighted per-game trajectory (exact binomial series probability using average p)
  const avgStdP = perGameWinCurve.reduce((s, g) => s + g.standardWinPct, 0) / (maxGames * 100);
  const avgFearlessP = perGameWinCurve.reduce((s, g) => s + g.fearlessWinPct, 0) / (maxGames * 100);

  const seriesWinFromP = (p, bestOf) => {
    if (bestOf === 3) {
      // P(win BO3) = p^2 * (3 - 2p)
      return p * p * (3 - 2 * p);
    }
    // P(win BO5) = p^3 * (10 - 15p + 6p^2)
    return p * p * p * (10 - 15 * p + 6 * p * p);
  };

  const standardSeriesWinPct = round1(clamp(seriesWinFromP(avgStdP, maxGames) * 100, 15, 90));
  const fearlessSeriesWinPct = round1(
    clamp(
      Math.max(standardSeriesWinPct + 1.5, seriesWinFromP(avgFearlessP, maxGames) * 100 + Math.max(0, finalDepthDelta * 0.45)),
      18,
      94
    )
  );

  const comparison = {
    lateSeriesLabel,
    standard: {
      planName: 'Unconstrained Standard Draft',
      seriesWinProbPct: standardSeriesWinPct,
      lateSeriesAdvantagePct: stdLateAdvantage,
      projectedGoldAt15: standardGold15,
      voidgrubsSynergyPct: standardGrubsPct,
      oppComfortAttritionPct: oppComfortAttritionStd
    },
    fearless: {
      planName: 'Fearless Pool-Squeeze Plan',
      seriesWinProbPct: fearlessSeriesWinPct,
      lateSeriesAdvantagePct: fearlessLateAdvantage,
      projectedGoldAt15: fearlessGold15,
      voidgrubsSynergyPct: fearlessGrubsPct,
      oppComfortAttritionPct: oppComfortAttritionFearless
    },
    delta: {
      seriesWinProbPct: round1(fearlessSeriesWinPct - standardSeriesWinPct),
      lateSeriesAdvantagePct: round1(fearlessLateAdvantage - stdLateAdvantage),
      projectedGoldAt15: fearlessGold15 - standardGold15,
      voidgrubsSynergyPct: fearlessGrubsPct - standardGrubsPct,
      oppComfortAttritionPct: oppComfortAttritionFearless - oppComfortAttritionStd
    }
  };

  const fc = matrix.summary.firstCollapse;
  const pinchRow = matrix.rows.find((r) => r.role === normOpts.effectivePinchRole);
  const winConditionBrief = [
    fc
      ? `Primary Squeeze Breakpoint: ${fc.playerName} (${fc.role}) hits ${fc.collapseLabel} in Game ${fc.gameNumber} — force extended series trades into ${lateSeriesLabel} where Cloud9 gains ${comparison.delta.lateSeriesAdvantagePct >= 0 ? '+' : ''}${comparison.delta.lateSeriesAdvantagePct}% draft edge.`
      : `Sustain ${banCfg.label} ban-wave pressure on ${pinchRow?.oppPlayerName || normOpts.effectivePinchRole} (${normOpts.effectivePinchRole}) to erode opponent comfort depth across ${matrix.format}.`,
    normOpts.voidgrubPriority
      ? `Voidgrub Tempo Active: prioritize top/mid wave prio before 6:00 spawn (${fearlessGrubsPct}% projected Grub share, ${fearlessGold15 >= 0 ? '+' : ''}${fearlessGold15}g @ 15) while countering opponent ${primaryGankLane}-lane first ganks.`
      : `Dragon/Scaling Trade Posture: concede contested Voidgrub timers (${fearlessGrubsPct}% share) in exchange for ${normOpts.effectivePinchRole}-role pool starvation (${oppComfortAttritionFearless}% opponent comfort attrition).`,
    `Series Win-Condition Delta: Fearless Pool-Squeeze lifts ${series?.blueTeam || 'Cloud9'} ${matrix.format} series win equity from ${standardSeriesWinPct}% to ${fearlessSeriesWinPct}% (+${comparison.delta.seriesWinProbPct}%).`
  ];

  return {
    options: normOpts,
    matrix,
    comparison,
    perGameWinCurve,
    winConditionBrief
  };
}
