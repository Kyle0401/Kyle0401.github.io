#!/usr/bin/env python3
"""核对 RV32M 的除零、最小负数溢出及相同位模式的无符号解释。"""

import argparse
import json
from pathlib import Path
import sys

from first_divider import MASK32, reset_divider, submit_request
from signed_divider import expected_signed_division


BOUNDARY_CASES = (
    ('unsigned_by_zero', 17, 0, False),
    ('signed_by_zero', -17, 0, True),
    ('signed_overflow', -(1 << 31), -1, True),
    ('same_bits_unsigned', 1 << 31, MASK32, False),
)
MIN_SELF_CASE = ('signed_min_self', -(1 << 31), -(1 << 31), True)
OPERATIONS = {False: ('DIVU', 'REMU'), True: ('DIV', 'REM')}


def expected_unsigned_division(dividend, divisor):
    dividend = dividend & MASK32
    divisor = divisor & MASK32
    if divisor == 0:
        return MASK32, dividend
    return dividend // divisor, dividend % divisor


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--package-parent', type=Path, required=True)
    parser.add_argument('--report', type=Path)
    parser.add_argument('--min-self', action='store_true',
                        help='Run only the signed minimum-value self-division reproduction.')
    args = parser.parse_args()
    parent = args.package_parent.expanduser().resolve()
    if not parent.is_dir():
        parser.error(f'Exported package parent does not exist: {parent}')
    sys.path.insert(0, str(parent))
    from IntegerDivider import DUTIntegerDivider

    results = []
    cases = (MIN_SELF_CASE,) if args.min_self else BOUNDARY_CASES
    scope = ('Signed minimum-value self-division, quotient and remainder' if args.min_self
             else 'Four selected RV32M boundary pairs, each tested for quotient and remainder')
    dut = DUTIntegerDivider()
    try:
        reset_divider(dut)
        for name, dividend, divisor, signed in cases:
            if signed:
                expected_pair = expected_signed_division(dividend, divisor)
            else:
                expected_pair = expected_unsigned_division(dividend, divisor)
            print(f'Case: {name}, io_signed={int(signed)}, '
                  f'dividend_bits=0x{dividend & MASK32:08x}, '
                  f'divisor_bits=0x{divisor & MASK32:08x}', flush=True)
            for use_remainder in (0, 1):
                actual, trace = submit_request(dut, dividend, divisor, use_remainder, signed=signed)
                expected = expected_pair[use_remainder]
                operation = OPERATIONS[signed][use_remainder]
                passed = actual == expected
                print(f"{'PASS' if passed else 'FAIL'}: {operation} {name}, "
                      f'expected=0x{expected:08x}, actual=0x{actual:08x}', flush=True)
                results.append({'name': name, 'operation': operation, 'dividend': dividend,
                                'divisor': divisor, 'signed': signed, 'expected': expected,
                                'actual': actual, 'passed': passed, 'trace': trace})
    finally:
        dut.Finish()

    failed = sum(not result['passed'] for result in results)
    print(f'Summary: {len(results) - failed} passed, {failed} failed', flush=True)
    report = {'scope': scope,
              'spec_width': 32, 'results': results, 'passed': len(results) - failed, 'failed': failed}
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    return 1 if failed else 0


if __name__ == '__main__':
    raise SystemExit(main())
