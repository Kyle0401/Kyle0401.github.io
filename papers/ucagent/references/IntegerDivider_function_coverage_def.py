# coding=utf-8
"""顶层功能覆盖：只在有效完成窗口比较独立整数公式，不访问内部信号。"""
import toffee.funcov as fc

MASK = (1 << 32) - 1


def signed32(value):
    return value - (1 << 32) if value & (1 << 31) else value


def result_expected(a, b, signed, rem):
    """RV32M 无界整数公式，负商向零截断，最后编码成32位。"""
    x, y = (signed32(a), signed32(b)) if signed else (a, b)
    if y == 0:
        return a if rem else MASK
    q = abs(x) // abs(y)
    if (x < 0) != (y < 0):
        q = -q
    return (x - q * y if rem else q) & MASK


def completed(dut, select):
    """输入保持至done的接口契约；无效输出永远不能命中算术点。"""
    if dut is None or dut.reset.value or dut.io_flush.value or not dut.io_done.value:
        return False
    a, b = int(dut.io_dividend.value), int(dut.io_divisor.value)
    s, r = int(dut.io_signed.value), int(dut.io_useRem.value)
    return bool(select(a, b, s, r) and int(dut.io_result.value) == result_expected(a, b, s, r))


def api_checked(dut, name):
    """API自检完成全部异常/不推进/恢复断言后，显式登记的证据。

    参数拒绝及Mock预算没有对应硬件引脚，不能用ready或普通done冒充。
    后续API测试仅在所有相关断言成功后将CK名加入coverage_api_checks并sample。
    """
    return dut is not None and name in getattr(dut, 'coverage_api_checks', set())


