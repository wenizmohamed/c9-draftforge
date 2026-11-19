import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PRO_SCOUTING_PRESETS, parseGridLolSeries } from '../src/gridLolParser.js';

describe('GRID LoL Series State Parser', () => {
  it('parses all three built-in pro scouting presets cleanly', () => {
    const keys = Object.keys(PRO_SCOUTING_PRESETS);
    assert.equal(keys.length, 3);

    for (const key of keys) {
      const preset = PRO_SCOUTING_PRESETS[key];
      const parsed = parseGridLolSeries(preset.data, { focusTeamTag: 'C9' });
      assert.equal(parsed.focusTeam.tag, 'C9');
      assert.ok(parsed.games.length >= 2, `Preset ${key} should contain multiple games`);
      assert.equal(parsed.games[0].focusPlayers.length, 5);
      assert.equal(parsed.games[0].opponentPlayers.length, 5);
    }
  });

  it('accepts raw JSON strings and direct seriesState payloads', () => {
    const raw = JSON.stringify({ seriesState: PRO_SCOUTING_PRESETS['c9-fly-fearless'].data.seriesState });
    const parsed = parseGridLolSeries(raw);
    assert.equal(parsed.opponentTeam.name, 'FlyQuest');
    assert.equal(parsed.format, 'BO3');
  });

  it('rejects malformed payloads lacking games[]', () => {
    assert.throws(() => parseGridLolSeries({ data: { seriesState: { games: [] } } }), /Invalid GRID LoL/);
    assert.throws(() => parseGridLolSeries('{}'), /Invalid GRID LoL/);
  });
});
