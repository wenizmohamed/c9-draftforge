import { CHAMPIONS, CHAMPION_BY_ID } from './src/champions.js';
import {
  createFearlessSeries,
  applyDraftAction,
  undoLastAction,
  advanceToNextGame,
  selectGame,
  resetSeries,
  getFearlessLockouts,
  getCurrentGameUsedSet,
  getActiveStep,
  analyzeComposition,
  recommendDraftActions,
  autoFillCurrentGame
} from './src/fearlessDraft.js';
import { PRO_SCOUTING_PRESETS, parseGridLolSeries } from './src/gridLolParser.js';
import {
  analyzeMacroSeries,
  generateDossierMarkdown,
  generateDossierJson
} from './src/macroAnalytics.js';
import { analyzeFearlessSqueeze } from './src/fearlessSqueeze.js';
import { simulateSeriesDelta, SIMULATOR_SCENARIOS } from './src/seriesSimulator.js';

const ROLE_LABELS = ['TOP', 'JGL', 'MID', 'BOT', 'SUP'];

const state = {
  presetKey: 'c9-tl-lcs-finals',
  parsedGrid: null,
  macroReport: null,
  series: null,
  squeezeReport: null,
  simulationReport: null,
  simOptions: {
    pinchRole: 'AUTO',
    banWaveIntensity: 'AGGRESSIVE',
    voidgrubPriority: true
  },
  activeScenarioId: null,
  selectedMatrixCell: null,
  roleFilter: 'ALL',
  searchQuery: ''
};

// DOM references
const el = {
  presetSelect: document.getElementById('preset-select'),
  btnHeroAutofill: document.getElementById('btn-hero-autofill'),
  btnExportMd: document.getElementById('btn-export-md'),
  btnExportJson: document.getElementById('btn-export-json'),
  btnUndo: document.getElementById('btn-undo'),
  btnAutofill: document.getElementById('btn-autofill'),
  btnNextGame: document.getElementById('btn-next-game'),
  btnReset: document.getElementById('btn-reset'),
  fmtBo5: document.getElementById('fmt-bo5'),
  fmtBo3: document.getElementById('fmt-bo3'),
  gameStepper: document.getElementById('game-stepper'),
  lockoutCounterPill: document.getElementById('lockout-counter-pill'),
  seriesMatchupPill: document.getElementById('series-matchup-pill'),
  phaseBadge: document.getElementById('phase-badge'),
  phaseLabel: document.getElementById('phase-label'),
  phaseHint: document.getElementById('phase-hint'),
  blueTeamName: document.getElementById('blue-team-name'),
  redTeamName: document.getElementById('red-team-name'),
  blueBans: document.getElementById('blue-bans'),
  redBans: document.getElementById('red-bans'),
  bluePicks: document.getElementById('blue-picks'),
  redPicks: document.getElementById('red-picks'),
  blueComp: document.getElementById('blue-comp'),
  redComp: document.getElementById('red-comp'),
  roleTabs: document.getElementById('role-tabs'),
  champSearch: document.getElementById('champ-search'),
  champGrid: document.getElementById('champ-grid'),
  recContextPill: document.getElementById('rec-context-pill'),
  recList: document.getElementById('rec-list'),
  squeezeDirective: document.getElementById('squeeze-directive'),
  squeezeList: document.getElementById('squeeze-list'),
  kpiGold15: document.getElementById('kpi-gold15'),
  kpiGold15Meta: document.getElementById('kpi-gold15-meta'),
  kpiGrubs: document.getElementById('kpi-grubs'),
  kpiGrubsMeta: document.getElementById('kpi-grubs-meta'),
  kpiLocked: document.getElementById('kpi-locked'),
  kpiLockedMeta: document.getElementById('kpi-locked-meta'),
  kpiSqueezeTarget: document.getElementById('kpi-squeeze-target'),
  kpiSqueezeMeta: document.getElementById('kpi-squeeze-meta'),
  gridSeriesIdPill: document.getElementById('grid-series-id-pill'),
  gankBiasPill: document.getElementById('gank-bias-pill'),
  riftOverlay: document.getElementById('rift-overlay'),
  gankSplitReadout: document.getElementById('gank-split-readout'),
  goldAvgPill: document.getElementById('gold-avg-pill'),
  goldChart: document.getElementById('gold-chart'),
  objSamplePill: document.getElementById('obj-sample-pill'),
  objectiveBars: document.getElementById('objective-bars'),
  macroCallouts: document.getElementById('macro-callouts'),
  gridDropzone: document.getElementById('grid-dropzone'),
  gridFileInput: document.getElementById('grid-file-input'),
  btnUploadGrid: document.getElementById('btn-upload-grid'),
  highestPressurePill: document.getElementById('highest-pressure-pill'),
  poolFatigueGrid: document.getElementById('pool-fatigue-grid'),
  firstCollapsePill: document.getElementById('first-collapse-pill'),
  seriesDeltaPill: document.getElementById('series-delta-pill'),
  simPinchGroup: document.getElementById('sim-pinch-group'),
  simIntensityGroup: document.getElementById('sim-intensity-group'),
  simVoidgrubToggle: document.getElementById('sim-voidgrub-toggle'),
  simVoidgrubLabel: document.getElementById('sim-voidgrub-label'),
  simScenarioChips: document.getElementById('sim-scenario-chips'),
  simSubtitle: document.getElementById('sim-subtitle'),
  simLeverSummaryPill: document.getElementById('sim-lever-summary-pill'),
  simStandardCard: document.getElementById('sim-standard-card'),
  simFearlessCard: document.getElementById('sim-fearless-card'),
  simCurveEdgePill: document.getElementById('sim-curve-edge-pill'),
  simWinCurve: document.getElementById('sim-win-curve'),
  simWinBrief: document.getElementById('sim-win-brief'),
  collapseMatrixTable: document.getElementById('collapse-matrix-table'),
  matrixInspector: document.getElementById('matrix-inspector'),
  toast: document.getElementById('toast')
};

let toastTimer = null;
function showToast(msg) {
  el.toast.textContent = msg;
  el.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove('show'), 2800);
}

