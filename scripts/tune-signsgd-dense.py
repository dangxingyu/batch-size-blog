#!/usr/bin/env python3
"""Compute real extra SignSGD tuning cells for the CNR playable.

Usage: python3 scripts/tune-signsgd-dense.py
Requires NumPy and a C++17 compiler. The original paper's JSON is read-only.
Tuning uses the paper's 121-rate broad search, 512 coarse paths, three separated
refined neighborhoods, 2,048 independent selection paths, and eight held-out
groups of 1,024 paths. Unlike the paper, only the selected rate is evaluated on
held-out paths; near5 intervals therefore describe the *selection* profile.
Additional batches run floor(4096/B) updates and report actual sample counts.
"""
import csv
import hashlib
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import time

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'batch-size/data'
ORIGINAL = DATA / 'signsgd-cnr.json'
MAIN_BATCHES = [1, 2, 4, 8, 16, 32, 64, 128, 256]
EXTRA_BATCHES = [3, 6, 12, 24, 48, 96, 192]
BATCHES = sorted(MAIN_BATCHES + EXTRA_BATCHES)
CNRS = sorted(set(np.geomspace(.001, 1, 21).tolist() + [.03]))
FIELDS = ['cnr', 'batch', 'updates', 'processedSamples', 'eta', 'loss', 'loss_se',
          'coarse_loss', 'selection_loss', 'selection_near5_eta_min',
          'selection_near5_eta_max', 'refined_candidates']
COARSE_PATHS, SELECTION_PATHS, HELDOUT_PATHS, HELDOUT_GROUPS = 512, 2048, 1024, 8


