import { CHAMPIONS, CHAMPION_BY_ID, ROLES } from './champions.js';
import { getFearlessLockouts, getCurrentGameUsedSet } from './fearlessDraft.js';

/**
 * Score depletion of scouted comfort picks and role-meta alternatives.
 * Comfort depletion contributes up to 65, shallow pools 15, and meta depletion 15.
 */
function pressureScore(knownCount, remainingCount, metaCount, metaRemaining) {
  const comfortDepletion = knownCount ? (knownCount - remainingCount) / knownCount : 0;
  const shallowPool = knownCount ? Math.max(0, 4 - knownCount) * 5 : 0;
  const metaDepletion = metaCount ? (metaCount - metaRemaining) / metaCount : 0;
  return Math.max(0, Math.min(100, Math.round(65 * comfortDepletion + shallowPool + 15 * metaDepletion)));
}

/**
 * Analyze scouted opponent pools against the current Fearless draft state.
 * @param {{series: ReturnType<typeof import('./fearlessDraft.js').createFearlessSeries>, macroReport?: {opponentPoolProfiles?: Array<{name: string, role: string, uniqueChampions: string[]}>}, activeSide?: 'blue'|'red'}} options
 */
export function analyzeFearlessSqueeze({ series, macroReport, activeSide = 'blue' }) {
  const lockouts = getFearlessLockouts(series, series.currentGameIndex);
  const used = getCurrentGameUsedSet(series.games[series.currentGameIndex]);
  const unavailable = new Set([...lockouts.keys(), ...used]);
  const profiles = Array.isArray(macroReport?.opponentPoolProfiles) ? macroReport.opponentPoolProfiles : [];

  const rolePressures = ROLES.map((role) => {
    const profile = profiles.find((p) => p?.role === role);
    const knownPool = Array.isArray(profile?.uniqueChampions)
      ? [...new Set(profile.uniqueChampions.filter((id) => typeof id === 'string' && id))]
      : [];
    const lockedOutPool = knownPool.filter((id) => unavailable.has(id));
    const remainingComfortIds = knownPool.filter((id) => !unavailable.has(id));
    const metaPool = CHAMPIONS.filter((champion) => champion.roles.includes(role));
    const metaPoolRemaining = metaPool.filter((champion) => !unavailable.has(champion.id)).length;
    const squeezeIndex = pressureScore(knownPool.length, remainingComfortIds.length, metaPool.length, metaPoolRemaining);
    const pressureLevel = squeezeIndex >= 78 ? 'CRITICAL' : squeezeIndex >= 60 ? 'HIGH' : squeezeIndex >= 40 ? 'MODERATE' : 'LOW';
    const playerName = profile?.name || `Opponent ${role}`;
    const recommendedAction = !knownPool.length
      ? `Scout ${playerName}'s ${role} champion pool before targeting bans.`
      : remainingComfortIds.length
        ? `Target ${playerName}'s remaining ${role} comfort picks.`
        : `${playerName} has no scouted comfort picks available; pressure the ${role} meta pool.`;
    return {
      role, playerName, knownPool, lockedOutPool, remainingComfortIds,
      remainingComfortCount: remainingComfortIds.length,
      metaPoolRemaining, squeezeIndex, pressureLevel, recommendedAction
    };
  });

  const candidates = new Map();
  for (const pressure of rolePressures) {
    const metaCount = CHAMPIONS.filter((champion) => champion.roles.includes(pressure.role)).length;
    for (const id of pressure.remainingComfortIds) {
      if (!Object.hasOwn(CHAMPION_BY_ID, id)) continue;
      const champion = CHAMPION_BY_ID[id];
      const prospectiveMeta = pressure.metaPoolRemaining - (champion.roles.includes(pressure.role) ? 1 : 0);
      const squeezeScore = pressureScore(pressure.knownPool.length, pressure.remainingComfortCount - 1, metaCount, prospectiveMeta);
      const candidate = {
        championId: id,
        championName: champion.name,
        role: pressure.role,
        targetPlayer: pressure.playerName,
        squeezeScore,
        rationale: `Deny ${pressure.playerName}'s ${champion.name}; ${pressure.remainingComfortCount - 1} scouted ${pressure.role} comfort picks would remain.`
      };
      if (!candidates.has(id) || candidates.get(id).squeezeScore < squeezeScore) candidates.set(id, candidate);
    }
  }

  const targetBans = [...candidates.values()]
    .sort((a, b) => b.squeezeScore - a.squeezeScore || CHAMPION_BY_ID[b.championId].pickRate - CHAMPION_BY_ID[a.championId].pickRate || a.championId.localeCompare(b.championId))
    .slice(0, 3);
  const highest = rolePressures.reduce((best, pressure) => pressure.squeezeIndex > best.squeezeIndex ? pressure : best);
  return {
    rolePressures,
    targetBans,
    summary: {
      highestPressureRole: highest.role,
      highestPressurePlayer: highest.playerName,
      totalLockedChampions: lockouts.size,
      remainingSeriesGames: series.maxGames - series.currentGameIndex,
      coachDirective: `${activeSide === 'red' ? 'Red' : 'Blue'} side: ${highest.recommendedAction}`
    }
  };
}