function formatGold(val) {
  const sign = val >= 0 ? '+' : '-';
  return `${sign}${Math.abs(val).toLocaleString()}g`;
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function loadGridPayload(rawPayload, { presetFormat = null, seedPartialDraft = false } = {}) {
  const parsed = parseGridLolSeries(rawPayload, { focusTeamTag: 'C9' });
  state.parsedGrid = parsed;
  state.macroReport = analyzeMacroSeries(parsed);

  const fmt = presetFormat || parsed.format || 'BO5';
  state.series = createFearlessSeries({
    format: fmt,
    blueTeam: parsed.focusTeam.name,
    redTeam: parsed.opponentTeam.name
  });

  if (seedPartialDraft) {
    // Seed a crisp opening Ban Phase 1 + B1/R1/R2 picks so the desk immediately showcases live Riot portraits & synergy
    const openingSequence = ['Rumble', 'Skarner', 'Kalista', 'Varus', 'Taliyah', 'Rell', 'Azir', 'KSante', 'Vi'];
    for (const id of openingSequence) {
      try {
        state.series = applyDraftAction(state.series, id);
      } catch {
        // ignore if invalid
      }
    }
  }

  recomputeAndRender();
}

function loadPreset(presetKey, seedPartialDraft = false) {
  const preset = PRO_SCOUTING_PRESETS[presetKey];
  if (!preset) return;
  state.presetKey = presetKey;
  loadGridPayload(preset.data, { presetFormat: preset.format, seedPartialDraft });
}

function recomputeAndRender() {
  state.squeezeReport = analyzeFearlessSqueeze({
    series: state.series,
    macroReport: state.macroReport,
    activeSide: 'blue'
  });

  state.simulationReport = simulateSeriesDelta({
    series: state.series,
    macroReport: state.macroReport,
    squeezeReport: state.squeezeReport,
    options: state.simOptions
  });

  // Default or clamp selected matrix cell to valid role & game bounds
  const maxGames = state.simulationReport.matrix.maxGames;
  const fc = state.simulationReport.matrix.summary.firstCollapse;
  if (
    !state.selectedMatrixCell ||
    state.selectedMatrixCell.gameIndex >= maxGames ||
    !ROLE_LABELS.includes(state.selectedMatrixCell.role)
  ) {
    state.selectedMatrixCell = fc
      ? { role: fc.role, gameIndex: fc.gameIndex }
      : { role: state.simulationReport.options.effectivePinchRole, gameIndex: Math.min(maxGames - 1, 1) };
  }

  renderHeroKpis();
  renderSeriesControls();
  renderDraftDesk();
  renderRecommendations();
  renderSeriesSimulator();
  renderMacroSection();
  renderPoolFatigue();
}

function renderHeroKpis() {
  const m = state.macroReport;
  const lockouts = getFearlessLockouts(state.series);
  const activeGame = state.series.games[state.series.currentGameIndex];
  const topPressure = state.squeezeReport?.summary;

  el.kpiGold15.textContent = formatGold(m.avgGoldDelta15);
  el.kpiGold15.className = `kpi-value ${m.avgGoldDelta15 >= 0 ? 'positive' : 'negative'}`;
  el.kpiGold15Meta.textContent = `${m.focusTeam.tag} avg across ${m.gameCount} scouted games`;

  el.kpiGrubs.textContent = `${m.objectiveControl.voidgrubsPct}%`;
  const rawG = m.objectiveControl.raw;
  el.kpiGrubsMeta.textContent = `${rawG.totalGrubsFocus} / ${rawG.totalGrubsFocus + rawG.totalGrubsOpp} Voidgrubs secured`;

  el.kpiLocked.textContent = `${lockouts.size}`;
  el.kpiLockedMeta.textContent = `Game ${activeGame.gameNumber} active · ${CHAMPIONS.length - lockouts.size} meta picks open`;

  if (topPressure) {
    el.kpiSqueezeTarget.textContent = `${topPressure.highestPressurePlayer} · ${topPressure.highestPressureRole}`;
    el.kpiSqueezeMeta.textContent = `${topPressure.remainingSeriesGames} game(s) left in ${state.series.format}`;
  }
}

function renderSeriesControls() {
  const s = state.series;
  const lockouts = getFearlessLockouts(s);

  el.fmtBo5.classList.toggle('active', s.format === 'BO5');
  el.fmtBo3.classList.toggle('active', s.format === 'BO3');
  el.seriesMatchupPill.textContent = `${s.blueTeam} vs ${s.redTeam}`;
  el.lockoutCounterPill.textContent = `${lockouts.size} Fearless Lockout${lockouts.size === 1 ? '' : 's'} Active`;

  el.gameStepper.innerHTML = s.games
    .map((g, idx) => {
      const classes = ['game-pill'];
      if (idx === s.currentGameIndex) classes.push('active');
      if (g.completed) classes.push('done');
      const pickCount = g.bluePicks.filter(Boolean).length + g.redPicks.filter(Boolean).length;
      const suffix = g.completed ? ' ✓' : pickCount > 0 ? ` (${pickCount}/10)` : '';
      return `<button class="${classes.join(' ')}" data-game-index="${idx}" type="button">G${g.gameNumber}${suffix}</button>`;
    })
    .join('');

  el.gameStepper.querySelectorAll('.game-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.series = selectGame(state.series, Number(btn.dataset.gameIndex));
      recomputeAndRender();
    });
  });

  el.btnNextGame.disabled = s.currentGameIndex >= s.maxGames - 1;
}

