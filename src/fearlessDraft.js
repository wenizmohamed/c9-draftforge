/**
 * Official 2025/2026 Fearless Draft BO3 / BO5 State Engine for C9 DraftForge.
 *
 * Implements the 20-step LCS tournament draft order (10 bans + 10 picks per game),
 * hard cross-game Fearless lockouts (any champion picked by EITHER team in prior
 * games is stamped LOCKED G1/G2/... and cannot be picked or banned in later games),
 * live composition synergy & AP/AD damage split analysis, and counter-pick / pool
 * squeeze recommendations.
 */

import { CHAMPIONS, CHAMPION_BY_ID, ROLES } from './champions.js';

export const DRAFT_SEQUENCE = [
  // Ban Phase 1
  { index: 0, phase: 'BAN_1', side: 'blue', type: 'ban', slot: 0, label: 'Blue Ban 1' },
  { index: 1, phase: 'BAN_1', side: 'red', type: 'ban', slot: 0, label: 'Red Ban 1' },
  { index: 2, phase: 'BAN_1', side: 'blue', type: 'ban', slot: 1, label: 'Blue Ban 2' },
  { index: 3, phase: 'BAN_1', side: 'red', type: 'ban', slot: 1, label: 'Red Ban 2' },
  { index: 4, phase: 'BAN_1', side: 'blue', type: 'ban', slot: 2, label: 'Blue Ban 3' },
  { index: 5, phase: 'BAN_1', side: 'red', type: 'ban', slot: 2, label: 'Red Ban 3' },
  // Pick Phase 1
  { index: 6, phase: 'PICK_1', side: 'blue', type: 'pick', slot: 0, label: 'B1 Pick' },
  { index: 7, phase: 'PICK_1', side: 'red', type: 'pick', slot: 0, label: 'R1 Pick' },
  { index: 8, phase: 'PICK_1', side: 'red', type: 'pick', slot: 1, label: 'R2 Pick' },
  { index: 9, phase: 'PICK_1', side: 'blue', type: 'pick', slot: 1, label: 'B2 Pick' },
  { index: 10, phase: 'PICK_1', side: 'blue', type: 'pick', slot: 2, label: 'B3 Pick' },
  { index: 11, phase: 'PICK_1', side: 'red', type: 'pick', slot: 2, label: 'R3 Pick' },
  // Ban Phase 2
  { index: 12, phase: 'BAN_2', side: 'red', type: 'ban', slot: 3, label: 'Red Ban 4' },
  { index: 13, phase: 'BAN_2', side: 'blue', type: 'ban', slot: 3, label: 'Blue Ban 4' },
  { index: 14, phase: 'BAN_2', side: 'red', type: 'ban', slot: 4, label: 'Red Ban 5' },
  { index: 15, phase: 'BAN_2', side: 'blue', type: 'ban', slot: 4, label: 'Blue Ban 5' },
  // Pick Phase 2
  { index: 16, phase: 'PICK_2', side: 'red', type: 'pick', slot: 3, label: 'R4 Pick' },
  { index: 17, phase: 'PICK_2', side: 'blue', type: 'pick', slot: 3, label: 'B4 Pick' },
  { index: 18, phase: 'PICK_2', side: 'blue', type: 'pick', slot: 4, label: 'B5 Pick' },
  { index: 19, phase: 'PICK_2', side: 'red', type: 'pick', slot: 4, label: 'R5 Pick' }
];

function createEmptyGame(gameNumber) {
  return {
    gameNumber,
    blueBans: [null, null, null, null, null],
    redBans: [null, null, null, null, null],
    bluePicks: [null, null, null, null, null],
    redPicks: [null, null, null, null, null],
    stepIndex: 0,
    history: [],
    completed: false
  };
}

/**
 * Create a new Fearless Draft series state (BO3 or BO5).
 */
export function createFearlessSeries({
  format = 'BO5',
  blueTeam = 'Cloud9',
  redTeam = 'Team Liquid'
} = {}) {
  const maxGames = format === 'BO3' ? 3 : 5;
  const games = Array.from({ length: maxGames }, (_, idx) => createEmptyGame(idx + 1));
  return {
    format: maxGames === 3 ? 'BO3' : 'BO5',
    maxGames,
    blueTeam,
    redTeam,
    currentGameIndex: 0,
    games
  };
}

