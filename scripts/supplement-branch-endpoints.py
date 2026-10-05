#!/usr/bin/env python3
"""Import published even-checkpoint penalties without inventing losses or curves."""
import argparse
import csv
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARMS = ['fully scaled', 'top-16 held', 'top-64 held', 'top-128 held',
        'top-256 held', 'top-768 held', 'random-768 held']


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--source-revision', required=True)
    parser.add_argument('--write', action='store_true')
    args = parser.parse_args()
    source = args.source.read_bytes()
    text = source.decode()
    start = text.index('anchor & fully scaled')
    table = text[start:text.index('\\bottomrule', start)]
    published = {}
    for line in table.splitlines():
        cells = line.strip().rstrip('\\').strip().split('&')
        if len(cells) != 8 or not re.fullmatch(r'\$[\d{},]+\$', cells[0].strip()):
            continue
        anchor = int(re.sub(r'\D', '', cells[0]))
        values = [None if '--' in c else float(c.strip().strip('$').lstrip('+'))
                  for c in cells[1:]]
        published[anchor] = dict(zip(ARMS, values))
    if sorted(published) != list(range(1000, 13000, 1000)):
        raise ValueError('Expected the complete twelve-checkpoint endpoint table.')

    data_dir = ROOT / 'batch-size/data'
    paper = json.loads((data_dir / 'paper-data.json').read_text())
    endpoint_map = {(r['anchor'], r['arm']): r for r in paper['endpoints']}
    recovery_map = {(r['anchor'], r['arm']): r for r in paper['recovery']}
    added, updated = [], []
    for anchor, row in published.items():
        if anchor % 2000:
            continue
        for rank in [16, 64, 128, 256]:
            arm = f'top-{rank} held'
            existing = endpoint_map.get((anchor, arm))
            if row[arm] is None or (existing is not None and existing.get('source') != 'paper table'):
                continue
            endpoint = dict(anchor=anchor, arm=arm, rank=rank, loss=None, control=None,
                            penalty=row[arm], source='paper table',
                            sourceRevision=args.source_revision, penaltyPrecision=1)
            recovery = dict(
                anchor=anchor, arm=arm,
                percent=100 * (1 - row[arm] / row['fully scaled']), approximate=True,
                source='paper table', sourceRevision=args.source_revision,
                fullyScaledPenalty=row['fully scaled'], heldPenalty=row[arm],
                penaltyPrecision=1)
            if existing is None:
                paper['endpoints'].append(endpoint)
                paper['recovery'].append(recovery)
                added.append((anchor, arm))
            else:
                existing.clear()
                existing.update(endpoint)
                previous_recovery = recovery_map.get((anchor, arm))
                if previous_recovery is None:
                    paper['recovery'].append(recovery)
                else:
                    previous_recovery.clear()
                    previous_recovery.update(recovery)
                updated.append((anchor, arm))
    for endpoint in paper['endpoints']:
        if endpoint.get('source') == 'paper table':
            endpoint['branchBaseSteps'] = 992 if endpoint['anchor'] == 12000 else 1024
    for recovery in paper['recovery']:
        if recovery.get('source') == 'paper table':
            recovery['branchBaseSteps'] = 992 if recovery['anchor'] == 12000 else 1024
    order = ['control (128K)'] + ARMS
    paper['endpoints'].sort(key=lambda r: (r['anchor'], order.index(r['arm'])))
    paper['recovery'].sort(key=lambda r: (r['anchor'], order.index(r['arm'])))
    metadata = dict(source='paper table', sourceRevision=args.source_revision,
                    path='src/appendices/lm_directional_protocol.tex',
                    sha256=hashlib.sha256(source).hexdigest(), penaltyPrecision=1,
                    branchBaseSteps={'12000': 992, 'other_checkpoints': 1024},
                    scope='Even-checkpoint top-16/64/128/256 penalties. Absolute losses and raw curves are unavailable in this table.',
                    recovery='Approximate recovery computed from the published one-decimal held and fully-scaled penalties.')
    paper['branchEndpointSupplement'] = metadata
    provenance = json.loads((data_dir / 'provenance.json').read_text())
    provenance['directional_endpoint_supplement'] = dict(metadata, endpoints=24)
    record = next((r for r in provenance['files'] if r['path'] == metadata['path']), None)
    if record is None:
        record = dict(path=metadata['path'])
        provenance['files'].append(record)
    record.update(sha256=metadata['sha256'], source_revision=args.source_revision)
    if args.write:
        blob = json.dumps(paper, separators=(',', ':'), allow_nan=False)
        (data_dir / 'paper-data.json').write_text(json.dumps(paper, indent=2, allow_nan=False) + '\n')
        (data_dir / 'paper-data.js').write_text('window.PAPER_DATA = ' + blob + ';\n')
        (data_dir / 'provenance.json').write_text(json.dumps(provenance, indent=2) + '\n')
        fields = ['anchor', 'arm', 'rank', 'loss', 'control', 'penalty',
                  'source', 'sourceRevision', 'penaltyPrecision', 'branchBaseSteps']
        with (data_dir / 'branch-endpoints.csv').open('w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fields)
            writer.writeheader()
            writer.writerows(paper['endpoints'])
        fields = ['anchor', 'arm', 'percent', 'approximate', 'source', 'sourceRevision',
                  'fullyScaledPenalty', 'heldPenalty', 'penaltyPrecision', 'branchBaseSteps']
        with (data_dir / 'penalty-removed.csv').open('w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fields)
            writer.writeheader()
            writer.writerows(paper['recovery'])
    print(json.dumps(dict(mode='write' if args.write else 'dry-run', added=added, updated=updated,
                         endpoints=len(paper['endpoints']), recovery=len(paper['recovery'])), indent=2))


if __name__ == '__main__':
    main()