function renderTeamColumn(side) {
  const s = state.series;
  const g = s.games[s.currentGameIndex];
  const activeStep = getActiveStep(s);
  const bans = side === 'blue' ? g.blueBans : g.redBans;
  const picks = side === 'blue' ? g.bluePicks : g.redPicks;
  const bansEl = side === 'blue' ? el.blueBans : el.redBans;
  const picksEl = side === 'blue' ? el.bluePicks : el.redPicks;
  const compEl = side === 'blue' ? el.blueComp : el.redComp;

  if (side === 'blue') el.blueTeamName.textContent = s.blueTeam;
  else el.redTeamName.textContent = s.redTeam;

  bansEl.innerHTML = bans
    .map((id, slot) => {
      const isActive = activeStep && activeStep.type === 'ban' && activeStep.side === side && activeStep.slot === slot;
      const champ = id ? CHAMPION_BY_ID[id] : null;
      const cls = ['ban-slot', champ ? 'filled' : '', isActive ? 'active-slot' : ''].filter(Boolean).join(' ');
      if (champ) {
        return `<div class="${cls}" title="${champ.name} (Banned)"><img src="${champ.asset}" alt="${champ.name}" /></div>`;
      }
      return `<div class="${cls}">B${slot + 1}</div>`;
    })
    .join('');

  picksEl.innerHTML = picks
    .map((id, slot) => {
      const isActive = activeStep && activeStep.type === 'pick' && activeStep.side === side && activeStep.slot === slot;
      const champ = id ? CHAMPION_BY_ID[id] : null;
      const cls = ['pick-slot', champ ? 'filled' : '', isActive ? 'active-slot' : ''].filter(Boolean).join(' ');
      const prefix = side === 'blue' ? `B${slot + 1}` : `R${slot + 1}`;
      if (champ) {
        return `
          <div class="${cls}">
            <div class="pick-avatar"><img src="${champ.asset}" alt="${champ.name}" /></div>
            <div class="pick-info">
              <div class="pick-name">${champ.name}</div>
              <div class="pick-meta">${champ.roles.join('/')} · ${champ.damageType} · ${champ.tags[0]}</div>
            </div>
          </div>`;
      }
      return `
        <div class="${cls}">
          <div class="pick-avatar">${prefix}</div>
          <div class="pick-info">
            <div class="pick-name" style="color: var(--ink-muted); font-weight: 500;">${isActive ? 'Selecting Now...' : `Open ${prefix} Slot`}</div>
            <div class="pick-meta">${ROLE_LABELS[slot]} flex slot</div>
          </div>
        </div>`;
    })
    .join('');

  const comp = analyzeComposition(picks);
  compEl.innerHTML = `
    <div class="comp-head">
      <span><strong>${comp.primaryStyle}</strong> · Score ${comp.draftScore || '--'}</span>
      <span>AP ${comp.apPct}% / AD ${comp.adPct}%</span>
    </div>
    <div class="damage-bar" aria-label="AP to AD damage split">
      <div class="damage-ap" style="width: ${comp.apPct}%"></div>
      <div class="damage-ad" style="width: ${comp.adPct}%"></div>
    </div>
    <div class="tag-row">
      ${comp.tags.map((t) => `<span class="mini-tag">${t.tag} ×${t.count}</span>`).join('')}
      ${comp.synergyPairs.slice(0, 2).map((p) => `<span class="mini-tag" style="border-color: rgba(28,131,87,0.35); color: #12613f;">★ ${p}</span>`).join('')}
    </div>
    ${comp.warnings.map((w) => `<div class="comp-warning">⚠ ${w}</div>`).join('')}
  `;
}

function renderDraftDesk() {
  const s = state.series;
  const g = s.games[s.currentGameIndex];
  const step = getActiveStep(s);
  const lockouts = getFearlessLockouts(s);
  const used = getCurrentGameUsedSet(g);

  if (step) {
    const teamName = step.side === 'blue' ? s.blueTeam : s.redTeam;
    el.phaseBadge.textContent = `${step.side.toUpperCase()} ${step.type.toUpperCase()}`;
    el.phaseBadge.className = `phase-badge ${step.side}`;
    el.phaseLabel.textContent = `Game ${g.gameNumber} · Step ${step.index + 1}/20 · ${step.label} (${teamName})`;
    el.phaseHint.textContent =
      lockouts.size > 0
        ? `${lockouts.size} prior-game champions stamped LOCKED under Fearless rules`
        : 'Click any open champion portrait or coach recommendation';
  } else {
    el.phaseBadge.textContent = `GAME ${g.gameNumber} LOCKED`;
    el.phaseBadge.className = 'phase-badge done';
    el.phaseLabel.textContent = `Game ${g.gameNumber} Draft Complete · All 10 picks ready to Fearless-lock`;
    el.phaseHint.textContent =
      s.currentGameIndex < s.maxGames - 1
        ? `Click "Advance to Next Game" to hard-lock these 10 picks in Game ${g.gameNumber + 1}`
        : `Final game of ${s.format} complete — export Coach Dossier above`;
  }

  renderTeamColumn('blue');
  renderTeamColumn('red');

  // Render 28-champion Riot portrait grid
  const query = state.searchQuery.trim().toLowerCase();
  const filtered = CHAMPIONS.filter((c) => {
    if (state.roleFilter !== 'ALL' && !c.roles.includes(state.roleFilter)) return false;
    if (query && !c.name.toLowerCase().includes(query) && !c.id.toLowerCase().includes(query)) return false;
    return true;
  });

  el.champGrid.innerHTML = filtered
    .map((c) => {
      const lockInfo = lockouts.get(c.id);
      const isUsed = used.has(c.id);
      const disabled = Boolean(lockInfo || isUsed || !step);
      const cls = ['champ-tile', lockInfo ? 'locked' : '', isUsed ? 'used' : ''].filter(Boolean).join(' ');
      const title = lockInfo
        ? `${c.name} — Fearless ${lockInfo.stamp} (${lockInfo.team})`
        : isUsed
        ? `${c.name} — Already drafted/banned in Game ${g.gameNumber}`
        : `${c.name} (${c.roles.join('/')}, ${c.damageType})`;
      return `
        <button class="${cls}" data-champ-id="${c.id}" ${disabled ? 'disabled' : ''} title="${title}" type="button">
          <div class="champ-thumb-wrap">
            <img src="${c.asset}" alt="${c.name}" loading="eager" />
            ${lockInfo ? `<span class="lock-stamp">${lockInfo.stamp}</span>` : ''}
            ${!lockInfo && isUsed ? `<span class="used-stamp">IN G${g.gameNumber}</span>` : ''}
          </div>
          <div class="champ-name">${c.name}</div>
          <div class="champ-sub"><span>${c.roles[0]}</span><span>${c.damageType}</span></div>
        </button>`;
    })
    .join('');

  el.champGrid.querySelectorAll('.champ-tile:not(:disabled)').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.champId;
      try {
        state.series = applyDraftAction(state.series, id);
        recomputeAndRender();
      } catch (err) {
        showToast(err.message);
      }
    });
  });
}

