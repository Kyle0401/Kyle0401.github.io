"""Run a fixed ADDI coverage-feedback exercise with NutShell and DiffTest."""

import argparse
import json
from pathlib import Path
import re
import shlex
import struct
import subprocess
import tempfile


CASES = [('plus-1', 1), ('plus-2', 2), ('zero', 0), ('minus-1', -1)]
BINS = ['positive', 'zero', 'negative']
BASE_VALUE = 8
TARGET_PC = 0x80000008
STOP_PC = 0x8000001C
ADDI_T2_T0 = 0x00028393
COMMIT = re.compile(
    r'\bcommit pc (?P<pc>[0-9a-fA-F]+) inst (?P<word>[0-9a-fA-F]+) '
    r'wen (?P<wen>[01]) dst (?P<dest>\d+) data (?P<data>[0-9a-fA-F]+)\b'
)


def run_simulator(emulator, reference, image, log_file):
    args = [str(emulator), '-i', str(image), '--diff', str(reference), '--ram-size', '128MB',
            '-C', '5000', '-I', '64', '-b', '0', '-e', '5000', '--dump-commit-trace']
    returncode = None
    runner_error = None
    try:
        result = subprocess.run(args, cwd=log_file.parent, stdout=subprocess.PIPE,
                                stderr=subprocess.STDOUT, timeout=30)
        returncode, output = result.returncode, result.stdout
    except subprocess.TimeoutExpired as error:
        output = error.output or b''
        runner_error = f'Simulation timed out after {error.timeout} seconds'
    except OSError as error:
        output = b''
        runner_error = f'Could not start the simulator: {error}'

    log = re.sub(r'\x1b\[[0-9;]*m', '', output.decode('utf-8', errors='replace'))
    log_file.write_text('Command: ' + shlex.join(args) + '\n' + log +
                        (f'\n{runner_error}\n' if runner_error else ''), encoding='utf-8')
    return returncode, log, runner_error


def run_case(name, immediate, run_dir, emulator, reference):
    word = ADDI_T2_T0 | ((immediate & 0xFFF) << 20)
    image = run_dir / f'{name}.bin'
    log_file = run_dir / f'{name}.log'
    # Clear a0 for GOOD TRAP, initialize t0, and leave four NOPs after the test.
    image.write_bytes(struct.pack('<8I', 0x00000513, 0x00800293, word,
                                  *([0x00000013] * 4), 0x0000006B))
    returncode, log, runner_error = run_simulator(emulator, reference, image, log_file)
    errors = []
    if runner_error:
        errors.append(runner_error)
    elif returncode != 0:
        errors.append(f'Simulator exited with status {returncode}')
    if 'Difftest enabled' not in log or f'The reference model is {reference}' not in log:
        errors.append('NutShell and the selected NEMU reference did not start DiffTest')
    if f'HIT GOOD TRAP at pc = {STOP_PC:#x}' not in log:
        errors.append('Simulation did not reach the expected GOOD TRAP')
    if 'different at pc' in log:
        errors.append('DiffTest reported a mismatch')
    difftest_passed = not errors

    expected = BASE_VALUE + immediate
    matches = [match for match in COMMIT.finditer(log)
               if int(match['pc'], 16) == TARGET_PC]
    trace = observed_immediate = coverage_bin = writeback = None
    if len(matches) != 1:
        errors.append(f'Expected one commit at {TARGET_PC:#x}, found {len(matches)}')
    else:
        match = matches[0]
        trace = match.group()
        actual_word = int(match['word'], 16)
        if actual_word == word:
            raw_immediate = actual_word >> 20
            observed_immediate = raw_immediate - 4096 if raw_immediate & 0x800 else raw_immediate
            if observed_immediate > 0:
                coverage_bin = 'positive'
            elif observed_immediate < 0:
                coverage_bin = 'negative'
            else:
                coverage_bin = 'zero'
        else:
            errors.append(f'Instruction word {actual_word:#010x} differs from {word:#010x}')
        if match['wen'] == '1' and int(match['dest']) == 7:
            writeback = int(match['data'], 16)
            if writeback != expected:
                errors.append(f'Expected x7={expected}, observed x7={writeback}')
        else:
            errors.append('The target commit did not write x7')

    return {'case': name, 'input_immediate': immediate, 'committed_immediate': observed_immediate,
            'bin': coverage_bin, 'expected_writeback': expected, 'observed_writeback': writeback,
            'difftest_passed': difftest_passed, 'simulator_exit': returncode,
            'trace': trace, 'log': log_file.name, 'errors': errors}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--emulator', type=Path, required=True, help='Normal NutShell emulator')
    parser.add_argument('--reference', type=Path, required=True, help='NEMU reference shared library')
    parser.add_argument('--output', type=Path, default=Path('results'), help='Parent directory for run output')
    args = parser.parse_args()
    emulator, reference = args.emulator.resolve(), args.reference.resolve()
    for path in (emulator, reference):
        if not path.is_file():
            parser.error(f'Expected an emulator or reference file: {path}')
    args.output.mkdir(parents=True, exist_ok=True)
    run_dir = Path(tempfile.mkdtemp(prefix='addi-', dir=args.output.resolve()))
    covered = set()
    seeds = []
    results = []
    print(f'{"imm":>4}  {"bin":<8}  {"expect":>6}  {"actual":>6}  {"covered":>7}  decision')
    for name, immediate in CASES:
        case = run_case(name, immediate, run_dir, emulator, reference)
        coverage_bin = case['bin']
        if case['errors']:
            decision = 'failed'
        elif coverage_bin in covered:
            decision = 'already covered'
        else:
            decision = 'initial seed' if name == CASES[0][0] else 'new bin'
            covered.add(coverage_bin)
            seeds.append(name)
        case['seed_decision'] = decision
        case['covered_bins'] = [item for item in BINS if item in covered]
        results.append(case)
        actual = case['observed_writeback']
        print(f'{immediate:>+4}  {coverage_bin or "-":<8}  {case["expected_writeback"]:>6}  '
              f'{str(actual) if actual is not None else "-":>6}  '
              f'{len(covered):>5}/{len(BINS)}  {decision}')
        for error in case['errors']:
            print(f'      {error}')

    report = {'bins': BINS, 'seeds': seeds, 'cases': results}
    report_path = run_dir / 'report.json'
    report_path.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(f'Report: {report_path}')
    return int(any(case['errors'] for case in results))


if __name__ == '__main__':
    raise SystemExit(main())
