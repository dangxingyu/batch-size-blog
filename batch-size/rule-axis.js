/* Linear loss axes and the selected point's percentile among tested rules. */
'use strict';
(function () {
  function domain(low, high, zero, padding) {
    const span = Math.max(high - low, .00001);
    const lower = zero ? 0 : low - span * .05;
    const upper = zero ? Math.max(.01, high * (1 + padding)) : high + span * .05;
    const rough = (upper - lower) / 4;
    const unit = 10 ** Math.floor(Math.log10(rough));
    const fraction = rough / unit;
    const step = (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * unit;
    const bottom = zero ? 0 : Math.floor(lower / step) * step;
    const top = Math.ceil(upper / step) * step;
    return { bottom, top, step, precision: Math.max(0, -Math.floor(Math.log10(step))) };
  }
  function domains(values, references, selected, zero) {
    const all = [...values, ...references];
    const focused = [...selected, ...references];
    const full = domain(Math.min(...all), Math.max(...all), zero, .04);
    const detail = domain(Math.min(...focused), Math.max(...focused), zero, .15);
    detail.bottom = Math.max(detail.bottom, full.bottom);
    detail.top = Math.min(detail.top, full.top);
    return { full, detail };
  }
  function percentileRank(values, value) {
    return 100 * values.filter(v=>v<=value).length / values.length;
  }
  window.RuleAtlasAxis = { domains, percentileRank };
})();