function renderRecommendations() {
  const step = getActiveStep(state.series);
  const recs = recommendDraftActions(state.series, state.roleFilter, state.macroReport.opponentSignatureIds);

  if (!step) {
    el.recContextPill.textContent = 'Game Draft Complete';
    el.recList.innerHTML = `<div style="font-size: 13px; color: var(--ink-muted); padding: 12px 4px;">Advance to the next Fearless game to generate fresh counter-pick recommendations against the reduced pool.</div>`;
  } else {
    el.recContextPill.textContent = `${step.label} · Click to Lock`;
    el.recList.innerHTML = recs
      .map(
        (r) => `
        <button class="rec-item" data-rec-champ="${r.champion.id}" type="button">
          <img src="${r.champion.asset}" alt="${r.champion.name}" />
          <div class="rec-main">
            <div class="rec-title">
              <span>${r.champion.name}</span>
              <span class="mini-tag">${r.champion.roles.join('/')}</span>
              <span class="mini-tag">${r.champion.damageType}</span>
            </div>
            <div class="rec-reason">${r.reason}</div>
          </div>
          <div class="rec-score">${r.score}</div>
        </button>`
      )
      .join('');

    el.recList.querySelectorAll('.rec-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        try {
          state.series = applyDraftAction(state.series, btn.dataset.recChamp);
          recomputeAndRender();
        } catch (err) {
          showToast(err.message);
        }
      });
    });
  }

  // Junie Fearless Pool-Squeeze Target Bans
  const sq = state.squeezeReport;
  el.squeezeDirective.textContent = sq.summary.coachDirective;
  el.squeezeList.innerHTML = sq.targetBans
    .map((b) => {
      const champ = CHAMPION_BY_ID[b.championId];
      const imgSrc = champ ? champ.asset : 'assets/lol/champions/Azir.png';
      return `
        <button class="rec-item" data-squeeze-champ="${b.championId}" type="button" ${!step ? 'disabled' : ''}>
          <img src="${imgSrc}" alt="${b.championName}" />
          <div class="rec-main">
            <div class="rec-title">
              <span>${b.championName}</span>
              <span class="mini-tag">${b.role} · vs ${b.targetPlayer}</span>
            </div>
            <div class="rec-reason">${b.rationale}</div>
          </div>
          <div class="rec-score squeeze">${b.squeezeScore}</div>
        </button>`;
    })
    .join('');

  el.squeezeList.querySelectorAll('.rec-item:not(:disabled)').forEach((btn) => {
    btn.addEventListener('click', () => {
      try {
        state.series = applyDraftAction(state.series, btn.dataset.squeezeChamp);
        recomputeAndRender();
      } catch (err) {
        showToast(err.message);
      }
    });
  });
}

function formatSigned(val, suffix = '') {
  const sign = val >= 0 ? '+' : '';
  return `${sign}${val}${suffix}`;
}

function renderPortraitStrip(ids, { locked = false, emptyText = 'None' } = {}) {
  if (!ids || ids.length === 0) {
    return `<span style="font-size: 11.5px; color: var(--ink-muted);">${emptyText}</span>`;
  }
  return ids
    .map((id) => {
      const c = CHAMPION_BY_ID[id];
      if (!c) return '';
      return `<div class="mini-portrait ${locked ? 'locked' : ''}" title="${c.name}${locked ? ' (Fearless Locked / Banned)' : ''}"><img src="${c.asset}" alt="${c.name}" /></div>`;
    })
    .join('');
}

function renderMatrixInspector() {
  const sim = state.simulationReport;
  if (!sim || !el.matrixInspector) return;
  const sel = state.selectedMatrixCell || { role: 'MID', gameIndex: 0 };
  const row = sim.matrix.rows.find((r) => r.role === sel.role) || sim.matrix.rows[0];
  const cell = row.cells[sel.gameIndex] || row.cells[0];

  const badgeClass =
    cell.collapseState === 'CRITICAL_SQUEEZE' || cell.collapseState === 'EXHAUSTED'
      ? 'pill-crimson'
      : cell.collapseState === 'SQUEEZED' || cell.collapseState === 'STRAINED'
      ? 'pill-brass'
      : 'pill-emerald';

  const edgeText =
    cell.advantageDelta > 0
      ? `${state.series.blueTeam} +${cell.advantageDelta} pool edge`
      : cell.advantageDelta < 0
      ? `${state.series.redTeam} +${Math.abs(cell.advantageDelta)} pool edge`
      : 'Even pool depth';

  const lockedOrBanned = [...new Set([...cell.lockedInRoleIds, ...cell.targetedBanIds])];

  el.matrixInspector.innerHTML = `
    <div>
      <div class="inspector-col-title">Selected Matrix Cell Inspector</div>
      <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 8px;">
        <strong style="font-family: var(--font-heading); font-size: 16px;">${cell.role} · Game ${cell.gameNumber}</strong>
        <span class="pill ${badgeClass}">${cell.collapseLabel}</span>
        ${cell.isFirstCollapse ? '<span class="pill pill-crimson">1ST COLLAPSE BREAKPOINT</span>' : ''}
        <span class="pill pill-obsidian">${edgeText}</span>
      </div>
      <div style="font-size: 12.5px; color: var(--ink-secondary); line-height: 1.45;">
        <strong>${cell.c9PlayerName}</strong> (${cell.c9ComfortRemaining}/${cell.c9ComfortTotal} comfort) vs
        <strong>${cell.oppPlayerName}</strong> (${cell.oppComfortRemaining}/${cell.oppComfortTotal} comfort · ${cell.oppMetaRemaining}/${cell.oppMetaTotal} meta open).
      </div>
      <p style="margin: 8px 0 0; font-size: 12px; color: var(--ink-secondary);">${cell.coachNote}</p>
    </div>

    <div>
      <div class="inspector-col-title">Locked / Banned in ${cell.role} Entering G${cell.gameNumber} (${lockedOrBanned.length})</div>
      <div class="mini-portraits">
        ${renderPortraitStrip(lockedOrBanned, { locked: true, emptyText: 'No role lockouts entering Game 1' })}
      </div>
      ${
        cell.targetedBanIds.length > 0
          ? `<div style="margin-top: 6px; font-family: var(--font-mono); font-size: 10.5px; color: var(--crimson);">Includes ${cell.targetedBanIds.length} active pinch ban(s): ${cell.targetedBanIds.map((id) => CHAMPION_BY_ID[id]?.name || id).join(', ')}</div>`
          : ''
      }
    </div>

    <div>
      <div class="inspector-col-title">${cell.oppPlayerName} Remaining Comfort (${cell.oppRemainingComfortIds.length}) &amp; Open Meta (${cell.metaRemainingIds.length})</div>
      <div class="mini-portraits" style="margin-bottom: 8px;">
        ${renderPortraitStrip(cell.oppRemainingComfortIds, { emptyText: '0 scouted comfort picks remaining!' })}
      </div>
      <div style="font-family: var(--font-mono); font-size: 10.5px; color: var(--ink-muted);">
        Open ${cell.role} Meta: ${cell.metaRemainingIds.map((id) => CHAMPION_BY_ID[id]?.name || id).join(', ') || 'EXHAUSTED'}
      </div>
    </div>
  `;
}

