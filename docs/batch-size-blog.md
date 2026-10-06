# Batch-size research essay

The standalone article is `index.html`. The existing anchors and measured CSVs remain stable.
The article follows the manuscript: scaling-rule derivations and search, retuned
optimizer crossovers, the quadratic mechanism, directional scaling, then the
sharp-subspace intervention. The local SignSGD section is `#directional-scaling`. It uses the Apple
system sans-serif stack, with platform fallbacks, and a white, UC San Diego navy (#182B49), and
yellow (#FFCD00) reading theme. Headings, prose, controls, SVG labels, and canvas labels share the
system font; mathematical notation retains KaTeX's specialized typesetting fonts.
Scientific comparisons retain distinct series colors. The final `ucsd-theme.css` layer supplies
shared widget colors and high-contrast navy dark mode. Light mode is the default; a saved dark-mode
choice is restored before stylesheets load, including the browser theme color. The root page
background and body share the theme color. The existing theme toggle
persists choices and redraws the figures. Theme initialization is checked for both saved modes and
blocked storage.
The blog uses “Muon” as the reader-facing name for the paper’s MuonW–AdamW setup;
source filenames, measurements, and explicit auxiliary AdamW protocol details retain their original names.
The measured experiments, noisy-quadratic illustration, and local SignSGD argument
must remain explicitly distinguished.

## Evidence and typography

Retained figure explanations, controls, legends, metric labels, and protocol text use 16px on desktop and 15px on phones. Repeated summaries and bookkeeping labels are omitted. Explanatory mechanism text remains below the section titles at the same reading size; duplicate numbered claim headings are omitted. The local High/Low CNR quadratic panels have a wider vertical separation, and the checkpoint close-up includes a Go back button that restores the across-training view.

The opening uses the Technical note treatment: a compact, left-aligned sans-serif title below a
short yellow accent, followed by the byline from Overleaf revision
0374df8 (`arxiv.tex`): Xingyu Dang†, Kaiyue Wen†, and Sadhika Malladi; † denotes equal contribution.
The byline uses a horizontal three-column author list, with a smaller affiliation and clickable
email beneath each name; it wraps on narrow screens and uses theme-aware colors. Author contact
details were verified against public profiles because the Overleaf block still carries placeholder
comments: Xingyu Dang — Princeton University, xd7812@cs.princeton.edu
(https://www.cs.princeton.edu/people/grad); Kaiyue Wen — Stanford University, kaiyuew@stanford.edu
(https://profiles.stanford.edu/kaiyue-wen); Sadhika Malladi — University of California, San Diego,
samalladi@ucsd.edu (https://sadhikamalladi.github.io/index.html).
The introduction proceeds from scaling-rule motivation to Q1, then optimizer-comparison motivation
to Q2. The questions retain their exact wording from the paper and use compact navy callouts with
centered, balanced white text and a small 32px-wide yellow Q1/Q2 pennant overlapping the top edge. They fill a dedicated `question-row` that matches the 1080px content column and the TL;DR box.
Both edges align with the text column, including on phones.
Prose uses natural line wrapping so the apparent text measure matches the callout centering frame. Q1 appears only in the opening; the scaling-rules section proceeds directly to the methods and experiment. The Q2 callout is also used in the optimizer-comparison section. Yellow is reserved
for the title accent, questions, and small interaction accents.
The TL;DR is a compact numbered list of five findings in a lightly shaded, theme-aware box. Each
finding links directly to its relevant interactive figure: scaling-rule search, optimizer rankings,
SignSGD scaling, the noisy-quadratic geometry lab, and directional branching. The top contains the title, byline, one Read the paper button with the theme toggle beside it, and prose: no chapter navigation or repeated headline.
The SignSGD and SGD/Newton entries identify their toy setting; the intervention entry identifies
language-model pretraining and the local penalty. Main prose matches the author names at 16px on desktop and 15px on
phones, at a 1.65 line height. The title, authors, introductory text, TL;DR, section headings,
prose, closing, footer, scaling-rule candidates, and figure containers share one centered 1080px
content column. Text remains left aligned. The shared column has 32px outer gutters
(24px on phones, 18px below 370px) and contracts to fit narrower screens. Section headings use 22px and research claims
17px on desktop, with 20px/16px on phones. Sections use 40px top spacing, reduced to 32px on phones.
The content width follows the requested alignment with the figures; typography and spacing stay consistent.
In the optimizer setup, emphasis marks independent
retuning at every batch rather than the batch-size range.

The article has no footnotes currently. If needed later, use traditional footnotes rather than margin notes.

The opening questions are copied verbatim from the paper’s active introduction. The scaling-rules section opens with two sentences of motivation and a third introducing Muon as the testbed, then defines the Muon update and presents the three candidate rules without an additional subheading, a brief experiment description using “hundreds of scaling rules,” the interactive figure, and its main finding. Exact grid sizes and the distinction between the paper’s comparison recipes and the figure’s best-completion presets remain in the figure and measurement notes. Main prose is written for a general audience around each playable: what the figure shows, how to use its controls, and what the result means. Short verbal formulas explain scaling presets, optimizer updates, loss decomposition, and branch penalties. Formal derivations, experiment settings, and qualifications stay in collapsed details. Candidate derivations appears fully expanded before the short experiment description and Scaling-rule search. Each section opens with one larger, unnumbered heading; duplicate numbered claim headings are removed. Explanatory text and the late-training limitation remain ordinary prose. The original measurements retain source revision 462dc51. Directional curves and endpoints use the complete latest Overleaf CSV export at revision 83b7052, including the rerun smaller top-k branches at even checkpoints.

The Read the paper button beneath the title/byline and the scaling-rule section link to
`batch-size/paper.pdf` as the submission placeholder.
Replace that destination with arXiv when the preprint is public.

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

The rule fan chart retains every curve and every scale-up measurement, with faint
background marks and an emphasized selected rule. Click chooses the nearest
polyline; arrow keys traverse rules ranked by mean gap. The builder resolves all
coordinate combinations to actual rules. A smooth cursor plays tested batch
changes; motion between endpoints is visual interpolation, not training history.
Hidden/offscreen pages suspend playback; reduced motion advances discretely.
The default y axis is validation loss; the optional loss-gap view is the nonnegative loss gap to the lowest recorded loss at each batch across the original grid and available full-retuning medians. Both views use linear y axes and show the shared reference followed by four larger target batches. CIFAR starts at 256 images and shows 512/1024/2048/4096; the 64/128-image scale-down runs remain in the original downloadable data. The derived display cohort recomputes common-rule selection, grid ranks, preset completions, mean gaps, and measured-run counts over just the larger targets (864 LLM runs; 2,592 CIFAR runs). The shared reference is excluded from these statistics. Original data and paper ranks are never mutated. CIFAR’s scale-up common winner uses square-root matrix LR, fixed auxiliary LR and weight decays, fixed Muon momentum, EMA first-moment retention and fixed second-moment retention; the collapsed measurement notes distinguish this from the paper’s six-target winner. No negative differences are clipped and no missing retuning data are fabricated. This differs from the winner at any one batch. The bound
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

The additional recovery-versus-rank plot and checkpoint recovery-card grid are removed. Checkpoint and subspace selection remain in the main curve/penalty comparison; all measurements and downloads are preserved.

The 3D and 2D landscapes are projections of the same geometry-lab run. The icon view toggle preserves the current paths, seed, batch, curvature, starting point, playback progress, and live loss. Shared Run/Reset/Resample/Speed and camera controls apply to both views, and the 3D surface rebuilds when curvature changes. Both views end at 4K processed samples. Tabler cube/square icons are vendored with their MIT license.

The SignSGD chart uses κ = B′/B and η(κB)/η(B). Linear and square-root guides use rust and teal; the selected measured curve and fitted exponent share a color blended between them according to the exponent. Only the chosen CNR curve is drawn; this color interpolation never interpolates measurement values. The local movement panel uses one exponent slider with adjacent preset choices. Its batch-1 arrow has a fixed length across all slider settings, and the duplicated exponent rail and compromise button are removed.

The branch curves and vertical endpoint-penalty bars share one comparison layout, with bars to the right on desktop. Selected top-k bars use the same color as their curve. The legend groups reference/full/random branches in one aligned row and the five top-k choices in a second row. Selection uses a subtle background and border; missing measurements remain disabled and labeled. Mobile stacks the views. All endpoint values and missing states retain the original measured data.

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
- The geometry experiment and winner map share one bordered component. Shared batch, curvature, noise and starting-point controls sit above the two views; map tiles load the same experiment. Desktop shows paths and map side by side, followed by one shared selected-experiment readout and playback toolbar, with live and expected losses below. Narrow layouts stack the views and keep map scrolling inside its container.
- Initialization presets share the sandbox's state. Phase-map arrows stay in their
  row/column; Home and End select the row's endpoints. Optional letters make the map
  readable without relying on hue. Expected losses are shown beside the winner.
- The direction selector and checkpoint slider control the branch comparison. Missing branches remain “Not run.”
- The 3D projection caches trajectories and vector meshes at each drawing scale.
  Playback takes 60 seconds; large batches
  smoothly interpolate between actual optimizer states. This is a visual tween,
  not an additional optimizer update. Both optimizer trajectories stop at 4,096 processed samples, matching the tuning budget, winner labels, expected-loss bars, and phase map. Its camera follows the recent paths, keeps
  the full accumulated trace as cached vectors, and
  holds the completed view until explicit Replay.
  The shared animation loop stops when
  their view is hidden or the document loses visibility. Manual pause freezes the
  current frame. Reduced-motion startup shows a static completed hero trajectory.
- The sandbox runs for 60 seconds at the default 1× (30 seconds at 2×, 15 seconds at 4×). Its paths and live loss end at the 4,096-sample tuning budget; the x axis ends at 4K, with no continuation beyond that point. The 3D hero uses the same 4K endpoint. The noise button reads “Resample noise.”
- The live loss figure sits beneath the parameter sliders at the bottom right of the landscape. It always shows the two sampled paths, synchronized with playback, with a fixed logarithmic range containing their extrema. There are no expected-loss curve overlays or visibility toggle. The x axis ends at the 4K tuning budget; expected-loss bars stay in the results row. On narrow screens the controls and live chart stack below the landscape.
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

The scaling-rule workspace places the curve atlas beside the complete rule builder and loss readouts on desktop. The Presets button group sits directly above Build a rule in the inspector, so selecting a preset and editing its coordinates share one panel. The retention-preserving coefficient option uses the compact label EMA, with its exact scaling shown in the recipe below. Selecting a curve synchronizes every coordinate; changing a coordinate immediately highlights its measured rule. On tablets the compact chart stays visible while the builder and results scroll underneath; on phones up to 760px it stays in normal flow so it cannot cover the batch controls. Narrow raw-loss plots retain all endpoints but label only a subset of batch ticks to prevent overlap. Repeated figure-category labels have been removed.

MathML remains the formula source. `math-render.js` converts the small MathML vocabulary used by the essay to TeX, then uses locally hosted KaTeX 0.19.0 for both static prose and dynamic controls. KaTeX HTML supplies consistent radicals, fractions, and scripts; its parallel MathML output preserves accessibility. KaTeX 0.19.0 supplies the vendored minified JS/CSS and WOFF2 fonts in `vendor/katex/`, with the upstream license. For LM retention coefficients, the inspector shows κ = 2, 4, or 8, and κ ≈ 16 at 2M. The exact update ratio 13,000/813 remains in the measurement protocol and source data.

The directional figures label their normalized quantities directly: tuned learning rate relative to batch 1, and local expected movement per sample relative to batch 1. Learning-rate multipliers remain on a log axis; movement multipliers use a linear axis with a labelled 1× reference and round ticks. KaTeX uses explicit 24px quantity formulas (22px on narrow screens), 20px x-axis notation, and 17px legend formulas, with the KaTeX root inheriting those sizes. Momentum, initialization, search resolution and repeated CNR definitions live in the protocols. The scaling prescription stays beside its exponent control.

The scaling-rule atlas defaults to Validation loss, with Loss gap available as the second view. A brief takeaway and exploration guide replace the measurement-count banner. It starts with a linear Detail range that fits the selected rule and the best-loss baseline over all batches. The toolbar reports the selected rule's loss rank at the current batch as x / N. Rank 1 is best, and equal losses share a rank. Selection and manual Target batch changes update this statistic without changing the measured values. The main plot supports curve selection and keyboard navigation; Full range shows every original endpoint. Reset restores the current dataset's best common rule and Detail range, retaining the chosen batch and loss view. Detail clips offscreen geometry rather than changing data or placing outliers on the boundary. The overview plot and automatic batch playback have been removed. `node scripts/check-scaling-rule-view.mjs` verifies all rule/view combinations, selected-point loss ranks, and full-range retention.

The no-scaling note reports original LLM-grid ranks by mean regret over 256K–2M: no scaling is 12th of 216, the original-grid counterpart of the paper's bound-minimization recipe is 22nd, and its SDE counterpart is 160th. These use the auxiliary learning-rate and moment choices in the paper's `scripts/plot_muonw_transfer_comparison.py`, with auxiliary weight decay fixed as in the original grid. The paper's plotted SDE curve instead includes a rerun with scaled auxiliary weight decay. They differ from the interactive Bound/SDE presets, which select each Muon prescription's best auxiliary completion (11th and 104th, respectively). The note recommends no scaling as a baseline to validate, rather than claiming it beats every theoretical completion or transfers across settings.

The three prescription cards compare SDE matching, bound minimization, and Power Lines (fixed matrix learning rate and linearly scaled matrix weight decay). Fixed Muon momentum is our extension of the Power Lines parameter-averaging identity. The auxiliary AdamW weight-decay note refers specifically to the additional scaling sweep at 1M/2M tokens. The rule builder displays each coordinate's formula next to its selector; only the shared LLM retention exponent remains below the rows.

The SignSGD panel has 22 actually tuned CNR conditions and 16 batch sizes, retaining all 27 original paper measurements and their original fitted exponents. There are 325 additional toy-model tuning cells. `tune-signsgd-dense.py` generates shared PCG64 Gaussian arrays and calls the vectorized C++ recursion. Searches use 121 broad candidates with 512 paths, three refined neighborhoods, 2,048 fresh selection paths, and eight held-out groups of 1,024 paths for the chosen rate. Supplemental batches 3/6/12/24/48/96/192 use floor(4,096/B) updates. The slider snaps to tuned conditions and the chart connects actual points without CNR interpolation or splines. Dense data identify original versus supplemental sources per point. The protocol records seeds, actual sample counts, hashes, and search stages. Full computation initially took 6.3 seconds with 12 workers on the local Mac; a complete parallel rerun took 3.094 seconds and reproduced all 352 endpoints exactly. The 22 CNRs comprise two endpoints and 20 interior conditions. Three NumPy reference cells matched C++ to within 1.4e-16. Original downloads remain unchanged.

All rule curves include the shared reference configuration: 128K tokens for the language model and 256 images for CIFAR-5M. Its raw loss is `referenceLoss`, and its displayed gap is zero. It is a single shared run, excluded from target-batch controls, rankings, averages and the 864/3,888 transfer-run counts. CIFAR places it at the left edge before the four larger tested batches; smaller batches are available only in the complete download.

## Batch-size branching figure

`branching.js` preserves all 53 base-run points and 3,061 downloadable branch-loss measurements from the complete `figure6_data` CSV export at revision 83b7052. The plot displays all twelve checkpoints from 1K to 12K, with every available top-16/64/128/256/768 curve, fully scaled branch, and random control. This is 93 measured branch curves and 93 independently evaluated validation endpoints. The 24 rerun smaller top-k branches at even checkpoints now have their original loss trajectories and absolute validation losses, replacing the earlier rounded-table supplements. Checkpoints 1K–11K continue for 1,024 base steps; the 12K checkpoint continues for 992 steps. No curve or absolute validation loss is reconstructed from endpoint penalties. Top-128 remains absent at 7K/9K/11K. Legend buttons emphasize the selected rank and fade the other curves: full-opacity selection, 20% for other ranks at that checkpoint, 10% for other checkpoints, and a muted control reference. If the selected rank was not run, the available curves retain their normal comparison visibility. Checkpoint controls and endpoint summaries share all twelve anchors. Measurements are connected without smoothing or extrapolation. Curve evaluations use 1M held-out tokens; the endpoint widget retains its separate 10.5M-token evaluations. Data hashes and settings live in `data/branch-curves.json`; original CSV downloads are preserved. The rejected protocol schematic is removed. Directional CBS remains a conceptual diminishing-return threshold, without a numerical per-direction estimate.

The SDE and bound headers link to Malladi et al. (NeurIPS 2022) and Shulgin et al. (arXiv 2603.15958), respectively, as framework sources. Muon-specific candidates remain the accompanying paper's derivations.

## Integrated optimizer comparison

Pairwise comparison sits below the optimizer-ranking plot and batch control as a compact horizontal strip. Its three columns hold selectors, the 176px comparison chart, and the verdict; tablet and phone widths reflow them. Keeping it outside the leaderboard prevents the right sidebar from stretching the main plot row and creating a large blank area. Its selectors, norm-control state, and original four differences are preserved. The selected batch gets a larger point matching the main figure. The ±0.002-nat band is explained in a collapsed measurement note. HTML labels provide the loss difference and optimizer order without fitting a long title into the small SVG.

## Noisy-quadratic exposition

The mechanism passage uses only three displayed formulas: the actual two-dimensional playground loss and the separate SGD/Newton updates. It defines the minibatch gradient, zero-mean Gaussian noise, batch size, and learning rate in prose. Remaining initialization error and stochastic-update noise are explained in words; the auxiliary step-size/contraction symbols and full expected-loss derivations are removed from the passage and its folded protocol. The numerical implementation and tuning remain unchanged. The actual playground has unit curvature in the noisy direction, so the text does not claim Newton necessarily amplifies that coordinate’s noise. The paper’s existence theorem remains separate from the illustration. Writing follows wenhaochai writing/style’s general rules.

The directional section defines movement as mean signed parameter displacement per processed sample, D(B) = -eta(B) E[sign(m)] / B, with frozen w=1 and stationary exponentially averaged gradients at mu=0.9. It displays the ratio D(kappa B)/D(B) to reference B=1, not the expected absolute step length. The y maximum follows the actual curve peak with six percent headroom rather than rounding a peak of one up to 1.5; labels remain explicit multiples of the reference. Both panels have shorter title/axis header gaps.

Expected-loss bars retain a neutral full-length track and a small origin marker when a segment is below pixel resolution. Segment widths remain proportional to the actual two losses. Nonzero tiny values use scientific notation; floating-point zero is shown as approximately zero instead of 0.00. No artificial lower bound is added to the loss.


## Screenshot feedback pass (October 2026)

- The opening is now a text-led introduction. The mechanism chapter contains a single geometry experiment with switchable 3D and 2D projections.
- Scaling-rule search starts with validation loss. Background measurements use
  an ochre line in both themes. “Best at this batch” lives directly below the batch
  slider and follows batch changes, including playback. Power Lines now also has
  a selectable preset, using the best grid completion of its matrix prescription.
  Per-coordinate formulas remain next to their selectors.
- Optimizer rankings and pair comparisons use the same axis frame, typography,
  batch notation, endpoint marks, and nat units as scaling-rule search. Rankings
  also offer a loss-gap view, referenced to the best of all five optimizers at each
  measured batch. Observed min–max whiskers remain visible, even when they extend
  below the median-loss reference. No downloadable measurement has changed.
- The quadratic loss chart shows the live sampled run at the bottom right, with
  no expected-loss curve overlay. Curves retain their exact current endpoint and
  share a fixed range containing all generated losses. On the log axis, zero or
  underflowed losses use the numerical floor 1e-15. A dashed vertical marker
  ends at the 4,096-sample comparison budget.
- The directional narrative defines CNR and expected movement per sample, with
  the shared learning-rate rule in a simple pseudo formula. Detailed update and
  stationary-sign derivations remain in the protocol drawers. Beside the local
  movement chart, two quadratic slices display the same high/low-CNR ratios.
  Each direction is normalized to its own batch-1 movement; a shared adaptive
  arrow scale keeps both visible. These are frozen-coordinate local increments,
  not training trajectories or new data.

The SignSGD learning-rate panel uses a wide chart with the CNR slider and fitted exponent in a compact sidebar. Its SVG height adapts to its rendered width (190–260px), retaining all independently tuned dots and the same log axes. Narrow layouts stack the chart and settings.
The local movement panel aligns the quadratic illustration and response chart above one shared controls row. Direction readouts use the same method colors; one exponent slider and its preset buttons share a single control group. Both panels preserve the existing definitions and numerical results.

The geometry playground keeps playback actions and progress in a horizontal strip beside the starting-direction presets, directly beneath the batch, curvature, and noise sliders. The toolbar stacks below the presets on narrow screens; the idle action reads “Run.”

## Narrative style

Standalone prose and research questions use the same content width as the figures, with the original section and pitch alignment. Descriptions inside visualization grids fill their own panels; their surrounding grid determines the available width.

The rewritten scaling-rule chapter is the reference for the rest of the main prose. Each section opens with one or two sentences of motivation, followed by a compact setup. Keep findings brief and avoid repeating results and protocol details already shown in the widgets. Use the researchers’ voice and retain the conditions needed to interpret each claim. Control labels and preset descriptions carry the interaction guidance.

The curvature-and-noise chapter explicitly introduces the noisy quadratic model (NQM): a quadratic loss paired with noisy gradient estimates. Its two-dimensional SGD/Newton example is distinguished from the language-model experiments.

Rankings, the quadratic mechanism, directional scaling, the intervention, and the conclusion follow this structure. Keep expected loss at the 4,096-sample budget distinct from the single sampled trajectory at that same budget. The directional calculation freezes the parameter; the intervention affects matrix directions and does not establish CNR as their predictor. The 59.5% maximum refers to all measured checkpoints, while the displayed 5K checkpoint gives 59.3%. Detailed protocols retain their technical granularity.

The Muon update preceding the candidate rules follows `src/preliminaries.tex` in the paper: normalized
momentum, a Nesterov blend with mixing weight equal to momentum retention, Newton–Schulz
orthogonalization with fixed matrix-shape rescaling, and decoupled weight decay. The blog names the
orthogonalized direction U_t to keep the three steps short. It defines W_t, G_t, M_t, U_t, μ, η_M,
λ_M, initialization M_0 = 0, and the matrix-group subscript before the scaling formulas. Auxiliary
parameters still use AdamW. The update and its notation share a 50/50 panel: a “Muon optimizer” label above three equations on the left and a compact
definition list on the right, including the weight and minibatch-gradient symbols. The panel uses theme-aware colors and stacks below 900px. Definitions
do not occupy a separate main-text paragraph. This exposition does not change any interactive
widget or measured data.

The October prose pass removes the scaling-result paragraph and repeated Q2 in the rankings section. The rest of the article uses shorter motivations and experiment descriptions. The quadratic model, SignSGD update and CNR, and branch penalty/recovery definitions use the same two-column equation-and-notation treatment as Muon. These panels inherit theme colors and stack below 900px. Widget markup, protocol drawers, controls, and data are unchanged. The intervention summary retains the local scope, random-subspace comparison, and loss of benefit late in training.
