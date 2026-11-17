#!/usr/bin/env python3
"""提交两次 17/5 请求，分别检查商和余数，并记录 ready/done。"""

import argparse
import json
from pathlib import Path
import sys


MAX_CYCLES = 19
MASK32 = (1 << 32) - 1


def reset_divider(dut):
    dut.InitClock('clk')
    # 在下一次时钟沿前送入控制和操作数。
    for name in ('io_valid', 'io_flush', 'io_signed', 'io_useRem',
                 'io_dividend', 'io_divisor', 'reset'):
        getattr(dut, name).AsImmWrite()
    dut.io_valid.value = 0
    dut.io_flush.value = 0
    dut.io_signed.value = 0
    dut.io_useRem.value = 0
    dut.io_dividend.value = 0
    dut.io_divisor.value = 1
    dut.reset.value = 1
    dut.Step(5)
    dut.reset.value = 0
    dut.Step(1)
    print(f'Reset complete: ready={int(dut.io_ready.value)}, '
          f'done={int(dut.io_done.value)}', flush=True)


def wait_ready(dut):
    for elapsed in range(MAX_CYCLES + 1):
        if dut.io_ready.value:
            return
        if elapsed < MAX_CYCLES:
            dut.Step(1)
    raise TimeoutError('io_ready did not become 1 within the waiting limit')


def submit_request(dut, dividend, divisor, use_remainder, *, signed=False):
    wait_ready(dut)
    dut.io_dividend.value = dividend & MASK32
    dut.io_divisor.value = divisor & MASK32
    dut.io_signed.value = int(signed)
    dut.io_useRem.value = use_remainder
    dut.io_flush.value = 0
    dut.io_valid.value = 1
    operation = 'remainder' if use_remainder else 'quotient'
    print(f'Request: {operation}, dividend={dividend}, divisor={divisor}', flush=True)
    # 这一拍在 ready=1、valid=1、flush=0 时接受请求。
    dut.Step(1)
    dut.io_valid.value = 0
    trace = []
    # 第 1 拍包含提交请求的 Step；立即检查，兼顾快速完成的情况。
    for elapsed in range(1, MAX_CYCLES + 1):
        ready = int(dut.io_ready.value)
        done = int(dut.io_done.value)
        trace.append({'step_from_submit': elapsed, 'ready': ready, 'done': done})
        print(f'  step_from_submit={elapsed}: ready={ready}, done={done}', flush=True)
        if done:
            return int(dut.io_result.value), trace
        if elapsed < MAX_CYCLES:
            # 保持操作数和模式，逐拍等待。
            dut.Step(1)
    raise TimeoutError('io_done did not become 1 within 19 steps including submission')


def submit_unsigned(dut, dividend, divisor, use_remainder):
    return submit_request(dut, dividend, divisor, use_remainder, signed=False)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--package-parent', type=Path, required=True)
    parser.add_argument('--report', type=Path)
    args = parser.parse_args()
    parent = args.package_parent.expanduser().resolve()
    if not parent.is_dir():
        parser.error(f'Exported package parent does not exist: {parent}')
    sys.path.insert(0, str(parent))
    from IntegerDivider import DUTIntegerDivider

    dut = DUTIntegerDivider()
    results = []
    try:
        reset_divider(dut)

        dividend, divisor = 17, 5
        for use_remainder in (0, 1):
            actual, trace = submit_unsigned(dut, dividend, divisor, use_remainder)
            expected = dividend % divisor if use_remainder else dividend // divisor
            operation = 'remainder' if use_remainder else 'quotient'
            passed = actual == expected
            print(f"{'PASS' if passed else 'FAIL'}: {operation}, "
                  f'expected={expected}, actual={actual}', flush=True)
            results.append({'operation': operation, 'dividend': dividend, 'divisor': divisor,
                            'signed': False, 'expected': expected, 'actual': actual,
                            'passed': passed, 'trace': trace})
    finally:
        dut.Finish()

    failed = sum(not result['passed'] for result in results)
    print(f'Summary: {len(results) - failed} passed, {failed} failed', flush=True)
    report = {'scope': 'Unsigned 17/5 quotient and remainder smoke checks',
              'spec_width': 32, 'source_commit': '123e02896fd80290c1d1888613a24daed4627461',
              'results': results, 'passed': len(results) - failed, 'failed': failed}
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    return 1 if failed else 0


if __name__ == '__main__':
    raise SystemExit(main())