function renderSeriesSimulator() {
  const sim = state.simulationReport;
  if (!sim || !el.collapseMatrixTable) return;

  const { comparison, matrix, perGameWinCurve, winConditionBrief, options } = sim;
  const fc = matrix.summary.firstCollapse;

  // Header summary pills
  el.firstCollapsePill.textContent = fc
    ? `1st Collapse: ${fc.role} (${fc.playerName}) · G${fc.gameNumber}`
    : `No Critical Collapse Projected (${matrix.format})`;
  el.seriesDeltaPill.textContent = `Series Win Δ: ${formatSigned(comparison.delta.seriesWinProbPct, '%')}`;

  // Sync coaching lever controls
  el.simPinchGroup.querySelectorAll('.sim-seg-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.pinchRole === state.simOptions.pinchRole);
  });
  el.simIntensityGroup.querySelectorAll('.sim-seg-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.intensity === state.simOptions.banWaveIntensity);
  });
  el.simVoidgrubToggle.classList.toggle('active', state.simOptions.voidgrubPriority);
  el.simVoidgrubToggle.setAttribute('aria-pressed', String(state.simOptions.voidgrubPriority));
  el.simVoidgrubLabel.textContent = state.simOptions.voidgrubPriority ? 'Priority ON' : 'Priority OFF';

  // Scenario chips
  el.simScenarioChips.innerHTML =
    `<span class="sim-lever-label" style="margin-right: 4px;">Scenarios:</span>` +
    SIMULATOR_SCENARIOS.map(
      (sc) =>
        `<button class="scenario-chip ${state.activeScenarioId === sc.id ? 'active' : ''}" data-scenario-id="${sc.id}" title="${sc.description}" type="button">${sc.label}</button>`
    ).join('');

  el.simScenarioChips.querySelectorAll('.scenario-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      const sc = SIMULATOR_SCENARIOS.find((item) => item.id === btn.dataset.scenarioId);
      if (!sc) return;
      state.activeScenarioId = sc.id;
      state.simOptions = {
        pinchRole: sc.pinchRole,
        banWaveIntensity: sc.banWaveIntensity,
        voidgrubPriority: sc.voidgrubPriority
      };
      state.selectedMatrixCell = null;
      recomputeAndRender();
      showToast(`Applied simulator preset: ${sc.label}`);
    });
  });

  // Subtitle & lever pill
  el.simSubtitle.textContent = `Deterministic ${matrix.format} projection for ${state.series.blueTeam} vs ${state.series.redTeam} (${matrix.summary.totalActiveLockouts} live Fearless lockouts active).`;
  el.simLeverSummaryPill.textContent = `Pinch: ${options.effectivePinchRole} · ${options.banWaveIntensity.replace('_', '-')} · Grubs ${options.voidgrubPriority ? 'ON' : 'OFF'}`;

  // Side-by-Side Plan Cards
  const std = comparison.standard;
  const fl = comparison.fearless;
  const d = comparison.delta;

  el.simStandardCard.innerHTML = `
    <div class="plan-head">
      <h4 class="plan-title">${std.planName}</h4>
      <span class="pill">Baseline · No Lockouts</span>
    </div>
    <div class="plan-hero-metric">
      <span class="plan-big-num">${std.seriesWinProbPct}%</span>
      <span style="font-size: 12px; color: var(--ink-muted);">Projected ${state.series.blueTeam} ${matrix.format} Win Equity</span>
    </div>
    <div class="plan-metrics-grid">
      <div class="plan-stat">
        <div class="plan-stat-lbl">${comparison.lateSeriesLabel} Edge</div>
        <div class="plan-stat-val-row"><span class="plan-stat-val">${formatSigned(std.lateSeriesAdvantagePct, '%')}</span></div>
      </div>
      <div class="plan-stat">
        <div class="plan-stat-lbl">Gold@15 Baseline</div>
        <div class="plan-stat-val-row"><span class="plan-stat-val">${formatGold(std.projectedGoldAt15)}</span></div>
      </div>
      <div class="plan-stat">
        <div class="plan-stat-lbl">Voidgrubs Synergy</div>
        <div class="plan-stat-val-row"><span class="plan-stat-val">${std.voidgrubsSynergyPct}%</span></div>
      </div>
      <div class="plan-stat">
        <div class="plan-stat-lbl">Opp Comfort Attrition</div>
        <div class="plan-stat-val-row"><span class="plan-stat-val">${std.oppComfortAttritionPct}%</span></div>
      </div>
    </div>
  `;

  el.simFearlessCard.innerHTML = `
    <div class="plan-head">
      <h4 class="plan-title">${fl.planName}</h4>
      <span class="pill" style="background: rgba(230,196,124,0.16); color: #f6dca4; border-color: rgba(230,196,124,0.38);">Recommended C9 Plan</span>
    </div>
    <div class="plan-hero-metric">
      <span class="plan-big-num">${fl.seriesWinProbPct}%</span>
      <span class="delta-badge">${formatSigned(d.seriesWinProbPct, '%')} vs Standard</span>
    </div>
    <div class="plan-metrics-grid">
      <div class="plan-stat">
        <div class="plan-stat-lbl">${comparison.lateSeriesLabel} Edge</div>
        <div class="plan-stat-val-row">
          <span class="plan-stat-val">${formatSigned(fl.lateSeriesAdvantagePct, '%')}</span>
          <span class="plan-stat-delta">${formatSigned(d.lateSeriesAdvantagePct, '%')}</span>
        </div>
      </div>
      <div class="plan-stat">
        <div class="plan-stat-lbl">Projected Gold@15</div>
        <div class="plan-stat-val-row">
          <span class="plan-stat-val">${formatGold(fl.projectedGoldAt15)}</span>
          <span class="plan-stat-delta">${formatGold(d.projectedGoldAt15)}</span>
        </div>
      </div>
      <div class="plan-stat">
        <div class="plan-stat-lbl">Voidgrubs Synergy</div>
        <div class="plan-stat-val-row">
          <span class="plan-stat-val">${fl.voidgrubsSynergyPct}%</span>
          <span class="plan-stat-delta">${formatSigned(d.voidgrubsSynergyPct, '%')}</span>
        </div>
      </div>
      <div class="plan-stat">
        <div class="plan-stat-lbl">Opp Comfort Attrition</div>
        <div class="plan-stat-val-row">
          <span class="plan-stat-val">${fl.oppComfortAttritionPct}%</span>
          <span class="plan-stat-delta">${formatSigned(d.oppComfortAttritionPct, '%')}</span>
        </div>
      </div>
    </div>
  `;

  // Game-by-game win probability trajectory
  const finalStep = perGameWinCurve[perGameWinCurve.length - 1];
  el.simCurveEdgePill.textContent = `${finalStep.label} Surge: ${formatSigned(finalStep.deltaPct, '%')}`;
  el.simWinCurve.innerHTML = perGameWinCurve
    .map((pt) => {
      const stdH = Math.max(18, Math.round((pt.standardWinPct / 100) * 82));
      const flH = Math.max(18, Math.round((pt.fearlessWinPct / 100) * 82));
      return `
        <div class="curve-col" title="${pt.label}: Standard ${pt.standardWinPct}% vs Fearless ${pt.fearlessWinPct}% (${formatSigned(pt.deltaPct, '%')})">
          <span class="curve-delta-lbl">${formatSigned(pt.deltaPct, '%')}</span>
          <div class="curve-pair">
            <div class="curve-bar-std" style="height: ${stdH}px;"></div>
            <div class="curve-bar-fl" style="height: ${flH}px;"></div>
          </div>
          <span class="curve-game-lbl">${pt.label} · ${pt.fearlessWinPct}%</span>
        </div>`;
    })
    .join('');

  el.simWinBrief.innerHTML = winConditionBrief.map((item) => `<li>${item}</li>`).join('');

  // Render Game 1->5 (or 1->3) Collapse Matrix Table
  const thead = `
    <thead>
      <tr>
        <th>Role Matchup (C9 vs ${state.macroReport.opponentTeam.tag})</th>
        ${matrix.gameHeaders
          .map(
            (hdr, idx) =>
              `<th class="${idx === matrix.currentGameIndex ? 'is-current-col' : ''}">${hdr}${idx === matrix.currentGameIndex ? ' · LIVE' : idx > matrix.currentGameIndex ? ' · PROJ' : ''}</th>`
          )
          .join('')}
      </tr>
    </thead>`;

  const tbody = `
    <tbody>
      ${matrix.rows
        .map((row) => {
          const cellsHtml = row.cells
            .map((cell) => {
              const isSelected =
                state.selectedMatrixCell &&
                state.selectedMatrixCell.role === cell.role &&
                state.selectedMatrixCell.gameIndex === cell.gameIndex;
              const cls = [
                'matrix-cell-btn',
                `state-${cell.collapseState}`,
                cell.isFirstCollapse ? 'first-collapse' : '',
                isSelected ? 'selected' : ''
              ]
                .filter(Boolean)
                .join(' ');
              const oppComfortTxt =
                cell.oppComfortTotal > 0 ? `${cell.oppComfortRemaining}/${cell.oppComfortTotal}` : 'N/A';
              return `
                <td>
                  <button
                    class="${cls}"
                    data-matrix-role="${cell.role}"
                    data-matrix-game="${cell.gameIndex}"
                    type="button"
                    aria-pressed="${isSelected}"
                  >
                    <div class="matrix-cell-status-row">
                      <span class="matrix-state-chip">${cell.collapseLabel}</span>
                      ${cell.isFirstCollapse ? '<span class="first-collapse-badge">1ST</span>' : ''}
                    </div>
                    <div class="matrix-counts">
                      <span>OPP ${oppComfortTxt}</span>
                      <span style="color: var(--emerald);">C9 ${cell.c9ComfortRemaining}/${cell.c9ComfortTotal}</span>
                    </div>
                    <div class="matrix-meta-sub">${cell.oppMetaRemaining}/${cell.oppMetaTotal} meta · ${cell.lockedInRoleIds.length} locked</div>
                  </button>
                </td>`;
            })
            .join('');

          return `
            <tr>
              <td class="matrix-role-cell">
                <div class="matrix-role-top">
                  <span class="matrix-role-tag">${row.role}</span>
                  ${row.isPinchTarget ? '<span class="pill pill-crimson" style="padding: 1px 7px; font-size: 9.5px;">PINCH</span>' : ''}
                </div>
                <div class="matrix-role-matchup"><strong>${row.c9PlayerName}</strong> vs ${row.oppPlayerName}</div>
              </td>
              ${cellsHtml}
            </tr>`;
        })
        .join('')}
    </tbody>`;

  el.collapseMatrixTable.innerHTML = thead + tbody;

  el.collapseMatrixTable.querySelectorAll('.matrix-cell-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.selectedMatrixCell = {
        role: btn.dataset.matrixRole,
        gameIndex: Number(btn.dataset.matrixGame)
      };
      el.collapseMatrixTable.querySelectorAll('.matrix-cell-btn').forEach((other) => {
        const active = other === btn;
        other.classList.toggle('selected', active);
        other.setAttribute('aria-pressed', String(active));
      });
      renderMatrixInspector();
    });
  });

  renderMatrixInspector();
}

