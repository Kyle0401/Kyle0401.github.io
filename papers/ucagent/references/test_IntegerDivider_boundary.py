from IntegerDivider_api import *

MASK = 0xFFFFFFFF
EXTREMES = (0x7FFFFFFE, 0x7FFFFFFF, 0x80000000, 0x80000001, 0xFFFFFFFE, MASK)


def _compare_vectors(env, ref_model, vectors):
    """逐笔在API的done窗口比较；收集失败以完成同一测试内的所有边界。"""
    errors = []
    for tid, (a, b, s, r) in enumerate(vectors):
        expected = ref_model.operate(a, b, s, r)
        actual = api_IntegerDivider_operate(env, a, b, s, r)
        if actual != expected:
            errors.append(f"transaction={tid} a=0x{a:08x} b=0x{b:08x} signed={s} rem={r} "
                          f"expected=0x{expected:08x} actual=0x{actual:08x} "
                          f"done={env.io.done.value} ready={env.io.ready.value} valid={env.io.valid.value}")
    return errors


def test_extreme_values(env, ref_model):
    """极值及相邻编码的有符号和无符号运算。"""
    env.dut.fc_cover["FG-BOUNDARY"].mark_function("FC-EXTREMES", test_extreme_values, ["CK-EXTREME-U", "CK-EXTREME-S"])
    api_IntegerDivider_init(env)
    vectors = [(a, b, s, r) for a in EXTREMES for s in (0, 1)
               for b in ((3, 0x7FFFFFFF) if not s else (3, (-3) & MASK)) for r in (0, 1)]
    assert _compare_vectors(env, ref_model, vectors) == [], "极值结果与独立模型不符"


def test_unit_divisors(env, ref_model):
    """除以正一和负一的恒等、取负与零余数。"""
    env.dut.fc_cover["FG-BOUNDARY"].mark_function("FC-UNIT-DIVISOR", test_unit_divisors, ["CK-DIVIDE-POS-ONE", "CK-DIVIDE-NEG-ONE"])
    api_IntegerDivider_init(env)
    vectors = [(a, 1, s, r) for a in (1, 0x7FFFFFFF, 0x80000000, MASK) for s in (0, 1) for r in (0, 1)]
    vectors += [(a & MASK, MASK, 1, r) for a in (1, -1, 123, -123, 0x7FFFFFFF) for r in (0, 1)]
    errors = _compare_vectors(env, ref_model, vectors)
    assert errors == [], '\n'.join(errors)


def test_power_boundaries(env, ref_model):
    """二次幂除数、相邻值及有符号最小负除数。"""
    env.dut.fc_cover["FG-BOUNDARY"].mark_function("FC-POWER-TWO", test_power_boundaries, ["CK-POWER-DIVISOR", "CK-POWER-NEIGHBORS", "CK-POWER-SIGNED", "CK-POWER-MIN-DIVISOR"])
    api_IntegerDivider_init(env)
    vectors = [(a, 1 << k, 0, r) for k in range(32)
               for a in (MASK, (1 << k)-1, 1 << k, (1 << k)+1) for r in (0, 1)]
    vectors += [(MASK, (1 << k)+delta, 0, r) for k in (1, 15, 16, 30, 31) for delta in (-1, 1) for r in (0, 1)]
    vectors += [((-(1 << k)-1) & MASK, (sign*(1 << k)) & MASK, 1, r)
                for k in (1, 15, 30) for sign in (-1, 1) for r in (0, 1)]
    vectors += [(a, 0x80000000, s, r) for a in (0, 1, 0x7FFFFFFF, 0x80000000, 0x80000001, MASK)
                for s in (0, 1) for r in (0, 1)]
    errors = _compare_vectors(env, ref_model, vectors)
    assert errors == [], '\n'.join(errors)


def test_near_equal_values(env, ref_model):
    """相等幅值、超一及整数倍两侧的商跃迁。"""
    env.dut.fc_cover["FG-BOUNDARY"].mark_function("FC-NEAR-EQUAL", test_near_equal_values, ["CK-EQUAL-MAGNITUDE", "CK-ONE-ABOVE", "CK-MULTIPLE-EDGE"])
    api_IntegerDivider_init(env)
    pairs = [(12345, 12345), (12346, 12345)] + [(37*123+d, 37) for d in (-1, 0, 1)]
    vectors = [(a, b, 0, r) for a, b in pairs for r in (0, 1)]
    vectors += [((a*sa) & MASK, (b*sb) & MASK, 1, r) for a, b in pairs
                for sa in (-1, 1) for sb in (-1, 1) for r in (0, 1)]
    errors = _compare_vectors(env, ref_model, vectors)
    assert errors == [], '\n'.join(errors)


def test_normalization_spans(env, ref_model):
    """有效位跨度的奇偶、最长与全范围。"""
    env.dut.fc_cover["FG-BOUNDARY"].mark_function("FC-NORMALIZATION", test_normalization_spans, ["CK-LZC-EVEN", "CK-LZC-ODD", "CK-LZC-MAX", "CK-LZC-ALL-SPANS"])
    api_IntegerDivider_init(env)
    # d=0的a+1跨入下一跨度，但a=1仍覆盖d=0；所有输入均为合法32位。
    pairs = [(a, 1) for d in range(32) for a in (1 << d, (1 << d)+1)]
    pairs += [((1 << (d+1))+1, 3) for d in range(31)] + [(MASK, 1), (MASK, 3)]
    # 以实际输入位长确认跨度，避免只按循环变量宣称覆盖。
    assert {a.bit_length() - b.bit_length() for a, b in pairs} == set(range(32))
    assert all(0 <= a <= MASK and 0 < b <= MASK for a, b in pairs)
    errors = _compare_vectors(env, ref_model, [(a, b, 0, r) for a, b in pairs for r in (0, 1)])
    assert errors == [], '\n'.join(errors)


def test_structured_patterns(env, ref_model):
    """交替位、稀疏连续位及结构化除数。"""
    env.dut.fc_cover["FG-BOUNDARY"].mark_function("FC-BIT-PATTERNS", test_structured_patterns, ["CK-ALTERNATING", "CK-SPARSE-DENSE", "CK-PATTERN-DIVISOR"])
    api_IntegerDivider_init(env)
    pairs = [(a, b) for a in (0xAAAAAAAA, 0x55555555) for b in (3, 7, 0x5555)]
    pairs += [(a, b) for a in (0x80000001, 0x01010101, 0xFFFF0000, 0xFFFF) for b in (17, 257)]
    pairs += [(a, b) for b in (0xAAAAAAAA, 0x55555555, 0x80000001, 0xFFFF) for a in (MASK, b-1, b, b+1)]
    errors = _compare_vectors(env, ref_model, [(a, b, s, r) for a, b in pairs for s in (0, 1) for r in (0, 1)])
    assert errors == [], '\n'.join(errors)
