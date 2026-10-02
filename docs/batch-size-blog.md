# Batch-size research essay

The standalone article is `index.html`. The existing anchors and measured CSVs remain stable.
The article follows the manuscript: scaling-rule derivations and search, retuned
optimizer crossovers, the quadratic mechanism, directional scaling, then the
sharp-subspace intervention. The local SignSGD section is `#directional-scaling`. It uses the personal site's Fraunces and
Instrument Sans identity, with rust and green identifying scientific comparisons.
The measured experiments, noisy-quadratic illustration, and local SignSGD argument
must remain explicitly distinguished.

## Evidence and typography

The opening questions are copied verbatim from the paper’s active introduction. Main prose uses selected and lightly edited paper expressions; numerical-illustration qualifications and interactive controls remain explicit. Five large editorial pitches summarize the results and mechanism; the late-training limitation is ordinary prose. Source
revision 462dc51 is retained; an Overleaf refresh returned HTTP 503 during this
edit, so a newer revision could not be confirmed.

An underlined **Paper** link sits directly below the article title and points to
`batch-size/paper.pdf` as the submission placeholder. Replace its label and URL
with arXiv when the preprint is public.

KaTeX typesets all displayed variables from MathML source: italic scalar variables, numeric
subscripts, bold parameter vectors, and upright optimizer-group subscripts.
`B` is a batch before scaling, `B′` after scaling, and `κ = B′/B`; toy sample
budget `T = 4096` gives `K = T/B` updates. `hᵢ` is curvature and `cᵢ` is
single-example noise variance. Matrix/auxiliary learning rates and weight decays
are `η_M/η_A` and `λ_M/λ_A`; momentum uses `μ, β₁, β₂`. The hero's two
projected coordinate vectors live in a separate compass legend, outside the
landscape. Their arrows use the canvas's projection coefficients and update on
resize: positive w₁ points down-right, positive w₂ down-left. The directions are
the tangent basis at the minimum. Series legends use a line and endpoint matching
their plotted marks.

`data/scaling-rules.js` and its JSON download contain every original rule endpoint:
216 × 4 = 864 language-model runs (seed 1) and 648 × 6 = 3,888 CIFAR-5M runs
(seed 42). The sources and hashes are in that dataset and `provenance.json`.
CIFAR uses the final-ten-evaluation mean, not final loss or seed uncertainty.
The original run count excludes retuning references and partial auxiliary-decay extensions. Full-retuning baseline points are now kept in `retunedBaseline`, separately from the original rules.

The rule fan chart retains every curve and every measured point, with faint
background marks and an emphasized selected rule. Click chooses the nearest
polyline; arrow keys traverse rules ranked by mean gap. The builder resolves all
coordinate combinations to actual rules. A smooth cursor plays tested batch
changes; motion between endpoints is visual interpolation, not training history.
Hidden/offscreen pages suspend playback; reduced motion advances discretely.
The default y axis is the nonnegative loss gap to the lowest recorded loss at each batch across the original grid and available full-retuning medians. Both views use linear y axes, and both retain all 4/6 batches and all original endpoints. No negative differences are clipped and no missing retuning data are fabricated. Original retuning medians/proxy points remain separate in `retunedBaseline`. Displayed mean gaps equally weight every target batch; grid ranks and common-rule selection retain the original all-target grid-regret definition. The distinction appears beside the plot as well as in the protocol. Axis names and quantities use 17–26px type, SVG ticks render at 16px, and legend swatches match each plotted line. Common selection
minimizes equally weighted regret across all target batches, including CIFAR's
64/128-image targets. This differs from the winner at any one batch. The bound
and SDE presets use the best completion of their matrix prescription within each
grid, rather than claiming to reproduce the paper's separate comparison cohorts.

