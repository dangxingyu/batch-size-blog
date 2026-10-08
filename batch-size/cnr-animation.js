/* Simulated SignSGD paths on identical bowls: only gradient-noise variance changes. */
(function (root) {
  'use strict';
  const nqm = root.NQM;
  if (!nqm) return;
  const STEPS = 64, STEP_SIZE = .04, MOMENTUM = .9, SEED = 271828;
  const DURATION_MS = 12000;

  function trajectory(cnr, batch, options = {}) {
    const count = options.steps ?? STEPS, eta = options.stepSize ?? STEP_SIZE;
    const random = nqm.rng(options.seed ?? SEED);
    const w = [...(options.start || [1, 1])], momentum = [0, 0];
    const noiseScale = Math.sqrt(1 / (cnr * batch));
    const path = [{ w: [...w], loss: .5 * (w[0] ** 2 + w[1] ** 2) }];
    for (let step = 0; step < count; step++) {
      for (let axis = 0; axis < 2; axis++) {
        const gradient = w[axis] + noiseScale * nqm.gaussian(random);
        momentum[axis] = MOMENTUM * momentum[axis] + (1 - MOMENTUM) * gradient;
        w[axis] -= eta * Math.sign(momentum[axis]);
      }
      path.push({ w: [...w], loss: .5 * (w[0] ** 2 + w[1] ** 2) });
    }
    return path;
  }

  const api = { STEPS, STEP_SIZE, MOMENTUM, SEED, DURATION_MS, trajectory };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') root.CnrAnimation = api;
  if (typeof document === 'undefined') return;

  const container = document.getElementById('cnr-animation');
  const svg = document.getElementById('movement-quadratic');
  const play = document.getElementById('cnr-animation-play');
  const budget = document.getElementById('cnr-animation-budget');
  const choices = document.querySelectorAll('#cnr-demo-batches button');
  const caption = document.getElementById('cnr-animation-caption');
  if (!container || !svg || !play || !budget || choices.length !== 2) return;
  const preference = root.matchMedia('(prefers-reduced-motion: reduce)');
  const cnrs = [1, .001];
  let batch = 1, paths = [], marks = [], elapsed = 0, frameId = 0, lastTime = null;
  let wanted = false, complete = false, autoPlayed = false, visible = false, width = 0;
  let redrawTimer = 0;

  function token(style, name) { return style.getPropertyValue(name).trim() || 'currentColor'; }
  function text(x, y, value, attrs = '') { return '<text x="' + x + '" y="' + y + '" font-size="14" ' + attrs + '>' + value + '</text>'; }
  function project(w, mark, point) {
    const x = mark.sx * (w[0] - w[1]);
    const y = -mark.sy * (w[0] + w[1]) - mark.sz * .5 * (w[0] ** 2 + w[1] ** 2);
    point[0] = mark.cx + mark.cosTilt * x - mark.sinTilt * y;
    point[1] = mark.bottom + mark.sinTilt * x + mark.cosTilt * y;
    return point;
  }
  function coord(point) { return point[0].toFixed(2) + ' ' + point[1].toFixed(2); }

  function sync() {
    const running = Boolean(wanted && frameId);
    play.textContent = running ? 'Pause' : complete ? 'Replay' : 'Run';
    play.setAttribute('aria-pressed', String(running));
    play.setAttribute('aria-label', running ? 'Pause the moving balls' : complete ? 'Replay the moving balls' : 'Run the moving balls');
    container.dataset.playback = running ? 'running' : complete ? 'complete' : elapsed ? 'paused' : 'ready';
    for (const choice of choices) {
      const active = +choice.dataset.batch === batch;
      choice.classList.toggle('active', active);
      choice.setAttribute('aria-pressed', String(active));
    }
  }
  function cancel() {
    if (frameId) root.cancelAnimationFrame(frameId);
    frameId = 0;
    lastTime = null;
  }

  function render(progress) {
    const position = progress * STEPS, index = Math.min(STEPS - 1, Math.floor(position));
    const phase = complete ? 1 : position - index;
    const smooth = phase * phase * (3 - 2 * phase);
    const step = complete ? STEPS : Math.floor(position);
    budget.textContent = 'Step ' + step + ' / ' + STEPS;
    for (let i = 0; i < marks.length; i++) {
      const mark = marks[i], from = paths[i][index], to = paths[i][index + 1];
      mark.w[0] = from.w[0] + (to.w[0] - from.w[0]) * smooth;
      mark.w[1] = from.w[1] + (to.w[1] - from.w[1]) * smooth;
      project(mark.w, mark, mark.point);
      mark.ball.setAttribute('transform', 'translate(' + coord(mark.point) + ')');
      mark.trail.setAttribute('d', mark.prefix[index] + 'L' + coord(mark.point));
      if (mark.step !== step) {
        mark.step = step;
        const distance = Math.hypot(mark.w[0], mark.w[1]);
        mark.status.textContent = complete ? distance < .8 ? 'Closer to the bottom' : 'Still far from the bottom' : step === 0 ? 'Same starting point' : to.loss > from.loss + 1e-12 ? 'This step goes uphill' : 'This step goes downhill';
      }
    }
  }

  function tick(time) {
    frameId = 0;
    if (!wanted || !visible || document.hidden || preference.matches) { lastTime = null; sync(); return; }
    if (lastTime !== null) elapsed = Math.min(DURATION_MS, elapsed + Math.max(0, time - lastTime));
    lastTime = time;
    if (elapsed >= DURATION_MS) {
      wanted = false;
      complete = true;
      lastTime = null;
      render(1);
      sync();
      return;
    }
    render(elapsed / DURATION_MS);
    frameId = root.requestAnimationFrame(tick);
  }
  function resume() {
    if (!wanted || frameId || !visible || document.hidden || preference.matches) return;
    lastTime = null;
    frameId = root.requestAnimationFrame(tick);
    sync();
  }
  function visibility(next) {
    visible = next;
    if (!visible || document.hidden) { cancel(); sync(); return; }
    if (!autoPlayed && !preference.matches) { autoPlayed = true; wanted = true; }
    resume();
  }
  function checkVisibility() {
    const rect = container.getBoundingClientRect();
    visibility(rect.bottom > 0 && rect.top < root.innerHeight);
  }

  function geometry() {
    width = Math.round(svg.clientWidth || container.clientWidth);
    if (!width) return;
    const horizontal = width >= 600, gap = horizontal ? 28 : 26;
    const panelWidth = horizontal ? (width - gap) / 2 : width;
    const panelHeight = horizontal ? 300 : 285;
    const height = horizontal ? panelHeight : 2 * panelHeight + gap;
    const style = root.getComputedStyle(document.documentElement);
    const ink = token(style, '--ink'), muted = token(style, '--muted');
    const line = token(style, '--line'), grid = token(style, '--grid-strong');
    const surface = token(style, '--surface'), colors = [token(style, '--coral'), token(style, '--teal')];
    const radius = 2.8, tilt = -16 * Math.PI / 180;
    const cosTilt = Math.cos(tilt), sinTilt = Math.sin(tilt);
    svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
    svg.style.height = height + 'px';
    svg.setAttribute('aria-labelledby', 'cnr-ball-title cnr-ball-description');
    svg.dataset.batch = batch;
    let markup = '<title id="cnr-ball-title">Two balls find the bottom of the same valley</title><desc id="cnr-ball-description">The surfaces and starts are identical. The left ball has less gradient noise; the right has more. Select Large batch to average 64 samples per update. Both take 64 SignSGD updates of the same size. These are simulated paths on a two-dimensional quadratic, not measured training runs.</desc>';
    const separator = horizontal ? '<line x1="' + (panelWidth + gap / 2) + '" x2="' + (panelWidth + gap / 2) + '" y1="8" y2="' + (height - 8) + '" stroke="' + line + '"/>' : '<line x1="16" x2="' + (width - 16) + '" y1="' + (panelHeight + gap / 2) + '" y2="' + (panelHeight + gap / 2) + '" stroke="' + line + '"/>';
    markup += separator;
    marks = [];
    for (let i = 0; i < 2; i++) {
      const offsetX = horizontal ? i * (panelWidth + gap) : 0;
      const offsetY = horizontal ? 0 : i * (panelHeight + gap);
      const sx = (panelWidth - 64) / (2 * Math.SQRT2 * radius);
      const mark = { cx: panelWidth / 2 - 25 * radius ** 2 / 2 * sinTilt, bottom: horizontal ? 226 : 211, sx, sy: sx * .28, sz: 25, cosTilt, sinTilt, w: [1, 1], point: [0, 0], prefix: [], step: -1 };
      const point = [0, 0], value = [0, 0];
      let rim = '';
      for (let k = 0; k <= 100; k++) {
        const angle = k * Math.PI * 2 / 100;
        value[0] = radius * Math.cos(angle); value[1] = radius * Math.sin(angle);
        rim += (k ? 'L' : 'M') + coord(project(value, mark, point));
      }
      markup += '<g data-cnr-panel="' + i + '" data-cnr="' + cnrs[i] + '" data-curvature="1" transform="translate(' + offsetX + ' ' + offsetY + ')">';
      markup += text(16, 20, i ? 'More noise' : 'Less noise', 'fill="' + colors[i] + '" font-weight="600" style="font-size:16px"');
      markup += text(16, 42, i ? 'Low CNR' : 'High CNR', 'fill="' + muted + '"');
      markup += '<defs><radialGradient id="cnr-ball-' + i + '" cx="30%" cy="25%"><stop offset="0" stop-color="' + surface + '"/><stop offset=".35" stop-color="' + colors[i] + '"/><stop offset="1" stop-color="' + ink + '"/></radialGradient></defs>';
      markup += '<g data-bowl fill="none" stroke="' + grid + '" stroke-width="1"><path d="' + rim + 'Z" fill="' + colors[i] + '" fill-opacity=".07" stroke-opacity=".55"/>';
      for (let r = .4; r < radius; r += .4) {
        let ring = '';
        for (let k = 0; k <= 80; k++) {
          const angle = k * Math.PI * 2 / 80;
          value[0] = r * Math.cos(angle); value[1] = r * Math.sin(angle);
          ring += (k ? 'L' : 'M') + coord(project(value, mark, point));
        }
        markup += '<path d="' + ring + '" stroke-opacity=".3"/>';
      }
      for (let ray = 0; ray < 4; ray++) {
        const angle = ray * Math.PI / 4;
        let meridian = '';
        for (let k = 0; k <= 80; k++) {
          const r = -radius + 2 * radius * k / 80;
          value[0] = r * Math.cos(angle); value[1] = r * Math.sin(angle);
          meridian += (k ? 'L' : 'M') + coord(project(value, mark, point));
        }
        markup += '<path d="' + meridian + '" stroke-opacity=".4"/>';
      }
      markup += '</g>';
      // The goal stays visible, including when the ball arrives.
      markup += '<circle cx="' + mark.cx + '" cy="' + mark.bottom + '" r="10" fill="' + surface + '" stroke="' + ink + '" stroke-width="1.3"/><path d="M' + (mark.cx - 5) + ' ' + mark.bottom + 'H' + (mark.cx + 5) + 'M' + mark.cx + ' ' + (mark.bottom - 5) + 'V' + (mark.bottom + 5) + '" stroke="' + ink + '" stroke-width="1.5"/>';
      markup += text(mark.cx, mark.bottom + 34, 'Bottom', 'fill="' + ink + '" text-anchor="middle"');
      project(paths[i][0].w, mark, point);
      markup += '<circle cx="' + point[0] + '" cy="' + point[1] + '" r="8" fill="none" stroke="' + muted + '" stroke-dasharray="2 2"/>' + text(point[0] + 12, point[1] - 8, 'Start', 'fill="' + muted + '"');
      let prefix = '';
      for (let k = 0; k < paths[i].length; k++) {
        prefix += (k ? 'L' : 'M') + coord(project(paths[i][k].w, mark, point));
        mark.prefix.push(prefix);
      }
      markup += '<path data-ball-trail fill="none" stroke="' + colors[i] + '" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/><g data-moving-ball><ellipse cy="7" rx="8" ry="3" fill="' + ink + '" opacity=".16"/><circle r="7" fill="url(#cnr-ball-' + i + ')" stroke="' + surface + '" stroke-width="1.5"/></g>';
      markup += text(16, panelHeight - 9, '', 'data-ball-status fill="' + muted + '"') + '</g>';
      marks.push(mark);
    }
    svg.innerHTML = markup;
    const panels = svg.querySelectorAll('[data-cnr-panel]');
    for (let i = 0; i < marks.length; i++) {
      marks[i].ball = panels[i].querySelector('[data-moving-ball]');
      marks[i].trail = panels[i].querySelector('[data-ball-trail]');
      marks[i].status = panels[i].querySelector('[data-ball-status]');
    }
    render(elapsed / DURATION_MS);
  }

  function reset(nextBatch, run = false) {
    cancel(); batch = nextBatch; elapsed = 0; complete = false;
    paths = [trajectory(cnrs[0], batch), trajectory(cnrs[1], batch)];
    caption.textContent = batch === 1 ? 'Watch the noisy ball wander. Switch to Large batch to average more samples in each step.' : '';
    wanted = run;
    geometry();
    if (preference.matches) { elapsed = DURATION_MS; complete = true; wanted = false; render(1); }
    else resume();
    sync();
  }
  play.addEventListener('click', function () {
    autoPlayed = true;
    if (wanted) { wanted = false; cancel(); sync(); return; }
    if (complete) { elapsed = 0; complete = false; }
    wanted = true;
    if (preference.matches) { elapsed = DURATION_MS; complete = true; wanted = false; render(1); sync(); }
    else { checkVisibility(); resume(); }
  });
  for (const choice of choices) choice.addEventListener('click', function () {
    autoPlayed = true;
    reset(+choice.dataset.batch, true);
  });
  function redraw() { root.clearTimeout(redrawTimer); redrawTimer = root.setTimeout(geometry, 0); }
  new root.ResizeObserver(function () { if (Math.round(svg.clientWidth) !== width) redraw(); }).observe(svg);
  new root.MutationObserver(redraw).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  new root.IntersectionObserver(function (entries) { visibility(entries[0].isIntersecting); }).observe(container);
  document.addEventListener('visibilitychange', function () { if (document.hidden) { cancel(); sync(); } else checkVisibility(); });
  preference.addEventListener('change', function () {
    if (preference.matches) { cancel(); wanted = false; elapsed = DURATION_MS; complete = true; render(1); sync(); }
    else checkVisibility();
  });
  reset(1);
  checkVisibility();
})(typeof window !== 'undefined' ? window : globalThis);
