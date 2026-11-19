import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createFearlessSeries,
  applyDraftAction,
  undoLastAction,
  advanceToNextGame,
  getFearlessLockouts,
  analyzeComposition,
  recommendDraftActions,
  autoFillCurrentGame
} from '../src/fearlessDraft.js';

describe('Fearless Draft BO3/BO5 Engine', () => {
  it('enforces official 20-step LCS draft order and blocks duplicate picks in same game', () => {
    let state = createFearlessSeries({ format: 'BO5', blueTeam: 'Cloud9', redTeam: 'Team Liquid' });
    state = applyDraftAction(state, 'Azir'); // Blue Ban 1
    assert.equal(state.games[0].blueBans[0], 'Azir');
    assert.throws(() => applyDraftAction(state, 'Azir'), /already drafted or banned/i);

    state = undoLastAction(state);
    assert.equal(state.games[0].blueBans[0], null);
    assert.equal(state.games[0].stepIndex, 0);
  });

  it('hard-locks all Game 1 picks by EITHER team across Game 2 and Game 3', () => {
    let state = createFearlessSeries({ format: 'BO5', blueTeam: 'Cloud9', redTeam: 'Team Liquid' });
    state = autoFillCurrentGame(state, ['Taliyah', 'Kalista', 'Rumble']);
    assert.equal(state.games[0].completed, true);
    assert.equal(state.games[0].bluePicks.filter(Boolean).length, 5);
    assert.equal(state.games[0].redPicks.filter(Boolean).length, 5);

    const g1BluePick = state.games[0].bluePicks[0];
    const g1RedPick = state.games[0].redPicks[0];
    const g1BlueBan = state.games[0].blueBans[0];

    state = advanceToNextGame(state);
    assert.equal(state.currentGameIndex, 1);

    const lockouts = getFearlessLockouts(state);
    assert.equal(lockouts.size, 10, 'All 10 picks from Game 1 must be Fearless-locked in Game 2');
    assert.equal(lockouts.get(g1BluePick).stamp, 'LOCKED G1');
    assert.equal(lockouts.get(g1RedPick).stamp, 'LOCKED G1');
    assert.equal(lockouts.has(g1BlueBan), false, 'Bans from Game 1 remain available in Game 2');

    // Trying to pick or ban a Fearless-locked champion throws
    assert.throws(() => applyDraftAction(state, g1BluePick), /LOCKED G1/);
    assert.throws(() => applyDraftAction(state, g1RedPick), /LOCKED G1/);

    // Game 1 ban IS legal in Game 2
    const nextState = applyDraftAction(state, g1BlueBan);
    assert.equal(nextState.games[1].blueBans[0], g1BlueBan);
  });

  it('computes AP/AD damage split, synergy pairs, and warnings accurately', () => {
    const balanced = analyzeComposition(['KSante', 'Vi', 'Azir', 'Varus', 'Renata']);
    assert.equal(balanced.count, 5);
    assert.equal(balanced.apPct, 40);
    assert.equal(balanced.adPct, 60);
    assert.ok(balanced.synergyPairs.length >= 2, 'Expected known pro synergy pairs');
    assert.equal(balanced.warnings.length, 0);

    const fullAp = analyzeComposition(['Rumble', 'Sejuani', 'Azir', 'Orianna']);
    assert.equal(fullAp.apPct, 100);
    assert.ok(fullAp.warnings.some((w) => /Heavy AP/i.test(w)));
  });

  it('produces valid non-locked recommendations tailored to opponent signatures', () => {
    let state = createFearlessSeries({ format: 'BO3' });
    const banRecs = recommendDraftActions(state, 'ALL', ['Taliyah', 'Kalista']);
    assert.ok(banRecs.length === 5);
    assert.equal(banRecs[0].actionType, 'ban');
    assert.ok(
      banRecs.some((r) => r.champion.id === 'Taliyah' || r.champion.id === 'Kalista'),
      'Opponent signature champions should surface in ban recommendations'
    );
  });
});