The one-dimensional SignSGD panel beside the local movement challenge reads the
paper's 27 original `μ = 0.9` tuning results. CNR is a discrete control for the
three tested conditions, 0.001/0.03/1; no unknown condition is interpolated. All
nine batch endpoints per condition remain present. The selected curve displays
`η(B′)/η(1)` and its log–log OLS exponent, 0.588/0.794/0.904. The paper's search
uses random initialization and independent Monte Carlo selection/validation.
This optimizes terminal loss across a complete finite-budget run; the neighboring
stationary frozen-coordinate calculation describes local expected movement.
Their curves and exponents must not be substituted for one another. The original
protocol, endpoint fields and hashes are included in the downloadable dataset.

## Interactions and computation

- The leaderboard and pair comparison use reported losses at four measured batches.
  Replicate counts are retained in downloadable data and omitted from the ranking labels and tooltips.
  Whiskers are observed min–max ranges. The pair chart's ±0.002-nat band is a tuning
  acceptance threshold, not a confidence interval.
- `physics.js` supplies exact diagonal quadratic moments, stable-range numerical
  learning-rate searches, reproducible trajectories, and the stationary SignSGD
  response. The interactive illustrations do not replace the paper's theorem.
- `phase-compute.js` is the shared 104-cell numerical kernel. `phase-worker.js` is
  created when the map approaches the viewport. It yields between rows and cancels
  superseded geometries. The controller also rejects obsolete replies.
- The phase-map cache holds six geometries, keyed by curvature and initial point.
  Batch/noise selection and theme changes reuse the current numerical map. A worker
  failure falls back to the same kernel, yielding on the main thread between rows.
  Busy maps show their status and disable stale cells until current results arrive.
- Initialization presets share the sandbox's state. Phase-map arrows stay in their
  row/column; Home and End select the row's endpoints. Optional letters make the map
  readable without relying on hue. Expected losses are shown beside the winner.
- The held-rank lens uses measured ranks only. Arrow keys move between available
  ranks and focus survives a chart redraw. Missing branches remain “Not run.”
- The hero caches projected trajectories and vector meshes at each drawing scale.
  Playback takes 60 seconds; large batches
  smoothly interpolate between actual optimizer states. This is a visual tween,
  not an additional optimizer update. Trajectories now continue with the same tuned learning rates beyond the 4,096-sample comparison budget. `settlingSteps` requires at least 192 updates and four comparison budgets, increasing the horizon when needed for initialization bias to fall below 0.5% of stationary variance (or a numerical tolerance in the noiseless case), with a 32,768-update cap. The original budget remains the basis of tuning, winner labels, expected-loss bars and the phase map. Its camera follows the recent paths, keeps
  the full accumulated trace as cached vectors, and
  holds the completed view until explicit Replay.
  Hero and sandbox animation loops stop when
  their view is hidden or the document loses visibility. Manual pause freezes the
  current frame. Reduced-motion startup shows a static completed hero trajectory.
- The sandbox runs for 60 seconds at the default 1× (30 seconds at 2×, 15 seconds at 4×) and uses the same extended horizon as the hero. Its loss curve marks the original 4K comparison point and reports actual processed samples. The noise button reads “Resample noise.”
- The live loss curve sits directly below the parameter sliders in the sidebar, with the actual update count on a compact line beneath it. The 4,096-sample learning-rate tuning budget is explained in the figure footnote. Expected-loss bars and the tuning explanation stay in the results row. Narrow screens stack the sidebar below the landscape; the loss plot keeps readable tick sizes and omits its middle sample tick when space is limited.
- The sandbox caches its contours and appends every newly revealed trajectory segment
  to offscreen canvases. The loss plot retains its axes and precomputes a bounded
  display curve, with the exact current update as its endpoint. Theme, size, replay,
  and experiment changes invalidate the relevant drawing caches. Full traces also
  persist as cached vector paths; automatic zoom redraws them without bitmap scaling.
- `simulation-camera.js` frames both trajectories using rolling coordinate bounds.
  Auto zoom retains the full accumulated trace as cached vectors, redrawn at the
  current scale, and emphasizes a recent window bounded at 257 states even for extended runs. It retains original parameter coordinates
  and adaptive numeric ticks. Conservative future bounds and gradual log-scale easing
  keep zoom monotonic within a run. Contours use fixed model-space levels; hero mesh
  resolutions crossfade instead of switching abruptly. The focused main view draws
  contours directly, with a 2×–3× backing resolution for clear lines and labels. The inset keeps the full path and current viewport.
  Overview restores the complete trajectory; shared URLs retain that choice.
  Reduced-motion startup selects Overview. Click-to-place uses the current scale.