function renderMacroSection() {
  const m = state.macroReport;
  el.gridSeriesIdPill.textContent = `GRID ID · ${m.seriesId}`;
  el.gankBiasPill.textContent = `Primary Bias: ${m.firstGankDistribution.primaryLane} (${m.firstGankDistribution[m.firstGankDistribution.primaryLane]}%)`;
  el.gankSplitReadout.textContent = `TOP ${m.firstGankDistribution.TOP}% · MID ${m.firstGankDistribution.MID}% · BOT ${m.firstGankDistribution.BOT}%`;

  // Calibrated Summoner's Rift pins + lane badges
  const pinsHtml = m.mapEvents
    .map((ev) => {
      const cls = `rift-pin ${ev.isOpponent ? 'opp' : 'c9'} ${ev.type === 'FIRST_GANK' ? 'pulse' : ''}`;
      const glyph = ev.type === 'FIRST_GANK' ? 'G' : ev.type === 'OBJECTIVE_SETUP' ? 'O' : 'P';
      const title = `G${ev.gameNumber} @ ${ev.minute}m · ${ev.note} (${ev.x}, ${ev.y})`;
      return `<div class="${cls}" style="left: ${ev.projected.leftPct}%; top: ${ev.projected.topPct}%;" title="${title}">${glyph}${ev.gameNumber}</div>`;
    })
    .join('');

  const zoneLabels = `
    <div class="rift-zone-label" style="left: 8%; top: 10%;">TOP JGL PROX · ${m.jungleProximity.TOP}%</div>
    <div class="rift-zone-label" style="left: 38%; top: 44%;">MID · ${m.jungleProximity.MID}%</div>
    <div class="rift-zone-label" style="right: 7%; bottom: 10%;">BOT RIVER · ${m.jungleProximity.BOT}%</div>
  `;
  el.riftOverlay.innerHTML = zoneLabels + pinsHtml;

  // Gold@15 Bar Chart
  el.goldAvgPill.textContent = `Avg ${formatGold(m.avgGoldDelta15)}`;
  const maxAbs = Math.max(1500, ...m.goldSeries.map((g) => Math.abs(g.delta)));
  el.goldChart.innerHTML = m.goldSeries
    .map((g) => {
      const pct = Math.max(16, Math.round((Math.abs(g.delta) / maxAbs) * 76));
      const isPos = g.delta >= 0;
      return `
        <div class="gold-col">
          <div class="gold-val" style="color: ${isPos ? 'var(--emerald)' : 'var(--crimson)'}">${formatGold(g.delta)}</div>
          <div class="gold-bar ${isPos ? 'pos' : 'neg'}" style="height: ${pct}%"></div>
          <div class="gold-lbl">G${g.game} (${g.side === 'blue' ? 'B' : 'R'})</div>
        </div>`;
    })
    .join('');

  // Objective Control Bars
  el.objSamplePill.textContent = `${m.gameCount} Games Parsed`;
  const objs = [
    { label: 'Voidgrubs Share', pct: m.objectiveControl.voidgrubsPct },
    { label: 'Rift Herald Control', pct: m.objectiveControl.riftHeraldPct },
    { label: 'First Dragon Rate', pct: m.objectiveControl.firstDragonPct },
    { label: 'First Tower Rate', pct: m.objectiveControl.firstTowerPct },
    { label: 'Baron Nashor Share', pct: m.objectiveControl.baronPct }
  ];
  el.objectiveBars.innerHTML = objs
    .map(
      (o) => `
      <div>
        <div class="obj-row-top">
          <span>${o.label}</span>
          <span style="font-family: var(--font-mono);">${o.pct}%</span>
        </div>
        <div class="obj-track"><div class="obj-fill" style="width: ${o.pct}%"></div></div>
      </div>`
    )
    .join('');

  // Callouts
  el.macroCallouts.innerHTML = m.callouts.map((c) => `<li>${c}</li>`).join('');
}