def write_draws(path, paths, updates, seed):
    """File order exactly matches the initialization and per-update NumPy draws."""
    rng = np.random.default_rng(seed)
    with path.open('wb') as f:
        rng.standard_normal((paths,)).astype('<f8').tofile(f)
        for start in range(0, updates, 128):
            rng.standard_normal((min(128, updates-start), paths)).astype('<f8').tofile(f)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    original = json.loads(ORIGINAL.read_text())
    original_hash = sha(ORIGINAL)
    compiler = os.environ.get('CXX', shutil.which('clang++') or shutil.which('g++'))
    if not compiler:
        raise SystemExit('A C++17 compiler is required.')
    records = []
    started = time.perf_counter()
    with tempfile.TemporaryDirectory(prefix='signsgd-dense-') as temp:
        temporary = Path(temp)
        engine = temporary / 'tuning-engine'
        subprocess.run([compiler, '-O3', '-std=c++17', '-ffp-contract=off', '-pthread',
                        str(ROOT/'scripts/tune-signsgd-dense.cpp'), '-o', str(engine)], check=True)
        for batch in BATCHES:
            cnrs = [cnr for cnr in CNRS if batch not in MAIN_BATCHES or cnr not in original['cnrs']]
            (temporary/'cnrs.txt').write_text('\n'.join(format(cnr,'.17g') for cnr in cnrs))
            updates = 4096//batch
            write_draws(temporary/'coarse.bin', COARSE_PATHS, updates, 940001+batch)
            write_draws(temporary/'selection.bin', SELECTION_PATHS, updates, 950001+batch)
            for rep in range(HELDOUT_GROUPS):
                write_draws(temporary/f'heldout{rep}.bin', HELDOUT_PATHS, updates, 960001+1000*rep+batch)
            result = subprocess.run([str(engine), temp, str(batch), str(COARSE_PATHS),
                                     str(SELECTION_PATHS), str(HELDOUT_PATHS), str(HELDOUT_GROUPS),
                                     str(temporary/'cnrs.txt')], check=True, capture_output=True, text=True)
            for row in csv.DictReader(io.StringIO(result.stdout), fieldnames=FIELDS):
                integer_fields = {'batch','updates','processedSamples','refined_candidates'}
                converted = {k: int(v) if k in integer_fields else float(v) for k,v in row.items()}
                converted.update(c=1/converted['cnr'], beta=.9, source='supplemental_computation')
                assert np.isfinite(list(v for v in converted.values() if isinstance(v,(float,int)))).all()
                assert 1e-6 < converted['eta'] < 2
                records.append(converted)
            print(f'Batch {batch}: {len(cnrs)} real tuned CNR cells; {time.perf_counter()-started:.1f}s elapsed', flush=True)
    groups = []
    for cnr in CNRS:
        old = next((g for g in original['groups'] if g['cnr']==cnr), None)
        rows = [dict(r) for r in records if r['cnr']==cnr]
        if old:
            rows += [dict(r, source='paper', updates=4096//r['batch'], processedSamples=4096) for r in old['rows']]
        rows.sort(key=lambda r:r['batch'])
        fit_rows = [r for r in rows if r['batch'] in MAIN_BATCHES]
        exponent, intercept = np.polyfit([np.log(r['batch']) for r in fit_rows], [np.log(r['eta']) for r in fit_rows], 1)
        groups.append(dict(cnr=cnr,c=1/cnr,mu=.9,rows=rows,
                           eta=[r['eta'] for r in rows],relativeEta=[r['eta']/rows[0]['eta'] for r in rows],
                           fittedExponent=old['fittedExponent'] if old else float(exponent),
                           fitIntercept=old['fitIntercept'] if old else float(intercept),
                           paperCondition=bool(old)))
    assert sha(ORIGINAL)==original_hash
    assert len(records)==325 and sum(len(g['rows']) for g in groups)==352
    protocol = dict(T=4096, h=1, mu=.9, initialization='w0 ~ N(0,1), m0=0',
                    update='g=w+sqrt(c/B)z; m=0.9*m+0.1*g; w-=eta*sign(m)',
                    objective='Expected terminal loss w^2/2',
                    budget='floor(4096/B) updates; processedSamples = B*floor(4096/B)',
                    cnrs=CNRS, batches=BATCHES,
                    coarse_candidates=121, coarse_eta_min=1e-6, coarse_eta_max=2,
                    coarse_paths=COARSE_PATHS, refine_neighborhoods=3, refine_points_per_neighborhood=17,
                    refine_factor=1.35, refine_also_includes_best_coarse_candidates=6,
                    independent_selection_paths=SELECTION_PATHS,
                    heldout_groups=HELDOUT_GROUPS, heldout_paths_per_group=HELDOUT_PATHS,
                    heldout_scope='Only the selected learning rate is evaluated on held-out paths. Selection never uses these losses.',
                    near5_scope='The 5% interval uses the independent selection profile, not held-out losses.',
                    random_generator='numpy.default_rng / PCG64, float64 standard_normal; shared across all candidates and CNRs',
                    seeds=dict(coarse='940001+B',selection='950001+B',heldout='960001+1000*group+B, group=0..7'),
                    arithmetic='C++17 double; compiler -O3 -ffp-contract=off; 12 independent CNR workers',
                    original_cells=27,supplemental_cells=len(records),total_cells=352,
                    fit='OLS log(eta) against log(B) on the original nine power-of-two batches. Original paper exponents are unchanged.',
                    display='Slider snaps to one of 22 actually tuned CNR conditions; all 16 batch points are shown. No CNR interpolation.',
                    numpy_version=np.__version__, compiler=compiler,
                    runtime_seconds=round(time.perf_counter()-started,3),
                    scripts=['scripts/tune-signsgd-dense.py','scripts/tune-signsgd-dense.cpp'])
    dense = dict(T=4096,h=1,mu=.9,batches=BATCHES,cnrs=CNRS,groups=groups,protocol=protocol,
                 sourceRevision=original['sourceRevision'],originalSource='signsgd-cnr.json',
                 originalSourceHash=original_hash,
                 sourceHashes={p:sha(ROOT/p) for p in protocol['scripts']},
                 scope='Supplemental toy-model computations for this playable, alongside 27 unchanged paper measurements. Not language-model runs.')
    (DATA/'signsgd-cnr-dense.json').write_text(json.dumps(dense,separators=(',',':'))+'\n')
    (DATA/'signsgd-cnr-dense.js').write_text('window.SIGNSGD_CNR_DENSE_DATA = '+json.dumps(dense,separators=(',',':'))+';\n')
    (DATA/'signsgd-cnr-dense-protocol.json').write_text(json.dumps(protocol,indent=2)+'\n')
    with (DATA/'signsgd-cnr-dense.csv').open('w',newline='') as f:
        fields=list(records[0])
        writer=csv.DictWriter(f,fieldnames=fields);writer.writeheader();writer.writerows(records)
    print(f'Wrote {len(groups)} CNRs, 352 actual tuning endpoints, original 27 preserved.',flush=True)


if __name__ == '__main__':
    main()