- Learning-rate results are reused in a 24-entry cache keyed by batch, curvature,
  noise, and initial point; reseeding retains the same tuning. Slider inputs coalesce
  within a browser frame. Playback defaults to 2×, offers 1× and 4×, and is preserved
  in shared setup URLs. Playback speed does not change the simulated samples.

## Fonts

The original licensed font and OFL text remain checked in. The article uses a smaller
variable subset that retains the axis values used by the article. Axis normalization
changes metrics by at most 2/2000 em at the checked sizes.
Font CSS loads directly rather than through a nested CSS import.

To regenerate the checked-in fonts:

```sh
uv run --with 'fonttools[woff]' python scripts/subset-blog-font.py
```

Normal development and CI use the checked-in assets and need no Python dependency.

## Verification

```sh
node scripts/check-batch-playable.mjs
npm run build
npm test
git diff --check
```

The numerical check verifies 624 cells against an independent moment recurrence,
the original tuner, and stable step bounds. It runs the production worker in a real
worker thread, checks that rapid changes publish only the newest geometry, and
checks cancellation of the cooperative fallback.
It also checks that incremental drawing retains every physical trajectory segment,
the loss plot ends at the actual current update, replay and cache invalidation work,
playback speed advances correctly, and offscreen animation pauses. Camera checks
cover both methods at different batches, noise levels and display widths, and verify
that the recent window remains bounded and both endpoints fit within the view.
They also verify that zoom never reverses, adjacent frames change gradually, and
the hero holds its completed frame until Replay.

Browser checks should cover 320/390 px phones, a tablet, and desktop layouts in both
themes; menu navigation and Escape; phase-map controls and cache reuse; keyboard
chart selection; animation pause/resume and leaving the viewport. Also exercise a
temporary page with `worker-src 'none'` to verify the browser fallback, and a test
fixture with reduced-motion preference enabled to verify its static startup.
Temporary fixtures must be removed before building or publishing.

Run Lighthouse against the final page. A successful build alone does not establish
readable labels, scientific correctness, or correct interactive behavior. After an
authorized push, verify the GitHub Pages run and the deployed article and assets.

The scaling-rule workspace places the curve atlas beside the complete rule builder and loss readouts on desktop. The Presets button group sits directly above Build a rule in the inspector, so selecting a preset and editing its coordinates share one panel. The retention-preserving coefficient option uses the compact label EMA, with its exact scaling shown in the recipe below. Selecting a curve synchronizes every coordinate; changing a coordinate immediately highlights its measured rule. On screens at or below 1000px, the compact chart stays visible while the builder and results scroll underneath. Narrow raw-loss plots retain all endpoints but label only a subset of batch ticks to prevent overlap. Repeated figure-category labels have been removed.

MathML remains the formula source. `math-render.js` converts the small MathML vocabulary used by the essay to TeX, then uses locally hosted KaTeX 0.19.0 for both static prose and dynamic controls. KaTeX HTML supplies consistent radicals, fractions, and scripts; its parallel MathML output preserves accessibility. KaTeX 0.19.0 supplies the vendored minified JS/CSS and WOFF2 fonts in `vendor/katex/`, with the upstream license. For LM retention coefficients, the inspector shows ρ = 2, 4, or 8, and ρ ≈ 16 at 2M. The exact update ratio 13,000/813 remains in the measurement protocol and source data.

The directional figures label their normalized quantities directly: tuned learning rate relative to batch 1, and local expected movement per sample relative to batch 1. Learning-rate multipliers remain on a log axis; movement multipliers use a linear axis with a labelled 1× reference and round ticks. KaTeX uses explicit 24px quantity formulas (22px on narrow screens), 20px x-axis notation, and 17px legend formulas, with the KaTeX root inheriting those sizes. Momentum, initialization, search resolution and repeated CNR definitions live in the protocols. The scaling prescription stays beside its exponent control.