function renderPoolFatigue() {
  const m = state.macroReport;
  const sq = state.squeezeReport;
  const lockouts = getFearlessLockouts(state.series);
  const used = getCurrentGameUsedSet(state.series.games[state.series.currentGameIndex]);

  el.highestPressurePill.textContent = `Highest Squeeze: ${sq.summary.highestPressurePlayer} (${sq.summary.highestPressureRole})`;

  el.poolFatigueGrid.innerHTML = sq.rolePressures
    .map((rp) => {
      const profile = m.opponentPoolProfiles.find((p) => p.role === rp.role);
      const fillClass = rp.squeezeIndex >= 72 ? 'high' : rp.squeezeIndex >= 50 ? 'med' : 'low';
      const badgeClass =
        rp.pressureLevel === 'CRITICAL' || rp.pressureLevel === 'HIGH'
          ? 'pill-crimson'
          : rp.pressureLevel === 'MODERATE'
          ? 'pill-brass'
          : 'pill-emerald';

      const portraits = rp.knownPool
        .map((id) => {
          const c = CHAMPION_BY_ID[id];
          if (!c) return '';
          const isUnavailable = lockouts.has(id) || used.has(id);
          return `<div class="mini-portrait ${isUnavailable ? 'locked' : ''}" title="${c.name}${isUnavailable ? ' (Unavailable)' : ''}"><img src="${c.asset}" alt="${c.name}" /></div>`;
        })
        .join('');

      return `
        <article class="player-card">
          <div class="player-head">
            <div>
              <div class="player-name">${rp.playerName}</div>
              <div style="font-family: var(--font-mono); font-size: 10.5px; color: var(--ink-muted);">${rp.role} · KDA ${profile ? profile.kda : '--'} · CS@15 ${profile ? profile.avgCs15 : '--'}</div>
            </div>
            <span class="pill ${badgeClass}">${rp.pressureLevel}</span>
          </div>
          <div class="mini-portraits">${portraits || '<span style="font-size:11px;color:var(--ink-muted);">No comfort picks</span>'}</div>
          <div>
            <div style="display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:10.5px;margin-bottom:4px;">
              <span>Squeeze Index</span>
              <strong>${rp.squeezeIndex}/100</strong>
            </div>
            <div class="fatigue-meter"><div class="fatigue-fill ${fillClass}" style="width: ${rp.squeezeIndex}%"></div></div>
          </div>
          <div style="font-size: 11.5px; color: var(--ink-secondary); line-height: 1.38;">${rp.recommendedAction}</div>
        </article>`;
    })
    .join('');
}

