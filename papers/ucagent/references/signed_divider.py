#!/usr/bin/env python3
"""检查四种正负号组合的 DIV/REM，使用 RISC-V 向零截断规则。"""

import argparse
import json
from pathlib import Path
import sys

from first_divider import MASK32, reset_divider, submit_request


SIGNED_CASES = ((17, 5), (-17, 5), (17, -5), (-17, -5))


def as_signed32(value):
    value = value & MASK32
    if value & (1 << 31):
        return value - (1 << 32)
    return value


def expected_signed_division(dividend, divisor):
    """返回规范要求的商、余数的两个 32 位接口值。"""
    dividend = as_signed32(dividend)
    divisor = as_signed32(divisor)
    if divisor == 0:
        return MASK32, dividend & MASK32
    quotient = abs(dividend) // abs(divisor)
    if (dividend < 0) != (divisor < 0):
        quotient = -quotient
    remainder = dividend - quotient * divisor
    # 将整数编码为 32 位，包括规范规定的最小负数除以 -1 的结果。
    return quotient & MASK32, remainder & MASK32


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

    results = []
    dut = DUTIntegerDivider()
    try:
        reset_divider(dut)
        print('Mode: signed 32-bit division (io_signed=1)', flush=True)
        for dividend, divisor in SIGNED_CASES:
            expected_pair = expected_signed_division(dividend, divisor)
            print(f'Operands: {dividend} / {divisor}; '
                  f'bits=0x{dividend & MASK32:08x}/0x{divisor & MASK32:08x}', flush=True)
            for use_remainder in (0, 1):
                actual, trace = submit_request(dut, dividend, divisor, use_remainder, signed=True)
                expected = expected_pair[use_remainder]
                operation = 'REM' if use_remainder else 'DIV'
                passed = actual == expected
                print(f"{'PASS' if passed else 'FAIL'}: {operation} {dividend}/{divisor}, "
                      f'expected={as_signed32(expected)}, actual={as_signed32(actual)}, '
                      f'bits=0x{actual:08x}', flush=True)
                results.append({'operation': operation, 'dividend': dividend, 'divisor': divisor,
                                'signed': True, 'expected': expected, 'actual': actual,
                                'expected_signed': as_signed32(expected),
                                'actual_signed': as_signed32(actual), 'passed': passed, 'trace': trace})
    finally:
        dut.Finish()

    failed = sum(not result['passed'] for result in results)
    print(f'Summary: {len(results) - failed} passed, {failed} failed', flush=True)
    report = {'scope': 'Four ordinary signed input pairs, each tested for quotient and remainder',
              'spec_width': 32, 'results': results, 'passed': len(results) - failed, 'failed': failed}
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    return 1 if failed else 0


if __name__ == '__main__':
    raise SystemExit(main())