def get_coverage_groups(dut):
    """每次构造全新覆盖对象，dut=None支持结构查询；闭包绑定引用而非引脚值。"""
    groups = {name: fc.CovGroup(name) for name in (
        'FG-API', 'FG-UNSIGNED', 'FG-SIGNED', 'FG-SPECIAL', 'FG-BOUNDARY', 'FG-SEQUENCE')}

    def add(group, point, selectors):
        groups[group].add_watch_point(dut, {
            ck: (lambda d, pick=pick: completed(d, pick)) for ck, pick in selectors.items()
        }, name=point)

    add('FG-API', 'FC-API-RESET', {
        'CK-RESET-READY': lambda a,b,s,r: (a,b,s,r) == (21,3,0,0)})
    api = {
        'CK-API-DIVU': lambda a,b,s,r: (a,b,s,r) == (23,5,0,0),
        'CK-API-REMU': lambda a,b,s,r: (a,b,s,r) == (23,5,0,1),
        'CK-API-DIV': lambda a,b,s,r: (a,b,s,r) == ((-23)&MASK,5,1,0),
        'CK-API-REM': lambda a,b,s,r: (a,b,s,r) == ((-23)&MASK,5,1,1),
        'CK-API-ENCODING-MODES': lambda a,b,s,r: a == MASK and b == 2,
    }
    groups['FG-API'].add_watch_point(dut, {
        **{ck: (lambda d, pick=pick: completed(d, pick)) for ck,pick in api.items()},
        **{ck: (lambda d, name=ck: api_checked(d, name)) for ck in (
            'CK-API-PARAMETERS', 'CK-API-REJECT-BOUNDARIES', 'CK-API-TIMEOUT', 'CK-API-BUDGET-EDGE')},
    }, name='FC-API-OPERATE')
    add('FG-BOUNDARY', 'FC-BIT-PATTERNS', {
        'CK-ALTERNATING': lambda a,b,s,r: a in (0xAAAAAAAA,0x55555555) and b in (3,7,0x5555),
        'CK-SPARSE-DENSE': lambda a,b,s,r: a in (0x80000001,0x01010101,0xFFFF0000,0xFFFF) and b in (17,257),
        'CK-PATTERN-DIVISOR': lambda a,b,s,r: b in (0xAAAAAAAA,0x55555555,0x80000001,0xFFFF) and a in (MASK,b-1,b,b+1),
    })
    extremes = (0x7FFFFFFE,0x7FFFFFFF,0x80000000,0x80000001,0xFFFFFFFE,MASK)
    add('FG-BOUNDARY', 'FC-EXTREMES', {
        'CK-EXTREME-U': lambda a,b,s,r: not s and a in extremes and b in (3,0x7FFFFFFF),
        'CK-EXTREME-S': lambda a,b,s,r: s and a in extremes and b in (3,(-3)&MASK),
    })
    def magnitudes(a,b,s):
        return (abs(signed32(a)),abs(signed32(b))) if s else (a,b)
    add('FG-BOUNDARY', 'FC-NEAR-EQUAL', {
        'CK-EQUAL-MAGNITUDE': lambda a,b,s,r: magnitudes(a,b,s) == (12345,12345),
        'CK-ONE-ABOVE': lambda a,b,s,r: magnitudes(a,b,s) == (12346,12345),
        'CK-MULTIPLE-EDGE': lambda a,b,s,r: magnitudes(a,b,s)[1] == 37 and magnitudes(a,b,s)[0] in (4550,4551,4552),
    })
    add('FG-BOUNDARY', 'FC-NORMALIZATION', {
        'CK-LZC-EVEN': lambda a,b,s,r: not s and b == 3 and a in tuple((1 << (d+1))+1 for d in (0,2,14,30)),
        'CK-LZC-MAX': lambda a,b,s,r: not s and a == MASK and b in (1,3),
        'CK-LZC-ODD': lambda a,b,s,r: not s and b == 3 and a in tuple((1 << (d+1))+1 for d in (1,3,15,29)),
        'CK-LZC-ALL-SPANS': lambda a,b,s,r: not s and (
            (b == 1 and any(a in (1<<d,(1<<d)+1) for d in range(32))) or
            (b == 3 and any(a == (1<<(d+1))+1 for d in range(31)))),
    })
    add('FG-BOUNDARY', 'FC-POWER-TWO', {
        'CK-POWER-DIVISOR': lambda a,b,s,r: not s and b > 0 and b & (b-1) == 0,
        'CK-POWER-MIN-DIVISOR': lambda a,b,s,r: b == 0x80000000,
        'CK-POWER-NEIGHBORS': lambda a,b,s,r: not s and b in tuple((1<<k)+delta for k in (1,15,16,30,31) for delta in (-1,1)),
        'CK-POWER-SIGNED': lambda a,b,s,r: s and signed32(a) < 0 and abs(signed32(b)) in (2,1<<15,1<<30),
    })
    add('FG-BOUNDARY', 'FC-UNIT-DIVISOR', {
        'CK-DIVIDE-POS-ONE': lambda a,b,s,r: b == 1,
        'CK-DIVIDE-NEG-ONE': lambda a,b,s,r: s and b == MASK and a != 0x80000000,
    })
    # 跨周期检查通过顶层引脚监视器保存真实握手/复位/刷新历史。
    monitor = PinHistory()
    # 结构探针的FakeDut仅提供占位属性，不可注册真实仿真回调。
    if dut is not None and callable(getattr(dut, 'StepRis', None)):
        dut.StepRis(lambda _: monitor.sample(dut))
    temporal = {
        'FC-COMPLETION': ('CK-DONE-NORMAL','CK-DONE-SPECIAL'),
        'FC-FLUSH-RECOVERY': ('CK-FLUSH-BUSY-RESTART','CK-FLUSH-EARLY-LATE','CK-FLUSH-IDLE-BLOCK'),
        'FC-RESET-RECOVERY': ('CK-RESET-BUSY','CK-RESET-RESTART'),
        'FC-SEQUENTIAL': ('CK-MODE-SWITCH','CK-SAME-INPUT-MODE-SWITCH','CK-SPECIAL-NORMAL-SWITCH'),
    }
    for point, names in temporal.items():
        groups['FG-SEQUENCE'].add_watch_point(dut, {
            name: (lambda d, name=name: d is not None and name in monitor.hits) for name in names
        }, name=point)
    add('FG-SIGNED', 'FC-DIV', {
        'CK-DIV-EXACT': lambda a,b,s,r: s and not r and (signed32(a),signed32(b)) in ((-144,12),(144,-12)),
        'CK-DIV-NN': lambda a,b,s,r: s and not r and (signed32(a),signed32(b)) == (-23,-5),
        'CK-DIV-PP': lambda a,b,s,r: (a,b,s,r) == (23,5,1,0),
        'CK-DIV-NP': lambda a,b,s,r: (a,b,s,r) == ((-23)&MASK,5,1,0),
        'CK-DIV-PN': lambda a,b,s,r: (a,b,s,r) == (23,(-5)&MASK,1,0),
    })
    add('FG-SIGNED', 'FC-REM', {
        'CK-REM-EXACT': lambda a,b,s,r: s and r and magnitudes(a,b,s) == (144,12),
        'CK-REM-NEGATIVE': lambda a,b,s,r: s and r and signed32(a) == -23 and abs(signed32(b)) == 5,
        'CK-REM-POSITIVE': lambda a,b,s,r: s and r and a == 23 and abs(signed32(b)) == 5,
    })
    groups['FG-SIGNED'].add_watch_point(dut, {
        'CK-S-IDENTITY': pair_check(lambda a,b,s,r: s and magnitudes(a,b,s) == (1234567,97)),
        'CK-S-ZERO-QUOTIENT-SIGNS': pair_check(lambda a,b,s,r: s and magnitudes(a,b,s) == (1,2)),
    }, name='FC-SIGNED-IDENTITY')
    add('FG-SPECIAL', 'FC-DIVZERO', {
        'CK-DIVZERO-QUOTIENT': lambda a,b,s,r: b == 0 and a in (1,0x7FFFFFFF,MASK) and not r,
        'CK-DIVZERO-REMAINDER': lambda a,b,s,r: b == 0 and a in (1,0x7FFFFFFF,MASK) and r,
        'CK-MIN-ZERO': lambda a,b,s,r: a == 0x80000000 and b == 0,
        'CK-ZERO-ZERO': lambda a,b,s,r: a == b == 0,
    })
    add('FG-SPECIAL', 'FC-OVERFLOW', {
        'CK-OVERFLOW-Q': lambda a,b,s,r: (a,b,s,r) == (0x80000000,MASK,1,0),
        'CK-OVERFLOW-R': lambda a,b,s,r: (a,b,s,r) == (0x80000000,MASK,1,1),
        'CK-OVERFLOW-UNSIGNED': lambda a,b,s,r: not s and (a,b) == (0x80000000,MASK),
        'CK-OVERFLOW-NEIGHBORS': lambda a,b,s,r: s and (a,b) in ((0x80000001,MASK),(0x80000000,MASK-1),(0x80000000,1)),
    })
    add('FG-SPECIAL', 'FC-SMALL-DIVIDEND', {
        'CK-SMALL-DIFF-LZC': lambda a,b,s,r: magnitudes(a,b,s) == (3,32),
        'CK-SMALL-SAME-LZC': lambda a,b,s,r: magnitudes(a,b,s) == (9,13),
    })
    add('FG-SPECIAL', 'FC-ZERO-DIVIDEND', {
        'CK-ZERO-NONZERO': lambda a,b,s,r: a == 0 and b in (1,7,0x80000000,MASK),
    })
    add('FG-UNSIGNED', 'FC-DIVU', {
        'CK-DIVU-EXACT': lambda a,b,s,r: (a,b,s,r) == (144,12,0,0),
        'CK-DIVU-INEXACT': lambda a,b,s,r: (a,b,s,r) == (145,12,0,0),
        'CK-DIVU-HIGH-BIT': lambda a,b,s,r: (a,b,s,r) == (0xF0000001,7,0,0),
    })
    add('FG-UNSIGNED', 'FC-REMU', {
        'CK-REMU-EXACT': lambda a,b,s,r: (a,b,s,r) == (144,12,0,1),
        'CK-REMU-INEXACT': lambda a,b,s,r: (a,b,s,r) == (145,12,0,1),
        'CK-REMU-HIGH-BIT': lambda a,b,s,r: (a,b,s,r) == (0xF0000001,7,0,1),
    })
    groups['FG-UNSIGNED'].add_watch_point(dut, {
        'CK-U-IDENTITY': pair_check(lambda a,b,s,r: not s and (a,b) == (0xE1234567,37)),
        'CK-U-HIGH-DIVISOR-IDENTITY': pair_check(lambda a,b,s,r: not s and b in (0x80000000,0x80000001,MASK) and a in (b-1,b,MASK)),
    }, name='FC-UNSIGNED-IDENTITY')
    return list(groups.values())


