/* Stationary SignSGD illustrations: independent local draws, never a training path. */
(function (root) {
  'use strict';

  const nqm = root.NQM || (typeof module !== 'undefined' && module.exports ? require('./physics.js') : null);
  if (!nqm) return;

  const SAMPLE_BUDGET = 64;
  const MOMENTUM = 0.9;
  const DURATION_MS = 10000;
  const DEFAULT_SEED = 271828;
  const REFERENCE_UNIT = 20;

  function localState(cnr, ratio, alpha) {
    const response = nqm.response(cnr, ratio, MOMENTUM);
    return {
      response,
      probability: (1 + response) / 2,
      movement: nqm.displacement(cnr, ratio, alpha),
      updates: SAMPLE_BUDGET / ratio
    };
  }

  // h = w = 1. Independent samples from the stationary momentum marginal;
  // this is not the temporally correlated momentum recursion of a training run.
  function stationaryMomentum(cnr, ratio, z) {
    return 1 + Math.sqrt((1 - MOMENTUM) / ((1 + MOMENTUM) * cnr * ratio)) * z;
  }

  // The same seed pairs Gaussian draws across CNRs and batch settings.
  // +1 means that the SignSGD update points left, toward the minimum at w = 0.
  function sampledSigns(cnr, ratio, count = SAMPLE_BUDGET / ratio, seed = DEFAULT_SEED) {
    const random = nqm.rng(seed), signs = [];
    for (let i = 0; i < count; i++) {
      signs.push(stationaryMomentum(cnr, ratio, nqm.gaussian(random)) >= 0 ? 1 : -1);
    }
    return signs;
  }

  const api = { SAMPLE_BUDGET, MOMENTUM, DURATION_MS, localState, stationaryMomentum, sampledSigns };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') root.CnrAnimation = api;
  if (typeof document === 'undefined') return;

  const container = document.getElementById('cnr-animation');
  const svg = document.getElementById('movement-quadratic');
  const button = document.getElementById('cnr-animation-play');
  const budgetLabel = document.getElementById('cnr-animation-budget');
  const alphaInput = document.getElementById('scale-alpha');
  const batchInput = document.getElementById('scale-batch');
  if (!container || !svg || !button || !budgetLabel || !alphaInput || !batchInput) return;

  const motionPreference = root.matchMedia ? root.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const cnrs = [1, 0.001];
  let states = [], signs = [], marks = [];
  let alpha = NaN, ratio = NaN, elapsed = 0;
  let frameId = 0, lastTime = null, redrawTimer = 0;
  let wantsPlayback = false, complete = false, autoPlayed = false;
  let visible = false, lastWidth = 0;

  function hidden() { return Boolean(document.hidden); }

  function syncButton() {
    button.textContent = wantsPlayback && frameId ? 'Pause' : complete ? 'Replay' : 'Run';
    button.setAttribute('aria-label', wantsPlayback && frameId ? 'Pause local update illustration' : complete ? 'Replay local update illustration' : 'Run local update illustration');
    button.setAttribute('aria-pressed', String(Boolean(wantsPlayback && frameId)));
    container.dataset.playback = wantsPlayback && frameId ? 'running' : complete ? 'complete' : elapsed > 0 ? 'paused' : 'ready';
  }

  function cancelFrame() {
    if (frameId) root.cancelAnimationFrame(frameId);
    frameId = 0;
    lastTime = null;
  }

  function drawProgress(progress) {
    const showingSample = wantsPlayback || elapsed > 0 || complete;
    for (let i = 0; i < marks.length; i++) {
      const mark = marks[i], count = states[i].updates;
      const index = Math.min(count - 1, Math.floor(progress * count));
      mark.progress.setAttribute('transform', 'scale(' + progress + ' 1)');
      mark.sample.setAttribute('opacity', showingSample ? '1' : '0');
      if (index !== mark.index || showingSample !== mark.showingSample || complete !== mark.complete) {
        const sign = signs[i][index];
        mark.sample.dataset.sign = sign;
        mark.status.textContent = complete ? count + ' / ' + count + ' updates · finished' : showingSample ? 'Update ' + (index + 1) + ' / ' + count + ' · ' + (sign > 0 ? 'toward minimum' : 'away from minimum') : count + ' updates · independent draws';
        mark.index = index;
        mark.showingSample = showingSample;
        mark.complete = complete;
      }
      // Reveal each direction afresh from the fixed anchor, so even consistently
      // downhill samples remain visibly distinct updates rather than a static arrow.
      const phase = complete ? 1 : progress * count - index;
      const reveal = .35 + .65 * (1 - (1 - phase) ** 3);
      mark.sample.setAttribute('transform', 'scale(' + (signs[i][index] * reveal) + ' 1)');
    }
  }

  function tick(time) {
    frameId = 0;
    if (!wantsPlayback || !visible || hidden() || motionPreference.matches) {
      lastTime = null;
      syncButton();
      return;
    }
    if (lastTime !== null) elapsed = Math.min(DURATION_MS, elapsed + Math.max(0, time - lastTime));
    lastTime = time;
    if (elapsed >= DURATION_MS) {
      complete = true;
      wantsPlayback = false;
      lastTime = null;
      drawProgress(1);
      syncButton();
      return;
    }
    drawProgress(elapsed / DURATION_MS);
    frameId = root.requestAnimationFrame(tick);
  }

  function resume() {
    if (!wantsPlayback || frameId || !visible || hidden() || motionPreference.matches) return;
    lastTime = null;
    drawProgress(elapsed / DURATION_MS);
    frameId = root.requestAnimationFrame(tick);
    syncButton();
  }

  function updateVisibility(nextVisible) {
    visible = nextVisible;
    if (!visible || hidden()) {
      cancelFrame();
      syncButton();
      return;
    }
    if (!autoPlayed && !motionPreference.matches) {
      autoPlayed = true;
      wantsPlayback = true;
    }
    resume();
  }

  function checkVisibility() {
    const rect = container.getBoundingClientRect();
    updateVisibility(rect.bottom > 0 && rect.top < root.innerHeight && rect.right > 0 && rect.left < root.innerWidth);
  }

  function cssToken(style, name) { return style.getPropertyValue(name).trim() || 'currentColor'; }
  function text(x, y, value, attributes = '') {
    return '<text x="' + x + '" y="' + y + '" font-size="13" ' + attributes + '>' + value + '</text>';
  }
  function arrowPath(length) {
    const head = Math.min(6, length), halfHeight = Math.min(4, head * 0.7);
    return 'M0 0H' + (-length) + 'M' + (head - length) + ' ' + (-halfHeight) + 'L' + (-length) + ' 0L' + (head - length) + ' ' + halfHeight;
  }

  function drawGeometry() {
    const width = Math.round(svg.clientWidth || container.clientWidth || 640);
    if (width <= 0) return;
    lastWidth = width;
    const sideBySide = width >= 600, gap = sideBySide ? 28 : 40;
    const panelWidth = sideBySide ? (width - gap) / 2 : width;
    const panelHeight = sideBySide ? 268 : 224;
    const height = sideBySide ? panelHeight : panelHeight * 2 + gap;
    const style = root.getComputedStyle(document.documentElement);
    const palette = [cssToken(style, '--coral'), cssToken(style, '--teal')];
    const ink = cssToken(style, '--ink'), muted = cssToken(style, '--muted');
    const line = cssToken(style, '--line'), curve = cssToken(style, '--grid-strong');
    const surface = cssToken(style, '--surface');
    const curveBottom = sideBySide ? 146 : 120;
    const statusY = sideBySide ? 176 : 151;
    const progressY = sideBySide ? 186 : 161;
    const expectedLabelY = sideBySide ? 219 : 188;
    const referenceY = sideBySide ? 235 : 201;
    const expectedY = sideBySide ? 253 : 217;
    const left = 16, right = panelWidth - 16, innerWidth = right - left;
    const x = value => left + (value + 1.5) / 3.3 * innerWidth;
    const y = value => curveBottom - 20 * value * value;
    const anchorX = x(1), anchorY = y(1), sampleLength = Math.min(30, innerWidth / 7);
    const origin = panelWidth - 20;
    const separator = sideBySide ? '<line x1="' + (panelWidth + gap / 2) + '" x2="' + (panelWidth + gap / 2) + '" y1="8" y2="' + (height - 8) + '" stroke="' + line + '"/>' : '<line x1="16" x2="' + (width - 16) + '" y1="' + (panelHeight + gap / 2) + '" y2="' + (panelHeight + gap / 2) + '" stroke="' + line + '"/>';

    svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
    svg.style.height = height + 'px';
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-labelledby', 'cnr-animation-title cnr-animation-description');
    svg.dataset.referenceUnit = REFERENCE_UNIT;
    let markup = '<title id="cnr-animation-title">Stationary local illustrations of noisy SignSGD update directions</title><desc id="cnr-animation-description">Both quadratic bowls have curvature 1 and a fixed position w = 1. Only gradient-noise variance differs. Arrows show independent stationary momentum-sign draws, not a training trajectory. Each batch uses ' + ratio + ' samples, giving ' + SAMPLE_BUDGET / ratio + ' updates in a shared 64-sample illustration. Solid movement arrows use each direction’s batch-1 movement as a fixed reference.</desc>' + separator;

    for (let i = 0; i < cnrs.length; i++) {
      const state = states[i], color = palette[i];
      const top = sideBySide ? 0 : i * (panelHeight + gap), offset = sideBySide ? i * (panelWidth + gap) : 0;
      const clipId = 'cnr-animation-local-' + i, meanClipId = 'cnr-animation-mean-' + i;
      const probability = state.probability >= 0.999 ? '&gt;99.9%' : (100 * state.probability).toFixed(1) + '%';
      const towardOpacity = 0.18 + 0.25 * state.probability;
      const awayOpacity = 1 - state.probability < 0.005 ? 0 : 0.18 + 0.25 * (1 - state.probability);
      let bowl = '';
      for (let k = 0; k <= 80; k++) {
        const value = -1.5 + 3.3 * k / 80;
        bowl += (k ? 'L' : 'M') + x(value).toFixed(2) + ' ' + y(value).toFixed(2);
      }
      markup += '<g data-cnr-panel="' + i + '" data-cnr="' + cnrs[i] + '" data-curvature="1" data-position="1" transform="translate(' + offset + ' ' + top + ')" fill="' + ink + '">';
      markup += '<defs><clipPath id="' + clipId + '"><rect x="' + left + '" y="53" width="' + innerWidth + '" height="' + (curveBottom - 51) + '"/></clipPath><clipPath id="' + meanClipId + '"><rect x="' + left + '" y="' + (referenceY - 6) + '" width="' + innerWidth + '" height="' + (expectedY - referenceY + 12) + '"/></clipPath></defs>';
      markup += text(left, 19, (i ? 'Low' : 'High') + ' CNR · ' + cnrs[i], 'fill="' + color + '" font-weight="600" style="font-size:15px"');
      markup += text(left, 41, 'Toward minimum: ' + probability, 'fill="' + muted + '"');
      markup += '<g clip-path="url(#' + clipId + ')"><path d="' + bowl + '" fill="none" stroke="' + curve + '" stroke-width="1.8"/><line x1="' + left + '" x2="' + right + '" y1="' + curveBottom + '" y2="' + curveBottom + '" stroke="' + line + '"/>';
      markup += '<g transform="translate(' + anchorX + ' ' + anchorY + ')" fill="none" stroke="' + color + '" stroke-linecap="round" stroke-linejoin="round"><path data-toward-preview d="' + arrowPath(sampleLength) + '" stroke-width="2.2" opacity="' + towardOpacity + '"/><path data-away-preview d="' + arrowPath(sampleLength) + '" transform="scale(-1 1)" stroke-width="2.2" opacity="' + awayOpacity + '"/><path data-sampled-arrow d="' + arrowPath(sampleLength) + '" stroke-width="3" opacity="0"/></g>';
      markup += '<circle cx="' + anchorX + '" cy="' + anchorY + '" r="4" fill="' + ink + '" stroke="' + surface + '" stroke-width="1.3"/></g>';
      markup += text(anchorX - 8, anchorY - 14, 'w = 1', 'text-anchor="end" fill="' + muted + '"');
      markup += text(x(0), curveBottom + 14, 'Minimum', 'text-anchor="middle" fill="' + muted + '"');
      markup += text(left, statusY, '', 'data-update-status fill="' + muted + '"');
      markup += '<g transform="translate(' + left + ' ' + progressY + ')"><rect x="0" y="0" width="' + innerWidth + '" height="7" rx="1" fill="' + line + '"/><rect data-budget-progress x="0" y="0" width="' + innerWidth + '" height="7" fill="' + color + '" opacity=".7" transform="scale(0 1)"/>';
      for (let k = 1; k < state.updates; k++) {
        const position = innerWidth * k / state.updates;
        markup += '<line x1="' + position + '" x2="' + position + '" y1="0" y2="7" stroke="' + surface + '" stroke-width="1"/>';
      }
      markup += '</g>';
      markup += text(left, expectedLabelY, 'Expected movement / sample', 'fill="' + muted + '"');
      markup += text(right, expectedLabelY, state.movement.toFixed(2) + '×', 'text-anchor="end" fill="' + color + '" font-weight="600"');
      markup += '<g clip-path="url(#' + meanClipId + ')" fill="none" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(' + origin + ' ' + referenceY + ')" stroke="' + muted + '" stroke-width="1.5"><path data-batch-one-reference d="' + arrowPath(REFERENCE_UNIT) + '" stroke-dasharray="3 3"/></g><g transform="translate(' + origin + ' ' + expectedY + ')" stroke="' + color + '" stroke-width="2.7"><path data-expected-movement="' + state.movement + '" d="' + arrowPath(REFERENCE_UNIT * state.movement) + '"/></g></g></g>';
    }

    svg.innerHTML = markup;
    marks = [];
    const panels = svg.querySelectorAll('[data-cnr-panel]');
    for (let i = 0; i < panels.length; i++) {
      marks.push({
        progress: panels[i].querySelector('[data-budget-progress]'),
        sample: panels[i].querySelector('[data-sampled-arrow]'),
        status: panels[i].querySelector('[data-update-status]'),
        index: -1,
        showingSample: null,
        complete: null
      });
    }
    drawProgress(elapsed / DURATION_MS);
  }

  function configure() {
    const nextAlpha = +alphaInput.value, nextRatio = 2 ** +batchInput.value;
    if (nextAlpha === alpha && nextRatio === ratio) return;
    cancelFrame();
    alpha = nextAlpha;
    ratio = nextRatio;
    elapsed = 0;
    complete = false;
    states = [localState(cnrs[0], ratio, alpha), localState(cnrs[1], ratio, alpha)];
    signs = [sampledSigns(cnrs[0], ratio), sampledSigns(cnrs[1], ratio)];
    budgetLabel.textContent = SAMPLE_BUDGET + ' samples · ' + states[0].updates + ' updates';
    svg.dataset.batch = ratio;
    svg.dataset.alpha = alpha;
    drawGeometry();
    resume();
    syncButton();
  }

  function scheduleGeometry() {
    root.clearTimeout(redrawTimer);
    redrawTimer = root.setTimeout(drawGeometry, 0);
  }

  button.addEventListener('click', function () {
    autoPlayed = true;
    if (wantsPlayback) {
      wantsPlayback = false;
      cancelFrame();
      syncButton();
      return;
    }
    if (complete) elapsed = 0;
    complete = false;
    if (motionPreference.matches) {
      elapsed = DURATION_MS;
      complete = true;
      wantsPlayback = false;
      cancelFrame();
      drawProgress(1);
      syncButton();
      return;
    }
    wantsPlayback = true;
    checkVisibility();
    resume();
  });

  root.addEventListener('batchsize:scaling', configure);
  document.addEventListener('visibilitychange', function () {
    if (hidden()) {
      cancelFrame();
      syncButton();
    } else checkVisibility();
  });

  function motionChanged() {
    if (motionPreference.matches) {
      cancelFrame();
      wantsPlayback = false;
      syncButton();
    } else checkVisibility();
  }
  if (motionPreference.addEventListener) motionPreference.addEventListener('change', motionChanged);
  else if (motionPreference.addListener) motionPreference.addListener(motionChanged);

  if (root.ResizeObserver) {
    new root.ResizeObserver(function () {
      if (Math.round(svg.clientWidth || container.clientWidth) !== lastWidth) scheduleGeometry();
    }).observe(svg);
  } else root.addEventListener('resize', scheduleGeometry);
  if (root.MutationObserver) {
    new root.MutationObserver(scheduleGeometry).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }
  if (root.IntersectionObserver) {
    new root.IntersectionObserver(function (entries) {
      updateVisibility(entries[0].isIntersecting);
    }, { threshold: 0 }).observe(container);
  } else root.addEventListener('scroll', checkVisibility, { passive: true });

  configure();
  checkVisibility();
})(typeof window !== 'undefined' ? window : globalThis);
