#!/usr/bin/env python3
"""Refresh directional-branch playables from measured Figure 6 CSV exports.

Dry-run by default. After verifying the source export, use:
  python3 scripts/refresh-branch-data.py --source-dir /path/to/figure6_data \
      --source-revision <paper-or-experiment-revision> --write

Copies the original curve downloads, rebuilds branch-curves.json/js, updates
only endpoints/recovery in paper-data.json/js, and records per-file provenance.
Missing runs stay missing; curves are never reconstructed from endpoint losses.
"""
import argparse
import csv
import hashlib
import io
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILES = ('base_run_curve.csv', 'branch_curves.csv',
         'branch_endpoints.csv', 'penalty_removed.csv')
ARMS = ('control (128K)', 'fully scaled', 'top-16 held', 'top-64 held',
        'top-128 held', 'top-256 held', 'top-768 held', 'random-768 held')


def number(value):
    result = float(value)
    if not math.isfinite(result):
        raise ValueError(f'Non-finite measurement: {value}')
    return result


def csv_bytes(records, fields):
    output = io.StringIO(newline='')
    writer = csv.DictWriter(output, fieldnames=fields)
    writer.writeheader()
    writer.writerows(records)
    return output.getvalue().encode()


def json_bytes(value, *, pretty=False):
    return (json.dumps(value, indent=2 if pretty else None,
                       separators=None if pretty else (',', ':'),
                       allow_nan=False) + '\n').encode()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-dir', type=Path, required=True)
    parser.add_argument('--source-revision', required=True)
    parser.add_argument('--data-dir', type=Path, default=ROOT / 'batch-size/data')
    parser.add_argument('--write', action='store_true', help='Write verified measurements.')
    args = parser.parse_args()
    source = {name: (args.source_dir / name).read_bytes() for name in FILES}
    rows = {name: list(csv.DictReader(io.StringIO(blob.decode('utf-8-sig'))))
            for name, blob in source.items()}
    hashes = {name: hashlib.sha256(blob).hexdigest() for name, blob in source.items()}
    if not all(rows.values()):
        raise ValueError('Every required source CSV must contain measurements.')

    base = [[int(r['step']), number(r['holdout_loss'])]
            for r in rows['base_run_curve.csv']]
    if len({r[0] for r in base}) != len(base):
        raise ValueError('Duplicate base-run steps.')
    base.sort()
    endpoints, endpoint_keys = [], set()
    for r in rows['branch_endpoints.csv']:
        a, arm = int(r['anchor_step']), r['arm']
        key = (a, arm)
        if key in endpoint_keys or arm not in ARMS:
            raise ValueError(f'Duplicate or unknown endpoint: {key}')
        endpoint_keys.add(key)
        loss, control = number(r['validation_loss']), number(r['control_validation_loss'])
        penalty = number(r['branch_penalty_1e-3_nats'])
        if abs(penalty - 1000 * (loss - control)) > .011:
            raise ValueError(f'Penalty does not match validation losses: {key}')
        endpoints.append(dict(anchor=a, arm=arm, rank=int(r['held_rank'] or 0),
                              loss=loss, control=control, penalty=penalty))
    endpoints.sort(key=lambda r: (r['anchor'], ARMS.index(r['arm'])))
    endpoint_map = {(r['anchor'], r['arm']): r for r in endpoints}
    checkpoints = sorted({r['anchor'] for r in endpoints})
    for a in checkpoints:
        for arm in ('control (128K)', 'fully scaled'):
            if (a, arm) not in endpoint_keys:
                raise ValueError(f'Missing reference endpoint: {(a, arm)}')
        control = endpoint_map[a, 'control (128K)']['loss']
        if any(abs(r['control'] - control) > 1e-9 for r in endpoints if r['anchor'] == a):
            raise ValueError(f'Inconsistent control losses at checkpoint {a}')

    anchors, curve_keys = {}, set()
    for r in rows['branch_curves.csv']:
        a, arm, step = int(r['anchor_step']), r['arm'], int(r['step'])
        key = (a, arm, step)
        if key in curve_keys or (a, arm) not in endpoint_keys:
            raise ValueError(f'Duplicate curve step or curve without endpoint: {key}')
        if not a <= step <= a + 1024:
            raise ValueError(f'Curve step outside the branch budget: {key}')
        curve_keys.add(key)
        anchors.setdefault(str(a), {}).setdefault(arm, []).append(
            [step, number(r['holdout_loss'])])
    for a, arms in anchors.items():
        if 'control (128K)' not in arms:
            raise ValueError(f'Missing control curve at checkpoint {a}')
        for points in arms.values():
            points.sort()
    anchors = {str(a): {arm: anchors[str(a)][arm] for arm in ARMS if arm in anchors[str(a)]}
               for a in sorted(map(int, anchors))}

    recovery, recovery_keys = [], set()
    for r in rows['penalty_removed.csv']:
        a, arm = int(r['anchor_step']), r['arm']
        key = (a, arm)
        if key not in endpoint_keys or key in recovery_keys:
            raise ValueError(f'Recovery without endpoint or duplicate recovery: {key}')
        recovery_keys.add(key)
        percent = number(r['penalty_removed_percent'])
        full, held = endpoint_map[a, 'fully scaled'], endpoint_map[key]
        gap = full['loss'] - full['control']
        if gap <= 0:
            raise ValueError(f'Recovery requires a positive fully scaled penalty: {key}')
        expected = 100 * (1 - (held['loss'] - held['control']) / gap)
        if abs(percent - expected) > .061:
            raise ValueError(f'Recovery does not match endpoint losses: {key}')
        recovery.append(dict(anchor=a, arm=arm, percent=percent))
    recovery.sort(key=lambda r: (r['anchor'], ARMS.index(r['arm'])))

    curves = json.loads((args.data_dir / 'branch-curves.json').read_text())
    curves['metadata'].update(source='paper figure6_data',
                              sourceRevision=args.source_revision,
                              sha256={name: hashes[name] for name in FILES[:2]},
                              branchBaseStepsByAnchor={a: max(p[0] for points in arms.values() for p in points)-int(a)
                                                       for a, arms in anchors.items()})
    curves.update(base=base, anchors=anchors)
    paper = json.loads((args.data_dir / 'paper-data.json').read_text())
    paper.update(endpoints=endpoints, recovery=recovery)
    paper.pop('branchEndpointSupplement', None)
    paper['branchSource'] = dict(sourceRevision=args.source_revision,
                               sha256={name: hashes[name] for name in FILES[2:]})
    provenance = json.loads((args.data_dir / 'provenance.json').read_text())
    provenance.pop('directional_endpoint_supplement', None)
    provenance['files'] = [record for record in provenance['files']
                           if record['path'] != 'src/appendices/lm_directional_protocol.tex']
    for name in FILES:
        path = f'figure6_data/{name}'
        record = next((f for f in provenance['files'] if f['path'] == path), None)
        if record is None:
            record = dict(path=path)
            provenance['files'].append(record)
        record.update(sha256=hashes[name], source_revision=args.source_revision)
    provenance['directional_branching'] = dict(
        source_revision=args.source_revision, checkpoints=checkpoints,
        branch_curves=sum(map(len, anchors.values())), curve_points=len(curve_keys),
        endpoints=len(endpoints), recovery_measurements=len(recovery),
        display='Every available measured checkpoint and top-k branch. Missing runs remain absent.')

    output = {
        'base-run-curve.csv': source['base_run_curve.csv'],
        'branch-curves.csv': source['branch_curves.csv'],
        'branch-curves.json': json_bytes(curves),
        'branch-curves.js': b'window.BRANCH_CURVES=' + json_bytes(curves).rstrip() + b';\n',
        'branch-endpoints.csv': csv_bytes(endpoints, ['anchor', 'arm', 'rank', 'loss', 'control', 'penalty']),
        'penalty-removed.csv': csv_bytes(recovery, ['anchor', 'arm', 'percent']),
        'paper-data.json': json_bytes(paper, pretty=True),
        'paper-data.js': b'window.PAPER_DATA = ' + json_bytes(paper).rstrip() + b';\n',
        'provenance.json': json_bytes(provenance, pretty=True),
    }
    report = dict(mode='write' if args.write else 'dry-run',
                  source_revision=args.source_revision, checkpoints=checkpoints,
                  base_points=len(base), curve_points=len(curve_keys),
                  branch_curves=sum(map(len, anchors.values())), endpoints=len(endpoints),
                  recovery_measurements=len(recovery),
                  missing_curves=[f'{a}: {arm}' for a, arm in endpoint_keys
                                  if arm not in anchors.get(str(a), {})])
    if args.write:
        for name, content in output.items():
            target = args.data_dir / name
            temporary = target.with_suffix(target.suffix + '.tmp')
            temporary.write_bytes(content)
            temporary.replace(target)
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
