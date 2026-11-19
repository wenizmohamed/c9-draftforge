import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PRO_SCOUTING_PRESETS, parseGridLolSeries } from '../src/gridLolParser.js';
import {
  projectRiftCoord,
  analyzeMacroSeries,
  generateDossierMarkdown,
  generateDossierJson
} from '../src/macroAnalytics.js';
import { createFearlessSeries, autoFillCurrentGame } from '../src/fearlessDraft.js';

describe('LoL Macro Scouting Analytics & Dossier Export', () => {
  it('projects Riot Summoner Rift world coordinates (bottom-left origin) into calibrated percentages', () => {
    const botLeft = projectRiftCoord(0, 0);
    assert.deepEqual(botLeft, { leftPct: 0, topPct: 100 });

    const topRight = projectRiftCoord(14870, 14870);
    assert.deepEqual(topRight, { leftPct: 100, topPct: 0 });

    const midLane = projectRiftCoord(7435, 7435);
    assert.deepEqual(midLane, { leftPct: 50, topPct: 50 });
  });

  it('computes accurate Gold@15 deltas, objective rates, and lane gank distributions for C9 vs TL', () => {
    const parsed = parseGridLolSeries(PRO_SCOUTING_PRESETS['c9-tl-lcs-finals'].data);
    const report = analyzeMacroSeries(parsed);

    assert.equal(report.gameCount, 3);
    // Game 1: +2140, Game 2: -1250, Game 3: +2250 => avg = +1047
    assert.equal(report.avgGoldDelta15, 1047);
    assert.equal(report.objectiveControl.voidgrubsPct, 72);
    assert.equal(report.firstGankDistribution.primaryLane, 'BOT');
    assert.equal(report.opponentPoolProfiles.length, 5);
    assert.ok(report.callouts.length >= 3);
  });

  it('exports structured Coach Draft & Macro Dossiers in Markdown and JSON', () => {
    const parsed = parseGridLolSeries(PRO_SCOUTING_PRESETS['c9-g2-msi-scrim'].data);
    const report = analyzeMacroSeries(parsed);
    const series = autoFillCurrentGame(
      createFearlessSeries({ format: 'BO5', blueTeam: 'Cloud9', redTeam: 'G2 Esports' }),
      report.opponentSignatureIds
    );

    const md = generateDossierMarkdown({ series, macroReport: report });
    assert.ok(md.includes('# C9 DraftForge — Coach Draft & Macro Dossier'));
    assert.ok(md.includes('G2 Esports'));
    assert.ok(md.includes('Voidgrubs Control'));

    const json = JSON.parse(generateDossierJson({ series, macroReport: report }));
    assert.equal(json.tool, 'C9 DraftForge');
    assert.equal(json.macroReport.seriesId, 'grid-lol-2894555');
  });
});
