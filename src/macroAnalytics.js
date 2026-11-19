/**
 * Deterministic LoL Macro Scouting Analytics & Coach Dossier Exporter.
 *
 * Computes:
 *  - Gold@15 delta (avg, per-game, Blue vs Red split)
 *  - Objective control % (Voidgrubs, Rift Herald, First Dragon, First Tower, Baron)
 *  - Official Riot Summoner's Rift (0..14870) coordinate projection & jungle proximity
 *  - First-gank lane distribution (%)
 *  - Opponent player champion pool depth & Fearless fatigue score
 *  - 1-click Coach Draft & Macro Dossier Export (.md & .json)
 */

import { CHAMPION_BY_ID } from './champions.js';

export const RIFT_MAX_COORD = 14870;

/**
 * Project official Riot Summoner's Rift world coordinates (0..14870, bottom-left origin)
 * to CSS percentage coordinates (top-left origin) on official map11.png.
 */
export function projectRiftCoord(x, y) {
  const clampedX = Math.max(0, Math.min(RIFT_MAX_COORD, Number(x) || 0));
  const clampedY = Math.max(0, Math.min(RIFT_MAX_COORD, Number(y) || 0));
  return {
    leftPct: Number(((clampedX / RIFT_MAX_COORD) * 100).toFixed(2)),
    topPct: Number(((1 - clampedY / RIFT_MAX_COORD) * 100).toFixed(2))
  };
}

/**
 * Compute full macro scouting report from a normalized GRID LoL series.
 */