/**
 * Compute all Fearless-locked champions for a target game index.
 * Under official 2025/2026 Fearless Draft rules, EVERY champion picked by EITHER
 * team in any prior game (0 .. gameIndex - 1) is hard-locked.
 *
 * @returns {Map<string, { gameNumber: number, side: 'blue'|'red', team: string, stamp: string }>}
 */
export function getFearlessLockouts(series, gameIndex = series.currentGameIndex) {
  const lockouts = new Map();
  for (let i = 0; i < gameIndex; i++) {
    const g = series.games[i];
    if (!g) continue;
    for (const champId of g.bluePicks) {
      if (champId && !lockouts.has(champId)) {
        lockouts.set(champId, {
          gameNumber: g.gameNumber,
          side: 'blue',
          team: series.blueTeam,
          stamp: `LOCKED G${g.gameNumber}`
        });
      }
    }
    for (const champId of g.redPicks) {
      if (champId && !lockouts.has(champId)) {
        lockouts.set(champId, {
          gameNumber: g.gameNumber,
          side: 'red',
          team: series.redTeam,
          stamp: `LOCKED G${g.gameNumber}`
        });
      }
    }
  }
  return lockouts;
}

/**
 * Get champions already banned or picked inside the active game.
 */
export function getCurrentGameUsedSet(game) {
  const used = new Set();
  for (const id of [...game.blueBans, ...game.redBans, ...game.bluePicks, ...game.redPicks]) {
    if (id) used.add(id);
  }
  return used;
}

export function getActiveStep(series) {
  const game = series.games[series.currentGameIndex];
  if (!game || game.stepIndex >= DRAFT_SEQUENCE.length) return null;
  return DRAFT_SEQUENCE[game.stepIndex];
}

/**
 * Apply a pick or ban for the current step of the active game.
 * Returns a fresh state object (immutable-friendly) or throws on invalid/locked champion.
 */
export function applyDraftAction(series, championId) {
  if (!CHAMPION_BY_ID[championId]) {
    throw new Error(`Unknown champion ID: ${championId}`);
  }
  const game = series.games[series.currentGameIndex];
  if (!game) throw new Error('Invalid game index');
  if (game.stepIndex >= DRAFT_SEQUENCE.length) {
    throw new Error(`Game ${game.gameNumber} draft is already complete`);
  }

  const lockouts = getFearlessLockouts(series, series.currentGameIndex);
  if (lockouts.has(championId)) {
    const info = lockouts.get(championId);
    throw new Error(`${CHAMPION_BY_ID[championId].name} is Fearless-${info.stamp} (picked by ${info.team})`);
  }

  const used = getCurrentGameUsedSet(game);
  if (used.has(championId)) {
    throw new Error(`${CHAMPION_BY_ID[championId].name} is already drafted or banned in Game ${game.gameNumber}`);
  }

  const step = DRAFT_SEQUENCE[game.stepIndex];
  const nextGame = {
    ...game,
    blueBans: [...game.blueBans],
    redBans: [...game.redBans],
    bluePicks: [...game.bluePicks],
    redPicks: [...game.redPicks],
    history: [...game.history, { ...step, championId }],
    stepIndex: game.stepIndex + 1,
    completed: game.stepIndex + 1 >= DRAFT_SEQUENCE.length
  };

  if (step.type === 'ban') {
    if (step.side === 'blue') nextGame.blueBans[step.slot] = championId;
    else nextGame.redBans[step.slot] = championId;
  } else {
    if (step.side === 'blue') nextGame.bluePicks[step.slot] = championId;
    else nextGame.redPicks[step.slot] = championId;
  }

  const nextGames = series.games.map((g, idx) => (idx === series.currentGameIndex ? nextGame : g));
  return { ...series, games: nextGames };
}

/**
 * Undo the most recent pick or ban in the current game.
 */
export function undoLastAction(series) {
  const game = series.games[series.currentGameIndex];
  if (!game || game.history.length === 0) return series;

  const last = game.history[game.history.length - 1];
  const nextGame = {
    ...game,
    blueBans: [...game.blueBans],
    redBans: [...game.redBans],
    bluePicks: [...game.bluePicks],
    redPicks: [...game.redPicks],
    history: game.history.slice(0, -1),
    stepIndex: game.stepIndex - 1,
    completed: false
  };

  if (last.type === 'ban') {
    if (last.side === 'blue') nextGame.blueBans[last.slot] = null;
    else nextGame.redBans[last.slot] = null;
  } else {
    if (last.side === 'blue') nextGame.bluePicks[last.slot] = null;
    else nextGame.redPicks[last.slot] = null;
  }

  const nextGames = series.games.map((g, idx) => (idx === series.currentGameIndex ? nextGame : g));
  return { ...series, games: nextGames };
}

