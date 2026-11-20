import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFearlessCollapseMatrix,
  simulateSeriesDelta,
  normalizeSimulatorOptions,
  SIMULATOR_SCENARIOS
} from '../src/seriesSimulator.js';
import {
  createFearlessSeries,
  applyDraftAction,
  autoFillCurrentGame,
  advanceToNextGame
} from '../src/fearlessDraft.js';
import { PRO_SCOUTING_PRESETS, parseGridLolSeries } from '../src/gridLolParser.js';
import {
  analyzeMacroSeries,
  generateDossierMarkdown,
  generateDossierJson
} from '../src/macroAnalytics.js';
import { analyzeFearlessSqueeze } from '../src/fearlessSqueeze.js';

function loadPresetFixture(key) {
  const preset = PRO_SCOUTING_PRESETS[key];
  const parsed = parseGridLolSeries(preset.data, { focusTeamTag: 'C9' });
  const macroReport = analyzeMacroSeries(parsed);
  const series = createFearlessSeries({
    format: preset.format,
    blueTeam: parsed.focusTeam.name,
    redTeam: parsed.opponentTeam.name
  });
  return { preset, parsed, macroReport, series };
}

describe('Game 1->5 Fearless Pool Collapse Matrix & Series Delta Simulator', () => {
  it('builds a complete 5-role x 5-game BO5 collapse matrix with valid headers and non-negative counts', () => {
    const { series, macroReport } = loadPresetFixture('c9-tl-lcs-finals');
    const matrix = buildFearlessCollapseMatrix({ series, macroReport });

    assert.equal(matrix.format, 'BO5');
    assert.equal(matrix.maxGames, 5);
    assert.deepEqual(matrix.gameHeaders, ['G1', 'G2', 'G3', 'G4', 'G5']);
    assert.equal(matrix.rows.length, 5);

    for (const row of matrix.rows) {
      assert.equal(row.cells.length, 5);
      for (const cell of row.cells) {
        assert.ok(cell.c9ComfortRemaining >= 0);
        assert.ok(cell.oppComfortRemaining >= 0);
        assert.ok(cell.oppMetaRemaining >= 0);
        assert.ok(cell.oppComfortRemaining <= cell.oppComfortTotal);
        assert.ok(cell.oppMetaRemaining <= cell.oppMetaTotal);
      }
    }
  });

  it('dynamically adapts matrix dimensions and late-series label for BO3 vs BO5', () => {
    const { series, macroReport } = loadPresetFixture('c9-fly-fearless');
    const simBo3 = simulateSeriesDelta({ series, macroReport });

    assert.equal(simBo3.matrix.format, 'BO3');
    assert.equal(simBo3.matrix.maxGames, 3);
    assert.deepEqual(simBo3.matrix.gameHeaders, ['G1', 'G2', 'G3']);
    assert.equal(simBo3.perGameWinCurve.length, 3);
    assert.equal(simBo3.comparison.lateSeriesLabel, 'G3 Decider');

    const bo5Series = createFearlessSeries({ format: 'BO5', blueTeam: 'Cloud9', redTeam: 'FlyQuest' });
    const simBo5 = simulateSeriesDelta({ series: bo5Series, macroReport });
    assert.equal(simBo5.matrix.format, 'BO5');
    assert.equal(simBo5.matrix.maxGames, 5);
    assert.equal(simBo5.perGameWinCurve.length, 5);
    assert.equal(simBo5.comparison.lateSeriesLabel, 'G4–G5 Deciders');
  });

  it('propagates live completed Game 1 Fearless lockouts directly into Game 2 matrix cells', () => {
    const { series, macroReport } = loadPresetFixture('c9-tl-lcs-finals');
    const g1Complete = autoFillCurrentGame(series, macroReport.opponentSignatureIds);
    const g2Series = advanceToNextGame(g1Complete);

    const matrix = buildFearlessCollapseMatrix({ series: g2Series, macroReport });
    assert.equal(matrix.currentGameIndex, 1);
    assert.equal(matrix.summary.totalActiveLockouts, 10);

    const g2LockedUnion = new Set(matrix.rows.flatMap((r) => r.cells[1].lockedInRoleIds));
    assert.equal(g2LockedUnion.size, 10);
    assert.ok(matrix.rows.every((r) => r.cells[1].isCurrentGame === true));
    assert.ok(matrix.rows.every((r) => r.cells[0].isCurrentGame === false));
  });

  it('identifies the exact first role collapse (CRITICAL_SQUEEZE or EXHAUSTED) across a BO5', () => {
    const { series, macroReport } = loadPresetFixture('c9-tl-lcs-finals');
    const matrix = buildFearlessCollapseMatrix({
      series,
      macroReport,
      options: { pinchRole: 'MID', banWaveIntensity: 'AGGRESSIVE' }
    });

    assert.ok(matrix.summary.firstCollapse, 'expected a first collapse breakpoint in BO5');
    assert.equal(matrix.summary.firstCollapse.role, 'MID');
    assert.equal(matrix.summary.firstCollapse.playerName, 'APA');
    assert.ok(matrix.summary.firstCollapse.gameNumber <= 2);
    assert.ok(['CRITICAL_SQUEEZE', 'EXHAUSTED'].includes(matrix.summary.firstCollapse.collapseState));

    const markedCells = matrix.rows.flatMap((r) => r.cells).filter((c) => c.isFirstCollapse);
    assert.equal(markedCells.length, 1);
    assert.equal(markedCells[0].role, 'MID');
    assert.equal(markedCells[0].gameNumber, matrix.summary.firstCollapse.gameNumber);
  });

  it('shifts targeted ban-wave compression when coach switches pinchRole lever', () => {
    const { series, macroReport } = loadPresetFixture('c9-tl-lcs-finals');
    const midMatrix = buildFearlessCollapseMatrix({
      series,
      macroReport,
      options: { pinchRole: 'MID', banWaveIntensity: 'ALL_IN' }
    });
    const botMatrix = buildFearlessCollapseMatrix({
      series,
      macroReport,
      options: { pinchRole: 'BOT', banWaveIntensity: 'ALL_IN' }
    });

    const midCellWhenMid = midMatrix.rows.find((r) => r.role === 'MID').cells[0];
    const botCellWhenMid = midMatrix.rows.find((r) => r.role === 'BOT').cells[0];
    const botCellWhenBot = botMatrix.rows.find((r) => r.role === 'BOT').cells[0];

    assert.equal(midCellWhenMid.targetedBanIds.length, 2);
    assert.equal(botCellWhenMid.targetedBanIds.length, 0);
    assert.equal(botCellWhenBot.targetedBanIds.length, 2);
    assert.ok(botCellWhenBot.oppComfortRemaining < botCellWhenMid.oppComfortRemaining);
  });

  it('escalates opponent attrition and late-series edge monotonically from STANDARD to AGGRESSIVE to ALL_IN', () => {
    const { series, macroReport } = loadPresetFixture('c9-tl-lcs-finals');
    const std = simulateSeriesDelta({ series, macroReport, options: { pinchRole: 'MID', banWaveIntensity: 'STANDARD' } });
    const agg = simulateSeriesDelta({ series, macroReport, options: { pinchRole: 'MID', banWaveIntensity: 'AGGRESSIVE' } });
    const allIn = simulateSeriesDelta({ series, macroReport, options: { pinchRole: 'MID', banWaveIntensity: 'ALL_IN' } });

    assert.ok(agg.comparison.fearless.oppComfortAttritionPct >= std.comparison.fearless.oppComfortAttritionPct);
    assert.ok(allIn.comparison.fearless.oppComfortAttritionPct >= agg.comparison.fearless.oppComfortAttritionPct);
    assert.ok(agg.comparison.delta.lateSeriesAdvantagePct > std.comparison.delta.lateSeriesAdvantagePct);
    assert.ok(allIn.comparison.delta.lateSeriesAdvantagePct > agg.comparison.delta.lateSeriesAdvantagePct);
  });

  it('increases projected Gold@15 and Voidgrubs synergy when voidgrubPriority lever is ON vs OFF', () => {
    const { series, macroReport } = loadPresetFixture('c9-tl-lcs-finals');
    const grubsOn = simulateSeriesDelta({ series, macroReport, options: { voidgrubPriority: true } });
    const grubsOff = simulateSeriesDelta({ series, macroReport, options: { voidgrubPriority: false } });

    assert.ok(grubsOn.comparison.fearless.projectedGoldAt15 > grubsOff.comparison.fearless.projectedGoldAt15);
    assert.ok(grubsOn.comparison.fearless.voidgrubsSynergyPct > grubsOff.comparison.fearless.voidgrubsSynergyPct);
    assert.ok(grubsOn.comparison.fearless.seriesWinProbPct > grubsOff.comparison.fearless.seriesWinProbPct);
  });

  it('proves Fearless Pool-Squeeze plan outperforms Unconstrained Standard Draft on series equity and comfort attrition', () => {
    const { series, macroReport } = loadPresetFixture('c9-tl-lcs-finals');
    const squeezeReport = analyzeFearlessSqueeze({ series, macroReport, activeSide: 'blue' });
    const sim = simulateSeriesDelta({ series, macroReport, squeezeReport });

    assert.ok(sim.comparison.fearless.seriesWinProbPct > sim.comparison.standard.seriesWinProbPct);
    assert.ok(sim.comparison.delta.seriesWinProbPct > 0);
    assert.ok(sim.comparison.fearless.oppComfortAttritionPct > sim.comparison.standard.oppComfortAttritionPct);
    assert.ok(sim.comparison.delta.lateSeriesAdvantagePct > 0);
    assert.equal(sim.winConditionBrief.length, 3);
  });

  it('shows monotonic Fearless win-probability expansion from Game 1 to Game 5 as lockouts accumulate', () => {
    const { series, macroReport } = loadPresetFixture('c9-tl-lcs-finals');
    const sim = simulateSeriesDelta({
      series,
      macroReport,
      options: { pinchRole: 'MID', banWaveIntensity: 'AGGRESSIVE', voidgrubPriority: true }
    });

    const g1 = sim.perGameWinCurve[0];
    const g5 = sim.perGameWinCurve[4];
    assert.ok(g5.fearlessWinPct > g1.fearlessWinPct);
    assert.ok(g5.deltaPct > g1.deltaPct);
  });

  it('handles exhausted opponent comfort pools and empty scouting profiles cleanly without NaN or negative numbers', () => {
    let series = createFearlessSeries({ format: 'BO5', blueTeam: 'Cloud9', redTeam: 'Test Opponent' });
    // Exhaust all 5 MID champions via Game 1 + Game 2 picks
    series = autoFillCurrentGame(series, []);
    series = advanceToNextGame(series);
    series = autoFillCurrentGame(series, []);
    series = advanceToNextGame(series);

    const emptyMacro = {
      avgGoldDelta15: 0,
      objectiveControl: { voidgrubsPct: 50, riftHeraldPct: 50 },
      firstGankDistribution: { primaryLane: 'MID' },
      opponentPoolProfiles: [],
      focusPoolProfiles: []
    };

    const sim = simulateSeriesDelta({ series, macroReport: emptyMacro });
    assert.ok(Number.isFinite(sim.comparison.standard.seriesWinProbPct));
    assert.ok(Number.isFinite(sim.comparison.fearless.seriesWinProbPct));
    assert.ok(sim.comparison.fearless.oppComfortAttritionPct >= 0 && sim.comparison.fearless.oppComfortAttritionPct <= 100);
    for (const row of sim.matrix.rows) {
      for (const cell of row.cells) {
        assert.ok(cell.oppComfortRemaining >= 0);
        assert.ok(cell.oppMetaRemaining >= 0);
        assert.ok(cell.c9ComfortRemaining >= 0);
      }
    }
  });

  it('normalizes invalid pinchRole and banWaveIntensity inputs to safe deterministic defaults', () => {
    const { macroReport } = loadPresetFixture('c9-tl-lcs-finals');
    const normalized = normalizeSimulatorOptions(
      { pinchRole: 'COACH', banWaveIntensity: 'NUCLEAR', voidgrubPriority: false },
      macroReport
    );

    assert.equal(normalized.pinchRole, 'AUTO');
    assert.equal(normalized.effectivePinchRole, 'MID');
    assert.equal(normalized.banWaveIntensity, 'AGGRESSIVE');
    assert.equal(normalized.voidgrubPriority, false);
  });

  it('leaves series, macroReport, and options inputs completely immutable', () => {
    let { series, macroReport } = loadPresetFixture('c9-tl-lcs-finals');
    series = applyDraftAction(series, 'Rumble');
    series = applyDraftAction(series, 'Skarner');

    const options = { pinchRole: 'MID', banWaveIntensity: 'ALL_IN', voidgrubPriority: true };
    const seriesSnap = structuredClone(series);
    const macroSnap = structuredClone(macroReport);
    const optionsSnap = structuredClone(options);

    simulateSeriesDelta({ series, macroReport, options });

    assert.deepEqual(series, seriesSnap);
    assert.deepEqual(macroReport, macroSnap);
    assert.deepEqual(options, optionsSnap);
  });

  it('produces valid deterministic simulations across all three pro scouting presets and all scenario chips', () => {
    for (const presetKey of Object.keys(PRO_SCOUTING_PRESETS)) {
      const { series, macroReport } = loadPresetFixture(presetKey);
      for (const scenario of SIMULATOR_SCENARIOS) {
        const a = simulateSeriesDelta({ series, macroReport, options: scenario });
        const b = simulateSeriesDelta({ series, macroReport, options: scenario });
        assert.deepEqual(a, b, `Non-deterministic output for ${presetKey} / ${scenario.id}`);
        assert.ok(a.comparison.fearless.seriesWinProbPct >= 18 && a.comparison.fearless.seriesWinProbPct <= 94);
      }
    }
  });

  it('embeds Side-by-Side Series Delta and First Collapse findings cleanly into Markdown and JSON Coach Dossiers', () => {
    const { series, macroReport } = loadPresetFixture('c9-tl-lcs-finals');
    const squeezeReport = analyzeFearlessSqueeze({ series, macroReport, activeSide: 'blue' });
    const simulationReport = simulateSeriesDelta({ series, macroReport, squeezeReport });

    const md = generateDossierMarkdown({ series, macroReport, squeezeReport, simulationReport });
    assert.ok(md.includes('## 6. Side-by-Side Series Delta & Game 1->5 Pool Collapse Simulator'));
    assert.ok(md.includes('Unconstrained Standard'));
    assert.ok(md.includes('Fearless Pool-Squeeze'));
    assert.ok(md.includes('First Role Collapse'));

    const parsedJson = JSON.parse(generateDossierJson({ series, macroReport, squeezeReport, simulationReport }));
    assert.equal(parsedJson.simulationReport.matrix.format, 'BO5');
    assert.equal(parsedJson.simulationReport.comparison.fearless.seriesWinProbPct, simulationReport.comparison.fearless.seriesWinProbPct);
  });
});