export function analyzeMacroSeries(parsedSeries) {
  const games = parsedSeries.games || [];
  const gameCount = games.length || 1;

  // 1. Gold@15 metrics
  const goldSeries = games.map((g) => ({
    game: g.sequenceNumber,
    delta: g.goldDeltaAt15,
    focusGold15: g.focusGold15,
    opponentGold15: g.opponentGold15,
    side: g.focusSide,
    won: g.focusWon
  }));

  const avgGoldDelta15 = Math.round(
    games.reduce((sum, g) => sum + g.goldDeltaAt15, 0) / gameCount
  );

  // 2. Objective Control %
  const totalGrubsFocus = games.reduce((s, g) => s + g.focusObjectives.voidgrubs, 0);
  const totalGrubsOpp = games.reduce((s, g) => s + g.opponentObjectives.voidgrubs, 0);
  const grubDenom = Math.max(1, totalGrubsFocus + totalGrubsOpp);

  const totalHeraldFocus = games.reduce((s, g) => s + g.focusObjectives.riftHerald, 0);
  const totalHeraldOpp = games.reduce((s, g) => s + g.opponentObjectives.riftHerald, 0);
  const heraldDenom = Math.max(1, totalHeraldFocus + totalHeraldOpp);

  const firstDragonCount = games.filter((g) => g.focusObjectives.firstDragon).length;
  const firstTowerCount = games.filter((g) => g.focusObjectives.firstTower).length;

  const totalBaronFocus = games.reduce((s, g) => s + g.focusObjectives.barons, 0);
  const totalBaronOpp = games.reduce((s, g) => s + g.opponentObjectives.barons, 0);
  const baronDenom = Math.max(1, totalBaronFocus + totalBaronOpp);

  const objectiveControl = {
    voidgrubsPct: Math.round((totalGrubsFocus / grubDenom) * 100),
    riftHeraldPct: Math.round((totalHeraldFocus / heraldDenom) * 100),
    firstDragonPct: Math.round((firstDragonCount / gameCount) * 100),
    firstTowerPct: Math.round((firstTowerCount / gameCount) * 100),
    baronPct: Math.round((totalBaronFocus / baronDenom) * 100),
    raw: {
      totalGrubsFocus,
      totalGrubsOpp,
      totalHeraldFocus,
      totalHeraldOpp,
      firstDragonCount,
      firstTowerCount,
      totalBaronFocus,
      totalBaronOpp
    }
  };

  // 3. Opponent Jungle Proximity & First-Gank Lane Distribution
  const oppId = parsedSeries.opponentTeam.id;
  const allEvents = games.flatMap((g) =>
    (g.earlyEvents || []).map((ev) => ({
      ...ev,
      gameNumber: g.sequenceNumber,
      isOpponent: ev.teamId === oppId,
      projected: projectRiftCoord(ev.x, ev.y)
    }))
  );

  const oppGanks = allEvents.filter((e) => e.isOpponent && e.type === 'FIRST_GANK');
  const oppProximity = allEvents.filter((e) => e.isOpponent);
  const gankCounts = { TOP: 0, MID: 0, BOT: 0 };
  for (const g of oppGanks) {
    if (gankCounts[g.lane] !== undefined) gankCounts[g.lane]++;
  }
  const gankTotal = Math.max(1, oppGanks.length);
  const firstGankDistribution = {
    TOP: Math.round((gankCounts.TOP / gankTotal) * 100),
    MID: Math.round((gankCounts.MID / gankTotal) * 100),
    BOT: Math.round((gankCounts.BOT / gankTotal) * 100),
    sampleSize: oppGanks.length,
    primaryLane: Object.entries(gankCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'MID'
  };

  const proxCounts = { TOP: 0, MID: 0, BOT: 0 };
  for (const e of oppProximity) {
    if (proxCounts[e.lane] !== undefined) proxCounts[e.lane]++;
  }
  const proxTotal = Math.max(1, oppProximity.length);
  const jungleProximity = {
    TOP: Math.round((proxCounts.TOP / proxTotal) * 100),
    MID: Math.round((proxCounts.MID / proxTotal) * 100),
    BOT: Math.round((proxCounts.BOT / proxTotal) * 100)
  };

  // 4. Opponent Player Champion Pool Depth & Fearless Fatigue
  const playerMap = new Map();
  for (const g of games) {
    for (const p of g.opponentPlayers) {
      const key = `${p.role}:${p.name}`;
      if (!playerMap.has(key)) {
        playerMap.set(key, {
          name: p.name,
          role: p.role,
          championsPlayed: [],
          champCounts: new Map(),
          kills: 0,
          deaths: 0,
          assists: 0,
          cs15Total: 0,
          games: 0
        });
      }
      const entry = playerMap.get(key);
      entry.championsPlayed.push(p.championId);
      entry.champCounts.set(p.championId, (entry.champCounts.get(p.championId) || 0) + 1);
      entry.kills += Number(p.kills || 0);
      entry.deaths += Number(p.deaths || 0);
      entry.assists += Number(p.assists || 0);
      entry.cs15Total += Number(p.csAt15 || 0);
      entry.games += 1;
    }
  }

  const opponentPoolProfiles = [...playerMap.values()].map((p) => {
    const uniqueChamps = [...p.champCounts.keys()];
    const repeatCount = p.games - uniqueChamps.length;
    // Lower unique-to-games ratio + role choke points = higher Fearless fatigue risk
    const diversityRatio = uniqueChamps.length / Math.max(1, p.games);
    const kda = Number(((p.kills + p.assists) / Math.max(1, p.deaths)).toFixed(2));
    const avgCs15 = Math.round(p.cs15Total / Math.max(1, p.games));
    const fearlessFatigueScore = Math.min(
      96,
      Math.max(24, Math.round(54 + repeatCount * 22 + (1 - diversityRatio) * 28 + (p.role === 'MID' || p.role === 'JGL' ? 6 : 0)))
    );
    const riskLevel =
      fearlessFatigueScore >= 75 ? 'HIGH' : fearlessFatigueScore >= 55 ? 'MEDIUM' : 'LOW';

    return {
      name: p.name,
      role: p.role,
      games: p.games,
      uniqueChampions: uniqueChamps,
      uniqueCount: uniqueChamps.length,
      kda,
      avgCs15,
      fearlessFatigueScore,
      riskLevel
    };
  });

  const opponentSignatureIds = [
    ...new Set(opponentPoolProfiles.flatMap((p) => p.uniqueChampions))
  ].filter((id) => Boolean(CHAMPION_BY_ID[id]));

  // 5. Key Macro Action Callouts
  const callouts = [];
  if (firstGankDistribution.primaryLane === 'BOT') {
    callouts.push(`Opponent jungle prioritizes BOT lane (${firstGankDistribution.BOT}% first ganks) — ward tribrush @ 3:05 and trade Voidgrubs cross-map.`);
  } else if (firstGankDistribution.primaryLane === 'TOP') {
    callouts.push(`Opponent jungle plays heavily through TOP (${firstGankDistribution.TOP}% first ganks) — track lv3 top brush and punish bot Dragon timer.`);
  } else {
    callouts.push(`Opponent jungle anchors MID lane (${firstGankDistribution.MID}% first ganks) — protect mid river control before 6:00 Voidgrub spawn.`);
  }

  if (objectiveControl.voidgrubsPct >= 55) {
    callouts.push(`Cloud9 holds a commanding ${objectiveControl.voidgrubsPct}% Voidgrubs share — lean into side-lane push & 1-3-1 siege drafts.`);
  } else {
    callouts.push(`Opponent controls ${100 - objectiveControl.voidgrubsPct}% of Voidgrubs — prioritize priority top/mid lanes in Ban/Pick Phase 1.`);
  }

  const mostFatigued = [...opponentPoolProfiles].sort(
    (a, b) => b.fearlessFatigueScore - a.fearlessFatigueScore
  )[0];
  if (mostFatigued) {
    callouts.push(
      `Primary Fearless squeeze target: ${mostFatigued.name} (${mostFatigued.role}) — fatigue score ${mostFatigued.fearlessFatigueScore}/100 across ${mostFatigued.uniqueCount} unique pick(s).`
    );
  }

  return {
    seriesId: parsedSeries.seriesId,
    focusTeam: parsedSeries.focusTeam,
    opponentTeam: parsedSeries.opponentTeam,
    gameCount: games.length,
    avgGoldDelta15,
    goldSeries,
    objectiveControl,
    firstGankDistribution,
    jungleProximity,
    mapEvents: allEvents,
    opponentPoolProfiles,
    opponentSignatureIds,
    callouts
  };
}

/**
 * Generate a 1-click Coach Draft & Macro Dossier in Markdown format.
 */
export function generateDossierMarkdown({ series, macroReport, squeezeReport = null }) {
  const activeGame = series.games[series.currentGameIndex];
  const lines = [
    `# C9 DraftForge — Coach Draft & Macro Dossier`,
    ``,
    `- **Matchup:** ${macroReport.focusTeam.name} (${macroReport.focusTeam.tag}) vs ${macroReport.opponentTeam.name} (${macroReport.opponentTeam.tag})`,
    `- **GRID Series ID:** \`${macroReport.seriesId}\``,
    `- **Series Format:** ${series.format} Fearless Draft (Active: Game ${activeGame.gameNumber})`,
    `- **Generated:** ${new Date().toISOString()}`,
    ``,
    `## 1. Early-Game Macro Snapshot (GRID LoL Telemetry)`,
    `- **Avg Gold@15 Delta (${macroReport.focusTeam.tag}):** ${macroReport.avgGoldDelta15 >= 0 ? '+' : ''}${macroReport.avgGoldDelta15}g`,
    `- **Voidgrubs Control:** ${macroReport.objectiveControl.voidgrubsPct}%`,
    `- **Rift Herald Control:** ${macroReport.objectiveControl.riftHeraldPct}%`,
    `- **First Dragon Control:** ${macroReport.objectiveControl.firstDragonPct}%`,
    `- **First Tower Control:** ${macroReport.objectiveControl.firstTowerPct}%`,
    `- **Baron Control:** ${macroReport.objectiveControl.baronPct}%`,
    `- **Opponent First-Gank Lane Bias:** TOP ${macroReport.firstGankDistribution.TOP}% · MID ${macroReport.firstGankDistribution.MID}% · BOT ${macroReport.firstGankDistribution.BOT}%`,
    ``,
    `## 2. Tactical Callouts`,
    ...macroReport.callouts.map((c) => `- ${c}`),
    ``,
    `## 3. Opponent Champion Pool & Fearless Fatigue`,
    `| Player | Role | Unique Picks | Avg CS@15 | KDA | Fearless Fatigue |`,
    `|---|---|---|---:|---:|---:|`,
    ...macroReport.opponentPoolProfiles.map(
      (p) =>
        `| ${p.name} | ${p.role} | ${p.uniqueChampions.map((id) => CHAMPION_BY_ID[id]?.name || id).join(', ')} | ${p.avgCs15} | ${p.kda} | ${p.fearlessFatigueScore}/100 (${p.riskLevel}) |`
    ),
    ``,
    `## 4. Fearless Draft Board State (Game ${activeGame.gameNumber})`,
    `- **${series.blueTeam} Bans:** ${activeGame.blueBans.filter(Boolean).map((id) => CHAMPION_BY_ID[id]?.name || id).join(', ') || 'None'}`,
    `- **${series.redTeam} Bans:** ${activeGame.redBans.filter(Boolean).map((id) => CHAMPION_BY_ID[id]?.name || id).join(', ') || 'None'}`,
    `- **${series.blueTeam} Picks:** ${activeGame.bluePicks.filter(Boolean).map((id) => CHAMPION_BY_ID[id]?.name || id).join(', ') || 'None'}`,
    `- **${series.redTeam} Picks:** ${activeGame.redPicks.filter(Boolean).map((id) => CHAMPION_BY_ID[id]?.name || id).join(', ') || 'None'}`
  ];

  if (squeezeReport && Array.isArray(squeezeReport.targetBans) && squeezeReport.targetBans.length > 0) {
    lines.push(
      ``,
      `## 5. Fearless Pool-Squeeze Target Bans (Junie Engine)`,
      ...squeezeReport.targetBans.map(
        (b, idx) => `${idx + 1}. **${b.championName}** (${b.role}) — Squeeze Score ${b.squeezeScore}/100 · ${b.rationale}`
      )
    );
  }

  return lines.join('\n') + '\n';
}

/**
 * Generate a machine-readable JSON dossier bundle for coaching staff & JetBrains pipelines.
 */
export function generateDossierJson({ series, macroReport, squeezeReport = null }) {
  return JSON.stringify(
    {
      tool: 'C9 DraftForge',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      series,
      macroReport,
      squeezeReport
    },
    null,
    2
  );
}