/**
 * Advance to the next game in the BO3/BO5 series.
 * All champions picked in the current game immediately become Fearless-locked in the next game.
 */
export function advanceToNextGame(series) {
  if (series.currentGameIndex >= series.maxGames - 1) {
    return series;
  }
  return {
    ...series,
    currentGameIndex: series.currentGameIndex + 1
  };
}

/**
 * Jump to a specific game index (0 .. maxGames - 1).
 */
export function selectGame(series, gameIndex) {
  if (gameIndex < 0 || gameIndex >= series.maxGames) return series;
  return { ...series, currentGameIndex: gameIndex };
}

/**
 * Reset the entire series back to Game 1 empty state.
 */
export function resetSeries(series) {
  return createFearlessSeries({
    format: series.format,
    blueTeam: series.blueTeam,
    redTeam: series.redTeam
  });
}

/**
 * Analyze a team's drafted composition: AP/AD damage split, dominant synergy tags,
 * internal synergy pairs, role coverage, and tactical draft warnings.
 */
export function analyzeComposition(pickIds) {
  const champs = pickIds.filter(Boolean).map((id) => CHAMPION_BY_ID[id]).filter(Boolean);
  if (champs.length === 0) {
    return {
      count: 0,
      apPct: 0,
      adPct: 0,
      mixedPct: 0,
      tags: [],
      primaryStyle: 'Awaiting Picks',
      synergyPairs: [],
      warnings: [],
      draftScore: 0
    };
  }

  let apWeight = 0;
  let adWeight = 0;
  let mixedWeight = 0;
  const tagCounts = new Map();

  for (const champ of champs) {
    if (champ.damageType === 'AP') apWeight += 1;
    else if (champ.damageType === 'AD') adWeight += 1;
    else {
      mixedWeight += 1;
      apWeight += 0.5;
      adWeight += 0.5;
    }
    for (const tag of champ.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }

  const total = champs.length;
  const apPct = Math.round((apWeight / total) * 100);
  const adPct = Math.max(0, 100 - apPct);
  const mixedPct = Math.round((mixedWeight / total) * 100);

  const sortedTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag, count]) => ({ tag, count }));

  const synergyPairs = [];
  for (let i = 0; i < champs.length; i++) {
    for (let j = i + 1; j < champs.length; j++) {
      const a = champs[i];
      const b = champs[j];
      if (a.synergies.includes(b.id) || b.synergies.includes(a.id)) {
        synergyPairs.push(`${a.name} + ${b.name}`);
      }
    }
  }

  const warnings = [];
  if (champs.length >= 3 && apPct >= 80) warnings.push('Heavy AP profile — vulnerable to Force of Nature / Maw');
  if (champs.length >= 3 && adPct >= 80) warnings.push('Heavy AD profile — vulnerable to Steelcaps / Frozen Heart');
  if (champs.length >= 4 && !tagCounts.has('Engage')) warnings.push('No hard engage tool — relies on poke/counter-engage');

  const baseScore = 62 + Math.min(20, synergyPairs.length * 6);
  const balanceBonus = champs.length >= 3 && apPct >= 25 && apPct <= 75 ? 10 : 0;
  const styleBonus = sortedTags[0] && sortedTags[0].count >= 3 ? 8 : 3;
  const draftScore = Math.min(99, baseScore + balanceBonus + styleBonus - warnings.length * 5);

  return {
    count: champs.length,
    apPct,
    adPct,
    mixedPct,
    tags: sortedTags.slice(0, 4),
    primaryStyle: sortedTags[0] ? sortedTags[0].tag : 'Balanced',
    synergyPairs,
    warnings,
    draftScore
  };
}

/**
 * Determine which roles a team still needs to fill based on greedy role assignment.
 */
export function getOpenRoles(pickIds) {
  const filled = new Set();
  const champs = pickIds.filter(Boolean).map((id) => CHAMPION_BY_ID[id]).filter(Boolean);
  for (const c of champs) {
    const firstUnfilled = c.roles.find((r) => !filled.has(r));
    if (firstUnfilled) filled.add(firstUnfilled);
  }
  return ROLES.filter((r) => !filled.has(r));
}

/**
 * Recommend top Counter-Pick & Pool-Squeeze actions for the current active draft step.
 */