The scaling-rule atlas starts with a linear detail range that fits the selected rule and the best-loss baseline over all batches. Its small linear overview sits below the sticky main figure on mobile and shows the full range of every measured run. The shaded band marks the main plot's vertical range. The toolbar reports the selected rule's loss percentile at the current batch: the percentage of original-grid rules with loss at or below its loss, including ties. Selection and batch changes update this statistic; it does not alter either plot's range. Either plot supports curve selection and keyboard navigation, and Full range shows every original endpoint in the main plot. Reset restores the current dataset’s best common rule and Detail range, retaining the chosen batch and loss view and pausing playback. Detail clips offscreen geometry rather than changing data or placing outliers on the boundary. Batch playback takes 4.5 seconds between measurements and holds each endpoint for two seconds, including the first and last. Its axis stays fixed throughout playback; the Best at this batch preset first fits the full curves of all batch-winning rules, then changes selection without rescaling the axis. Visibility pauses retain elapsed transition time. `node scripts/check-scaling-rule-view.mjs` verifies all rule/view combinations, selected-point percentiles, full-range retention and the production animation clock.

The no-scaling note reports original LLM-grid ranks by mean regret over 256K–2M: no scaling is 12th of 216, the original-grid counterpart of the paper's bound-minimization recipe is 22nd, and its SDE counterpart is 160th. These use the auxiliary learning-rate and moment choices in the paper's `scripts/plot_muonw_transfer_comparison.py`, with auxiliary weight decay fixed as in the original grid. The paper's plotted SDE curve instead includes a rerun with scaled auxiliary weight decay. They differ from the interactive Bound/SDE presets, which select each Muon prescription's best auxiliary completion (11th and 104th, respectively). The note recommends no scaling as a baseline to validate, rather than claiming it beats every theoretical completion or transfers across settings.

The three prescription cards compare SDE matching, bound minimization, and Power Lines (fixed matrix learning rate and linearly scaled matrix weight decay). Fixed Muon momentum is our extension of the Power Lines parameter-averaging identity. The auxiliary AdamW weight-decay note refers specifically to the additional scaling sweep at 1M/2M tokens. The rule builder displays each coordinate's formula next to its selector; only the shared LLM retention exponent remains below the rows.

The SignSGD panel retains all 27 original measurements. Shape-preserving cubic Hermite curves pass through those endpoints in log-log coordinates. A continuous CNR slider geometrically blends normalized learning-rate ratios between adjacent measured conditions and linearly blends their OLS exponents in log CNR. Intermediate curves show “Interpolated” and no measurement dots. The three presets restore original measured conditions; the downloadable data remain unchanged.

All rule curves include the shared reference configuration: 128K tokens for the language model and 256 images for CIFAR-5M. Its raw loss is `referenceLoss`, and its displayed gap is zero. It is a single shared run, excluded from target-batch controls, rankings, averages and the 864/3,888 transfer-run counts. CIFAR places it between the two smaller and four larger tested batches.

## Batch-size branching figure

`branching.js` renders the paper's 53 base-run points and 2,273 branch-loss measurements from the original `figure6_data` CSVs. All twelve checkpoints are selectable; the focused view shares the existing anchor and held-subspace controls. Raw measurements are connected without smoothing or extrapolation. Checkpoint 12,000 ends at recorded step 12,992. Curve evaluations use 1M held-out tokens; the endpoint widget retains its separate 10.5M-token evaluations. Data hashes and evaluation settings live in `data/branch-curves.json`; original CSV downloads are preserved. The protocol diagram distinguishes control, fully scaled, and held-subspace updates. Directional CBS is explained as a conceptual diminishing-return threshold; no numerical per-direction CBS is claimed.

The SDE and bound headers link to Malladi et al. (NeurIPS 2022) and Shulgin et al. (arXiv 2603.15958), respectively, as framework sources. Muon-specific candidates remain the accompanying paper's derivations.
