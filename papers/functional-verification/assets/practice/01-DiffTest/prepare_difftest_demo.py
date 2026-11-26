"""Prepare the normal and controlled-SUB-fault NutShell emulators."""

import argparse
import difflib
import os
from pathlib import Path
import shutil
import subprocess
import tempfile


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--nutshell', type=Path, required=True, help='Built NutShell checkout')
    parser.add_argument('--nemu-home', type=Path, required=True, help='NEMU build directory root')
    parser.add_argument('--output', type=Path, default=Path('results'), help='Parent directory for build output')
    args = parser.parse_args()

    nutshell = args.nutshell.resolve()
    nemu = args.nemu_home.resolve()
    normal = nutshell / 'build/emu'
    for path in (normal, nutshell / 'build/rtl/ALU.sv', nemu / 'build/riscv64-nemu-interpreter-so'):
        if not path.is_file():
            parser.error(f'Required build artifact is missing: {path}')
    if not (nutshell / 'build/generated-src').is_dir():
        parser.error('Generate the NutShell DiffTest source before running this script')

    args.output.mkdir(parents=True, exist_ok=True)
    run_dir = Path(tempfile.mkdtemp(prefix='nut-shell-sub-', dir=args.output.resolve()))
    print(f'Build directory: {run_dir}', flush=True)
    fault_build = run_dir / 'fault-build'
    shutil.copy2(normal.resolve(), run_dir / 'emu-good')
    for folder in ('rtl', 'generated-src'):
        shutil.copytree(nutshell / 'build' / folder, fault_build / folder)

    alu = fault_build / 'rtl/ALU.sv'
    original = alu.read_text(encoding='utf-8')
    needle = ': io_in_bits_func[5] ? {{32{res[31]}}, res[31:0]} : res;'
    replacement = ": io_in_bits_func[5] ? {{32{res[31]}}, res[31:0]} : (res ^ ((io_in_bits_func == 7'h08) ? 64'h1 : 64'h0));"
    if original.count(needle) != 1:
        raise RuntimeError('The input ALU.sv is different from the pinned build used in section 8.1')
    changed = original.replace(needle, replacement)
    alu.write_text(changed, encoding='utf-8')
    patch = difflib.unified_diff(original.splitlines(keepends=True), changed.splitlines(keepends=True),
                                fromfile='normal/ALU.sv', tofile='fault/ALU.sv')
    (run_dir / 'sub-result-bitflip.patch').write_text(''.join(patch), encoding='utf-8')
    (fault_build / 'rtl/SimTop.sv').touch()

    env = dict(os.environ, NOOP_HOME=str(nutshell), NUTSHELL_HOME=str(nutshell), NEMU_HOME=str(nemu))
    command = ['make', 'emu', f'BUILD_DIR={fault_build}', 'CORE=inorder', 'BOARD=sim',
               'WITH_CHISELDB=0', 'WITH_CONSTANTIN=0', 'NO_ZSTD_COMPRESSION=1', '-j2']
    build_log = run_dir / 'fault-build.log'
    with build_log.open('wb') as log:
        result = subprocess.run(command, cwd=nutshell, env=env, stdout=log,
                                stderr=subprocess.STDOUT, timeout=1200)
    if result.returncode:
        raise RuntimeError(f'NutShell build exited {result.returncode}. See {build_log}')
    shutil.copy2((fault_build / 'emu').resolve(strict=True), run_dir / 'emu-subfault')
    print(f'Emulators: {run_dir / "emu-good"} and {run_dir / "emu-subfault"}')


if __name__ == '__main__':
    main()