// Event Listeners
function bindEvents() {
  el.presetSelect.addEventListener('change', (e) => {
    loadPreset(e.target.value, true);
    showToast(`Loaded scouting preset: ${PRO_SCOUTING_PRESETS[e.target.value].label}`);
  });

  const handleAutoFill = () => {
    state.series = autoFillCurrentGame(state.series, state.macroReport.opponentSignatureIds);
    recomputeAndRender();
    showToast(`Completed Game ${state.series.games[state.series.currentGameIndex].gameNumber} draft simulation`);
  };

  el.btnAutofill.addEventListener('click', handleAutoFill);
  el.btnHeroAutofill.addEventListener('click', () => {
    handleAutoFill();
    document.getElementById('fearless-desk').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  el.btnUndo.addEventListener('click', () => {
    state.series = undoLastAction(state.series);
    recomputeAndRender();
  });

  el.btnNextGame.addEventListener('click', () => {
    const prevNum = state.series.games[state.series.currentGameIndex].gameNumber;
    state.series = advanceToNextGame(state.series);
    const nextNum = state.series.games[state.series.currentGameIndex].gameNumber;
    recomputeAndRender();
    if (nextNum !== prevNum) {
      const lockedCount = getFearlessLockouts(state.series).size;
      showToast(`Advanced to Game ${nextNum} — ${lockedCount} champions Fearless-locked!`);
    }
  });

  el.btnReset.addEventListener('click', () => {
    state.series = resetSeries(state.series);
    recomputeAndRender();
    showToast('Reset Fearless series to Game 1');
  });

  el.fmtBo5.addEventListener('click', () => {
    state.series = createFearlessSeries({
      format: 'BO5',
      blueTeam: state.series.blueTeam,
      redTeam: state.series.redTeam
    });
    recomputeAndRender();
    showToast('Switched to BO5 Fearless Draft');
  });

  el.fmtBo3.addEventListener('click', () => {
    state.series = createFearlessSeries({
      format: 'BO3',
      blueTeam: state.series.blueTeam,
      redTeam: state.series.redTeam
    });
    recomputeAndRender();
    showToast('Switched to BO3 Fearless Draft');
  });

  el.roleTabs.querySelectorAll('.role-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      state.roleFilter = tab.dataset.role;
      el.roleTabs.querySelectorAll('.role-tab').forEach((t) => t.classList.toggle('active', t === tab));
      renderDraftDesk();
      renderRecommendations();
    });
  });

  el.champSearch.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderDraftDesk();
  });

  // Series Simulator Coaching Levers
  el.simPinchGroup.querySelectorAll('.sim-seg-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.simOptions.pinchRole = btn.dataset.pinchRole;
      state.activeScenarioId = null;
      state.selectedMatrixCell = null;
      recomputeAndRender();
      showToast(`Target pinch role set to ${btn.dataset.pinchRole}`);
    });
  });

  el.simIntensityGroup.querySelectorAll('.sim-seg-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.simOptions.banWaveIntensity = btn.dataset.intensity;
      state.activeScenarioId = null;
      recomputeAndRender();
      showToast(`Ban-wave intensity: ${btn.textContent.trim()}`);
    });
  });

  el.simVoidgrubToggle.addEventListener('click', () => {
    state.simOptions.voidgrubPriority = !state.simOptions.voidgrubPriority;
    state.activeScenarioId = null;
    recomputeAndRender();
    showToast(`6:00 Voidgrub priority ${state.simOptions.voidgrubPriority ? 'enabled' : 'disabled'}`);
  });

  // Dossier Exports
  el.btnExportMd.addEventListener('click', () => {
    const md = generateDossierMarkdown({
      series: state.series,
      macroReport: state.macroReport,
      squeezeReport: state.squeezeReport,
      simulationReport: state.simulationReport
    });
    downloadFile(`c9-draftforge-dossier-${state.macroReport.seriesId}.md`, md, 'text/markdown;charset=utf-8');
    showToast('Exported Coach Draft & Macro Dossier (.md)');
  });

  el.btnExportJson.addEventListener('click', () => {
    const json = generateDossierJson({
      series: state.series,
      macroReport: state.macroReport,
      squeezeReport: state.squeezeReport,
      simulationReport: state.simulationReport
    });
    downloadFile(`c9-draftforge-bundle-${state.macroReport.seriesId}.json`, json, 'application/json;charset=utf-8');
    showToast('Exported Coach Draft & Macro Bundle (.json)');
  });

  // Custom GRID LoL JSON Import (click + drag-and-drop)
  const importFile = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      loadGridPayload(text, { seedPartialDraft: false });
      showToast(`Imported custom GRID LoL payload: ${file.name}`);
    } catch (err) {
      showToast(`GRID import error: ${err.message}`);
    }
  };

  el.btnUploadGrid.addEventListener('click', () => el.gridFileInput.click());
  el.gridFileInput.addEventListener('change', (e) => importFile(e.target.files?.[0]));

  el.gridDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    el.gridDropzone.classList.add('dragover');
  });
  el.gridDropzone.addEventListener('dragleave', () => {
    el.gridDropzone.classList.remove('dragover');
  });
  el.gridDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    el.gridDropzone.classList.remove('dragover');
    importFile(e.dataTransfer?.files?.[0]);
  });
}

// Initialize
bindEvents();
loadPreset('c9-tl-lcs-finals', true);
