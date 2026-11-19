import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ROLES, CHAMPIONS } from '../src/champions.js';
import { createFearlessSeries, applyDraftAction, advanceToNextGame, getFearlessLockouts, getCurrentGameUsedSet } from '../src/fearlessDraft.js';
import { PRO_SCOUTING_PRESETS, parseGridLolSeries } from '../src/gridLolParser.js';
import { analyzeMacroSeries } from '../src/macroAnalytics.js';
import { analyzeFearlessSqueeze } from '../src/fearlessSqueeze.js';

const macroReport = analyzeMacroSeries(parseGridLolSeries(PRO_SCOUTING_PRESETS['c9-tl-lcs-finals'].data));

function draftFirstGame() {
  const picks = ['KSante', 'Rumble', 'Sejuani', 'Azir', 'Varus', 'Taliyah', 'Kalista', 'Nautilus', 'Vi', 'Renata'];
  const bans = CHAMPIONS.map((champion) => champion.id).filter((id) => !picks.includes(id)).slice(0, 10);
  const actions = [...bans.slice(0, 6), ...picks.slice(0, 6), ...bans.slice(6), ...picks.slice(6)];
  return actions.reduce((series, id) => applyDraftAction(series, id), createFearlessSeries());
}

describe('Fearless pool-squeeze analysis', () => {
  it('analyzes the Game 1 scouting baseline deterministically', () => {
    const series = createFearlessSeries();
    const result = analyzeFearlessSqueeze({ series, macroReport });
    assert.deepEqual(result, analyzeFearlessSqueeze({ series, macroReport }));
    assert.deepEqual(result.rolePressures.map((entry) => entry.role), ROLES);
    assert.equal(result.targetBans.length, 3);
    for (const pressure of result.rolePressures) {
      const profile = macroReport.opponentPoolProfiles.find((p) => p.role === pressure.role);
      assert.equal(pressure.playerName, profile.name);
      assert.deepEqual(pressure.knownPool, profile.uniqueChampions);
      assert.deepEqual(pressure.lockedOutPool, []);
      assert.deepEqual(pressure.remainingComfortIds, profile.uniqueChampions);
      assert.equal(pressure.remainingComfortCount, profile.uniqueChampions.length);
      assert.equal(pressure.metaPoolRemaining, CHAMPIONS.filter((c) => c.roles.includes(pressure.role)).length);
      assert.ok(Number.isInteger(pressure.squeezeIndex) && pressure.squeezeIndex >= 0 && pressure.squeezeIndex <= 100);
      assert.equal(pressure.pressureLevel, pressure.squeezeIndex >= 78 ? 'CRITICAL' : pressure.squeezeIndex >= 60 ? 'HIGH' : pressure.squeezeIndex >= 40 ? 'MODERATE' : 'LOW');
      assert.ok(pressure.recommendedAction.length > 0);
    }
    for (const ban of result.targetBans) {
      assert.ok(Number.isInteger(ban.squeezeScore) && ban.squeezeScore >= 0 && ban.squeezeScore <= 100);
      assert.ok(ban.championId && ban.championName && ban.role && ban.targetPlayer && ban.rationale);
    }
    assert.ok(result.targetBans.every((ban, index, bans) => index === 0 || bans[index - 1].squeezeScore >= ban.squeezeScore));
    assert.equal(result.summary.totalLockedChampions, 0);
    assert.equal(result.summary.remainingSeriesGames, 5);
    assert.ok(ROLES.includes(result.summary.highestPressureRole));
    assert.ok(result.summary.highestPressurePlayer && result.summary.coachDirective);
  });

  it('escalates pressure after both teams pick opponent comfort champions in Game 1', () => {
    const gameOne = draftFirstGame();
    const before = analyzeFearlessSqueeze({ series: createFearlessSeries(), macroReport });
    const gameTwo = advanceToNextGame(gameOne);
    const after = analyzeFearlessSqueeze({ series: gameTwo, macroReport });
    assert.equal(after.summary.totalLockedChampions, 10);
    for (const role of ROLES) {
      const previous = before.rolePressures.find((entry) => entry.role === role);
      const current = after.rolePressures.find((entry) => entry.role === role);
      assert.ok(current.lockedOutPool.length > previous.lockedOutPool.length, role);
      assert.ok(current.remainingComfortCount < previous.remainingComfortCount, role);
      assert.ok(current.squeezeIndex > previous.squeezeIndex, role);
    }
  });

  it('excludes previous picks and current bans and picks, but not previous bans', () => {
    const previous = draftFirstGame();
    let series = advanceToNextGame(previous);
    const oldBan = previous.games[0].blueBans[0];
    const available = CHAMPIONS.map((champion) => champion.id).filter((id) => !getFearlessLockouts(series).has(id));
    for (const id of available.slice(0, 7)) series = applyDraftAction(series, id);
    const used = getCurrentGameUsedSet(series.games[1]);
    const unplayedOldBan = [...previous.games[0].blueBans, ...previous.games[0].redBans].find((id) => !used.has(id));
    const report = { opponentPoolProfiles: [{ name: 'Target', role: 'MID', uniqueChampions: [...getFearlessLockouts(series).keys(), ...used, unplayedOldBan] }] };
    const result = analyzeFearlessSqueeze({ series, macroReport: report, activeSide: 'red' });
    assert.ok(oldBan);
    assert.ok(result.targetBans.some((ban) => ban.championId === unplayedOldBan));
    assert.ok(result.targetBans.every((ban) => !getFearlessLockouts(series).has(ban.championId) && !used.has(ban.championId)));
    assert.equal(result.summary.totalLockedChampions, 10);
    assert.match(result.summary.coachDirective, /red/i);
  });

  it('counts remaining games including the active game in BO3 and BO5', () => {
    for (const format of ['BO3', 'BO5']) {
      let series = createFearlessSeries({ format });
      for (let index = 0; index < series.maxGames; index++) {
        assert.equal(analyzeFearlessSqueeze({ series, macroReport }).summary.remainingSeriesGames, series.maxGames - index);
        series = advanceToNextGame(series);
      }
    }
  });

  it('handles missing and empty scouting profiles without inventing target bans', () => {
    const series = createFearlessSeries();
    for (const report of [undefined, {}, { opponentPoolProfiles: [] }]) {
      const result = analyzeFearlessSqueeze({ series, macroReport: report });
      assert.deepEqual(result.rolePressures.map((entry) => entry.role), ROLES);
      assert.ok(result.rolePressures.every((entry) => entry.knownPool.length === 0 && entry.remainingComfortCount === 0));
      assert.deepEqual(result.targetBans, []);
      assert.match(result.summary.coachDirective, /scout/i);
    }
  });

  it('handles an entirely exhausted scouted pool without recommending locked champions', () => {
    const series = advanceToNextGame(draftFirstGame());
    const report = { opponentPoolProfiles: [{ name: 'APA', role: 'MID', uniqueChampions: ['Azir', 'Taliyah'] }] };
    const result = analyzeFearlessSqueeze({ series, macroReport: report });
    const mid = result.rolePressures.find((entry) => entry.role === 'MID');
    assert.deepEqual(mid.lockedOutPool, ['Azir', 'Taliyah']);
    assert.deepEqual(mid.remainingComfortIds, []);
    assert.equal(mid.remainingComfortCount, 0);
    assert.equal(mid.pressureLevel, 'CRITICAL');
    assert.deepEqual(result.targetBans, []);
  });

  it('deduplicates flex targets, ignores invalid roles and unknown catalog IDs, and leaves inputs unchanged', () => {
    const series = createFearlessSeries();
    const report = { opponentPoolProfiles: [
      { name: 'Mid', role: 'MID', uniqueChampions: ['Taliyah', 'Azir', 'Corki', 'UnknownChampion'] },
      { name: 'Jungle', role: 'JGL', uniqueChampions: ['Taliyah', 'Taliyah'] },
      { name: 'Invalid', role: 'INVALID', uniqueChampions: ['Ahri'] }
    ] };
    const before = structuredClone({ series, report });
    const result = analyzeFearlessSqueeze({ series, macroReport: report });
    assert.deepEqual({ series, report }, before);
    assert.equal(result.targetBans.filter((ban) => ban.championId === 'Taliyah').length, 1);
    assert.equal(result.targetBans[0].championId, 'Taliyah');
    assert.equal(result.targetBans[0].targetPlayer, 'Jungle');
    assert.ok(result.targetBans.every((ban) => ban.championId !== 'UnknownChampion' && ban.championId !== 'Ahri'));
    assert.deepEqual(result.rolePressures.find((entry) => entry.role === 'JGL').knownPool, ['Taliyah']);
  });
});