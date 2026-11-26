"""Run genuine NutShell/DiffTest/NEMU comparisons, including a real RTL fault."""
import argparse
from pathlib import Path
import json
import re
import shlex
import struct
import subprocess
import sys
import tempfile

def simulate(binary, image, reference, log_path):
    args = [str(binary), '-i', str(image), '--diff', str(reference), '--ram-size', '128MB',
            '-C', '5000', '-I', '64', '-b', '0', '-e', '0']
    result = subprocess.run(args, cwd=log_path.parent, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                            text=True, errors='replace', timeout=30)
    log = re.sub(r'\x1b\[[0-9;]*m', '', result.stdout)
    log_path.write_text(f'Command: {shlex.join(args)}\n{log}', encoding='utf-8')
    return result.returncode, log


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--normal', type=Path, required=True, help='Normal NutShell emulator')
    parser.add_argument('--fault', type=Path, required=True, help='NutShell emulator with the controlled SUB fault')
    parser.add_argument('--reference', type=Path, required=True, help='NEMU reference shared library')
    parser.add_argument('--output', type=Path, default=Path('results'), help='Parent directory for run output')
    args = parser.parse_args()

    normal, fault, reference = (path.resolve(strict=True) for path in (args.normal, args.fault, args.reference))
    for path in (normal, fault, reference):
        if not path.is_file():
            raise RuntimeError(f'Expected an emulator or reference file: {path}')
    args.output.mkdir(parents=True, exist_ok=True)
    run_dir = Path(tempfile.mkdtemp(prefix='difftest-', dir=args.output.resolve()))
    image = run_dir / 'registers-drain.bin'
    print(f'Run directory: {run_dir}')

    # Allow the final arithmetic instruction to commit before the DUT's
    # EXU-level simulation-stop instruction is observed by the harness.
    image.write_bytes(struct.pack('<9I', 0x00000513, 0x00500293, 0x00328313,
                                  0x405303B3, *([0x00000013]*4), 0x0000006B))
    good_code, good_log = simulate(normal, image, reference, run_dir / 'good.log')
    if (good_code != 0 or 'HIT GOOD TRAP at pc = 0x80000020' not in good_log
            or 'Difftest enabled' not in good_log or str(reference) not in good_log):
        raise RuntimeError(f'The normal RTL test failed. See {run_dir / "good.log"}')
    bad_code, bad_log = simulate(fault, image, reference, run_dir / 'subfault.log')
    differences = [line.strip() for line in bad_log.splitlines() if 'different at pc' in line]
    fault_commits = [line.strip() for line in bad_log.splitlines()
                     if 'commit pc' in line and 'inst 405303b3' in line]
    expected = re.search(r'\bt2 different at pc = 0x[0-9a-fA-F]+, right = 0x0*3, wrong = 0x0*2', bad_log)
    if (bad_code == 0 or not expected or 'Difftest enabled' not in bad_log
            or not any('dst 07 data 0000000000000002' in line for line in fault_commits)):
        raise RuntimeError('The RTL fault did not produce the expected DiffTest failure; read subfault.log')
    report = {'normal_exit': good_code, 'fault_exit': bad_code,
              'differences': differences, 'fault_commits': fault_commits,
              'reference': str(reference)}
    (run_dir / 'report.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print('Normal NutShell RTL + NEMU REF: GOOD TRAP, exit=0')
    print(f'SUB-result fault in RTL: caught by DiffTest, exit={bad_code}')
    for line in fault_commits:
        print(line)
    for line in differences:
        print(line)
    print('The fault is in the generated RTL ALU; the test program and REF are the same in both runs.')
    print(f'Logs and report: {run_dir}')


if __name__ == '__main__':
    try:
        main()
    except (OSError, RuntimeError, subprocess.TimeoutExpired) as error:
        print(error, file=sys.stderr)
        sys.exit(1)