export function recommendDraftActions(series, roleFilter = 'ALL', opponentSignatureIds = []) {
  const game = series.games[series.currentGameIndex];
  const step = getActiveStep(series);
  if (!game || !step) return [];

  const lockouts = getFearlessLockouts(series, series.currentGameIndex);
  const used = getCurrentGameUsedSet(game);

  const allyPicks = (step.side === 'blue' ? game.bluePicks : game.redPicks).filter(Boolean);
  const enemyPicks = (step.side === 'blue' ? game.redPicks : game.bluePicks).filter(Boolean);
  const openRoles = getOpenRoles(allyPicks);
  const allyComp = analyzeComposition(allyPicks);
  const sigSet = new Set(opponentSignatureIds);

  const candidates = CHAMPIONS.filter((c) => {
    if (lockouts.has(c.id) || used.has(c.id)) return false;
    if (roleFilter && roleFilter !== 'ALL' && !c.roles.includes(roleFilter)) return false;
    return true;
  });

  const scored = candidates.map((champ) => {
    let score = champ.tier === 'S' ? 58 : 48;
    const reasons = [];

    if (step.type === 'ban') {
      // High priority ban if opponent signature or counters our drafted picks
      if (sigSet.has(champ.id)) {
        score += 24;
        reasons.push('Opponent signature pool');
      }
      const countersAlly = allyPicks.filter((aid) => champ.counters.includes(aid));
      if (countersAlly.length > 0) {
        score += countersAlly.length * 14;
        reasons.push(`Counters ${countersAlly.map((id) => CHAMPION_BY_ID[id].name).join(', ')}`);
      }
      const enemySyn = enemyPicks.filter((eid) => champ.synergies.includes(eid));
      if (enemySyn.length > 0) {
        score += enemySyn.length * 10;
        reasons.push(`Breaks enemy ${CHAMPION_BY_ID[enemySyn[0]].name} combo`);
      }
      if (reasons.length === 0) {
        reasons.push(`Tier ${champ.tier} pro flex (${champ.pickRate}% presence)`);
      }
    } else {
      // Pick recommendation: counter enemy + fit ally synergy + balance damage + open role
      const fillsOpen = champ.roles.some((r) => openRoles.includes(r));
      if (fillsOpen) {
        score += 12;
      } else {
        score -= 22;
      }

      const countersEnemy = enemyPicks.filter((eid) => champ.counters.includes(eid));
      if (countersEnemy.length > 0) {
        score += countersEnemy.length * 15;
        reasons.push(`Counters ${countersEnemy.map((id) => CHAMPION_BY_ID[id].name).join(', ')}`);
      }

      const synAllies = allyPicks.filter((aid) => champ.synergies.includes(aid));
      if (synAllies.length > 0) {
        score += synAllies.length * 11;
        reasons.push(`Synergy w/ ${synAllies.map((id) => CHAMPION_BY_ID[id].name).join(', ')}`);
      }

      // Damage balancing
      if (allyComp.count >= 2 && allyComp.apPct >= 70 && champ.damageType === 'AD') {
        score += 9;
        reasons.push('Balances heavy AP comp');
      } else if (allyComp.count >= 2 && allyComp.adPct >= 70 && champ.damageType === 'AP') {
        score += 9;
        reasons.push('Balances heavy AD comp');
      }

      // Fearless pinch value: picking an opponent signature denies it for rest of series!
      if (sigSet.has(champ.id)) {
        score += 10;
        reasons.push('Fearless denial vs enemy pool');
      }

      if (reasons.length === 0) {
        reasons.push(`${champ.tags[0]} anchor · Tier ${champ.tier}`);
      }
    }

    return {
      champion: champ,
      actionType: step.type,
      score: Math.min(99, Math.round(score)),
      reason: reasons.slice(0, 2).join(' · ')
    };
  });

  return scored
    .sort((a, b) => b.score - a.score || b.champion.pickRate - a.champion.pickRate)
    .slice(0, 5);
}

/**
 * Rapidly simulate/auto-fill remaining steps of the active game with top tactical picks.
 */
export function autoFillCurrentGame(series, opponentSignatureIds = []) {
  let state = series;
  let guard = 0;
  while (getActiveStep(state) && guard < 25) {
    const recs = recommendDraftActions(state, 'ALL', opponentSignatureIds);
    if (recs.length === 0) break;
    state = applyDraftAction(state, recs[0].champion.id);
    guard++;
  }
  return state;
}
