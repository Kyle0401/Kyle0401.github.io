"""Measure native XFUZZ MUX coverage with the previously verified ADDI images."""

import argparse
import json
import os
from pathlib import Path
import re
import shlex
import subprocess
import tempfile


CASES_DIR = Path(__file__).resolve().parent.parent / '03-ADDI'
CASES = [
    ('+1', 'plus-1', '00128393', 9),
    ('+1 repeat', 'plus-1', '00128393', 9),
    ('+2', 'plus-2', '00228393', 10),
    ('0', 'zero', '00028393', 8),
    ('-1', 'minus-1', 'fff28393', 7),
]
METRIC = 'firrtl.mux'
SEED = '0'
COMMIT = re.compile(
    r'\bcommit pc 0000000080000008 inst ([0-9a-fA-F]{8}) wen 1 dst 07 '
    r'data ([0-9a-fA-F]{16})\b'
)
COVERAGE = re.compile(r'COVERAGE:\s*mux,\s*(\d+),\s*(\d+),\s*(\d+)')
SUMMARY = re.compile(r'Total Coverage:\s*(\d+(?:\.\d+)?)%')
ANSI = re.compile(r'\x1b\[[0-9;]*m')


def replay(demo, reference, cases_dir, cases, log_path):
    images = [cases_dir / f'{name}.bin' for _, name, _, _ in cases]
    for path in [demo / 'build/fuzzer', reference, *images]:
        if not path.is_file():
            raise FileNotFoundError(path)

    # Keep fixed workload paths before the arguments forwarded to the simulator.
    args = [str(demo / 'build/fuzzer'), '--coverage', METRIC, '--verbose', '--auto-exit',
            '--', *map(str, images), '-s', SEED, '-b', '0', '-e', '5000', '-C', '5000',
            '-I', '64', '--ram-size', '128MB', '--dump-commit-trace', '--diff', str(reference)]
    env = dict(os.environ, NOOP_HOME=str(demo), NUTSHELL_HOME=str(demo))
    with log_path.open('w', encoding='utf-8') as log:
        log.write(f'Command: {shlex.join(args)}\n')
        log.flush()
        run = subprocess.run(args, cwd=demo, env=env, stdout=log, stderr=subprocess.STDOUT,
                             timeout=60)
    if run.returncode:
        raise RuntimeError(f'XFUZZ exited {run.returncode}. See {log_path}')

    log = ANSI.sub('', log_path.read_text(encoding='utf-8', errors='replace'))
    commits = COMMIT.findall(log)
    coverage = COVERAGE.findall(log)
    totals = SUMMARY.findall(log)
    if (len(commits) != len(cases) or len(coverage) != len(cases) or len(totals) != 1
            or log.count('Difftest enabled') != len(cases)
            or log.count(f'The reference model is {reference}') != len(cases)
            or log.count('HIT GOOD TRAP at pc = 0x8000001c') != len(cases)
            or 'different at pc' in log):
        raise RuntimeError(f'Expected one successful DiffTest and MUX observation per input. See {log_path}')

    rows = []
    previous = 0
    point_total = int(coverage[0][0])
    for (label, _, expected_word, expected_value), (word, data), counts in zip(cases, commits, coverage):
        actual_value = int(data, 16)
        total, hits, cumulative = map(int, counts)
        if word.lower() != expected_word or actual_value != expected_value:
            raise RuntimeError(f'Unexpected instruction or writeback for {label}. See {log_path}')
        if total != point_total or not (0 < hits <= cumulative <= total and previous <= cumulative):
            raise RuntimeError(f'Inconsistent MUX counters for {label}. See {log_path}')
        rows.append({'input': label, 'instruction': word, 'writeback': actual_value,
                     'points': total, 'hit_in_run': hits, 'cumulative': cumulative,
                     'new_points': cumulative - previous})
        previous = cumulative
    if abs(float(totals[0]) - 100 * previous / point_total) > 0.000501:
        raise RuntimeError(f'XFUZZ summary and DiffTest MUX counters disagree. See {log_path}')
    return rows, totals[0]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('demo', type=Path, help='Built FuzzingNutShell directory in WSL Ubuntu')
    parser.add_argument('--reference', type=Path, required=True, help='Compatible NEMU reference library')
    parser.add_argument('--cases-dir', type=Path, default=CASES_DIR, help='Directory with the four fixed binaries')
    parser.add_argument('--output', type=Path, default=Path('results'), help='Parent directory for run output')
    args = parser.parse_args()
    demo = args.demo.resolve()
    reference = args.reference.resolve()
    cases_dir = args.cases_dir.resolve()
    args.output.mkdir(parents=True, exist_ok=True)
    run_dir = Path(tempfile.mkdtemp(dir=args.output.resolve(), prefix='xfuzz-'))
    baseline, _ = replay(demo, reference, cases_dir, CASES[:1], run_dir / 'plus-1.log')
    rows, coverage_percent = replay(demo, reference, cases_dir, CASES, run_dir / 'sequence.log')
    repeat, repeat_percent = replay(demo, reference, cases_dir, CASES, run_dir / 'sequence-repeat.log')
    if baseline[0] != rows[0] or rows != repeat or coverage_percent != repeat_percent:
        raise RuntimeError(f'The fixed-input replay produced different results. See {run_dir}')
    if rows[1]['new_points'] != 0:
        raise RuntimeError(f'The same input with the same seed added coverage. See {run_dir}')

    report = {'metric': METRIC, 'simulation_seed': int(SEED), 'cases': rows,
              'reference': str(reference), 'coverage_percent': float(coverage_percent),
              'repeat_matches': True}
    report_path = run_dir / 'report.json'
    report_path.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(f'{"input":<10} {"t2":>4} {"hit":>5} {"cumulative":>11} {"new":>5}')
    for row in rows:
        covered = f'{row["cumulative"]}/{row["points"]}'
        print(f'{row["input"]:<10} {row["writeback"]:>4} {row["hit_in_run"]:>5} '
              f'{covered:>11} {row["new_points"]:>5}')
    print(f'XFUZZ total: {coverage_percent}%')
    print(f'Report: {report_path}')


if __name__ == '__main__':
    main()