class PinHistory:
    """每实例顶层引脚历史。计数单位为StepRis，取消事务不参与结果序列。

    ready/valid在接受边沿附近可由回调看到前态或后态；同时识别合法握手
    及valid保持下ready下降，且只允许一个在途事务。输入必须保持至done。
    """
    def __init__(self):
        self.hits = set()
        self.cycle = 0
        self.active = None
        self.previous_ready = False
        self.reset_count = 0
        self.reset_pending = None
        self.flush_pending = None
        self.pending_done = None
        self.history = []
        self.flush_ages = set()

    def sample(self, d):
        self.cycle += 1
        reset, flush, valid, ready, done = (bool(getattr(d,n).value) for n in
            ('reset','io_flush','io_valid','io_ready','io_done'))
        pins = tuple(int(getattr(d,n).value) for n in
            ('io_dividend','io_divisor','io_signed','io_useRem'))
        if reset:
            if not self.reset_count:
                self.reset_pending = 'CK-RESET-BUSY' if self.active else 'CK-RESET-RESTART'
            self.reset_count += 1
            self.active = self.pending_done = None
            self.history.clear()
            self.previous_ready = ready
            return
        if self.reset_count:
            if self.reset_count < 5:
                self.reset_pending = None
            self.reset_count = 0
        if flush:
            if self.active and not done:
                age = self.cycle - self.active[0]
                self.flush_ages.add('early' if age <= 3 else 'late')
                self.flush_pending = 'CK-FLUSH-BUSY-RESTART'
            elif ready and valid and not done:
                self.flush_pending = 'CK-FLUSH-IDLE-BLOCK'
            self.active = self.pending_done = None
            self.previous_ready = ready
            return
        if self.pending_done:
            special = self.pending_done
            if not done and ready:
                self.hits.add('CK-DONE-SPECIAL' if special == 2 else 'CK-DONE-NORMAL')
            self.pending_done = None
        # 上升沿后特殊事务可能已直接DONE，前一采样ready仍证明该valid合法接受。
        if self.active is None and valid and (ready or self.previous_ready):
            self.active = (self.cycle, pins)
        if done and self.active:
            start, request = self.active
            a,b,s,r = request
            if pins == request and self.cycle-start <= 19 and int(d.io_result.value) == result_expected(a,b,s,r):
                x,y = (abs(signed32(a)),abs(signed32(b))) if s else (a,b)
                special = not b or x < y
                self.pending_done = 2 if special else 1
                if self.reset_pending:
                    self.hits.add(self.reset_pending)
                    self.reset_pending = None
                if self.flush_pending:
                    self.hits.add(self.flush_pending)
                    if self.flush_ages == {'early','late'}:
                        self.hits.add('CK-FLUSH-EARLY-LATE')
                    self.flush_pending = None
                self.history.append((request, special))
                modes = [item[0][2:] for item in self.history]
                if modes[-4:] == [(0,0),(1,1),(1,0),(0,1)]:
                    self.hits.add('CK-MODE-SWITCH')
                same = self.history[-4:]
                if len(same) == 4 and all(item[0][:2] == (0xFFFFFFE9,5) for item in same) and modes[-4:] == [(0,0),(0,1),(1,0),(1,1)]:
                    self.hits.add('CK-SAME-INPUT-MODE-SWITCH')
                if len(self.history) >= 5 and [item[1] for item in self.history[-5:]] == [True,False,False,True,False] and self.history[-5][0][1] == 0 and self.history[-3][0][:3] == (0x80000000,MASK,1):
                    self.hits.add('CK-SPECIAL-NORMAL-SWITCH')
            self.active = None
        self.previous_ready = ready


def pair_check(select):
    """仅收集有效且独立公式比较通过的q/r；同输入双模式齐备才验证恒等式。"""
    pairs = {}
    def check(d):
        if not completed(d, select):
            return False
        a,b,s,r = (int(getattr(d,n).value) for n in ('io_dividend','io_divisor','io_signed','io_useRem'))
        data = pairs.setdefault((a,b,s), {})
        data[r] = int(d.io_result.value)
        if 0 not in data or 1 not in data or not b:
            return False
        x,y,q,rem = (signed32(a),signed32(b),signed32(data[0]),signed32(data[1])) if s else (a,b,data[0],data[1])
        return x == q*y+rem and abs(rem) < abs(y) and (not rem or not s or (rem < 0) == (x < 0))
    return check
