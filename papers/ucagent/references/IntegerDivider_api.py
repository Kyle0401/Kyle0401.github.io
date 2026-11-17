#coding=utf-8
"""DUT construction, fixtures, and shared test APIs for IntegerDivider."""

import pytest
import ucagent
from IntegerDivider_function_coverage_def import get_coverage_groups
from toffee_test.reporter import set_func_coverage, set_line_coverage, get_file_in_tmp_dir
from toffee_test.reporter import set_user_info, set_title_info
from toffee import Bundle, Signals, Signal

# import your dut module here
from IntegerDivider import DUTIntegerDivider  # Replace with the actual DUT class import

import os


def current_path_file(file_name):
    """Resolve a path relative to this API module."""
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), file_name)


def get_coverage_data_path(request, dut, new_path:bool):
    """Get a per-test coverage path using the DUT's simulator defaults."""
    # 通过toffee_test.reporter提供的get_file_in_tmp_dir方法可以让各用例产生的文件名称不重复 (获取新路径需要new_path=True，获取已有路径new_path=False)
    # 获取测试用例名称，为每个测试用例创建对应的代码行覆盖率文件
    tc_name = request.node.name if request is not None else "IntegerDivider"
    suffix = ucagent.get_default_subfix(dut, "coverage")
    return get_file_in_tmp_dir(request, current_path_file("data/"), f"{tc_name}.{suffix}",  new_path=new_path)


def get_waveform_path(request, dut, new_path:bool):
    """Get a per-test waveform path using the DUT's simulator defaults."""
    # 通过toffee_test.reporter提供的get_file_in_tmp_dir方法可以让各用例产生的文件名称不重复 (获取新路径需要new_path=True，获取已有路径new_path=False)
    # 获取测试用例名称，为每个测试用例创建对应的波形
    tc_name = request.node.name if request is not None else "IntegerDivider"
    suffix = ucagent.get_default_subfix(dut, "waveform")
    return get_file_in_tmp_dir(request, current_path_file("data/"), f"{tc_name}.{suffix}",  new_path=new_path)


def create_dut(request):
    """
    Create a new instance of the IntegerDivider for testing.
    
    Returns:
        dut_instance: An instance of the IntegerDivider class.
    """
    # 如果是正在生成测试模板，返回fake DUT用于提速（模板中不会真运行DUT）
    if ucagent.is_imp_test_template():
        return ucagent.get_fake_dut(DUTIntegerDivider)

    # 创建真实实例并绑定时钟；复位和输入驱动由后续环境/API负责。
    dut = DUTIntegerDivider()
    dut.InitClock("clk")

    # 设置覆盖率生成文件(必须设置覆盖率文件，否则无法统计覆盖率，导致测试失败)
    dut.SetCoverage(get_coverage_data_path(request, dut, new_path=True))

    # 设置波形生成文件
    dut.SetWaveform(get_waveform_path(request, dut, new_path=True))

    return dut


@pytest.fixture(scope="function") # 用scope="function"确保每个测试用例都创建了一个全新的DUT
def dut(request):
    """每例独立创建芯片，采样并上报覆盖率，异常时也释放仿真资源。"""
    dut = create_dut(request)  # 工厂已绑定clk；复位由环境/API执行。
    func_coverage_group = []
    try:
        # 真实与fake DUT均保留覆盖组、自动采样和fc_cover契约。
        func_coverage_group = get_coverage_groups(dut)
        dut.StepRis(lambda _: [g.sample() for g in func_coverage_group])
        setattr(dut, "fc_cover", {g.name: g for g in func_coverage_group})
        yield dut
    finally:
        try:
            set_func_coverage(request, func_coverage_group)
            # 使用创建时同一个实例取回已有路径，不生成新路径。
            set_line_coverage(
                request, get_coverage_data_path(request, dut, new_path=False),
                ignore=current_path_file("IntegerDivider.ignore"))
            set_user_info("UCAgent-0.9.2.dev1+g123e02896", "unitychip@bosc.ac.cn")
            set_title_info("IntegerDivider Test Report")
        finally:
            try:
                for g in func_coverage_group:
                    g.clear()
            finally:
                dut.Finish()

@pytest.fixture(scope="function") # 用scope="function"确保每个测试用例都创建了一个全新的 Mock DUT
def mock_dut():
    return ucagent.get_mock_dut_from(DUTIntegerDivider)

class IntegerDividerPins(Bundle):
    """单一除法接口及全局时钟复位；位宽从实际DUT绑定获得。

    只有一个运算端口，clk/reset不共享io_前缀，使用完整字典映射。
    时钟由create_dut管理，业务驱动不手动翻转clk。
    """

    clk, reset, valid, flush, signed, useRem = Signals(6)
    dividend, divisor, ready, done, result = Signals(5)

    @classmethod
    def for_dut(cls, dut):
        pins = cls.from_dict({
            "clk": "clk", "reset": "reset",
            "valid": "io_valid", "flush": "io_flush",
            "signed": "io_signed", "useRem": "io_useRem",
            "dividend": "io_dividend", "divisor": "io_divisor",
            "ready": "io_ready", "done": "io_done", "result": "io_result",
        })
        pins.bind(dut)
        return pins


# 定义IntegerDividerEnv类，封装DUT的引脚和常用操作
class IntegerDividerEnv:
    """独立运算模块的单端口环境，无需内存或总线Mock依赖。

    构造时仅清零输入；reset方法显式完成规格要求的5高1低复位。
    仿真资源生命周期由dut fixture统一管理。
    """

    def __init__(self, dut):
        self.dut = dut
        # 模板只执行覆盖反标；fake DUT没有可供Bundle绑定的真实引脚。
        # 仍保留同一dut及其fixture建立的fc_cover，不构造替代实例。
        if ucagent.is_imp_test_template():
            return
        self.io = IntegerDividerPins.for_dut(dut)
        self.io.set_all(0)

    def reset(self):
        """停止请求并执行同步高有效复位，返回可发起请求的环境。"""
        self.io.set_all(0)
        self.io.reset.value = 1
        self.Step(5)
        self.io.reset.value = 0
        self.Step(1)

    # 直接导出DUT的通用操作Step
    def Step(self, i:int = 1):
        return self.dut.Step(i)


# 定义env fixture, 请取消下面的注释，并根据需要修改名称
@pytest.fixture(scope="function") # 用scope="function"确保每个测试用例都创建了一个全新的Env
def env(dut):
    # 一般情况下为每个test都创建全新的 env 不需要 yield
    return IntegerDividerEnv(dut)


# 定义其他Env
# @pytest.fixture(scope="function") # 用scope="function"确保每个测试用例都创建了一个全新的Env
# def env1(dut):
#     return MyEnv1(dut)
#
#
# 根据DUT的功能需要，定义API函数， API函数需要通用且稳定，不是越多越好
# def api_IntegerDivider_{operation_name}(env, ...):
#    """
#    api description and parameters
#    ...
#    """
#    env.some_input.value = value
#    env.Step()
#    return env.some_output.value
#    # Replace with the actual API function for your DUT
#    ...


# 仅在DUT/API/fixture实现阶段按任务完善本模板。进入测试模板创建和测试实现阶段后，本文件是稳定公共基础设施，
# 不得为了绕过fake DUT、mark_function或覆盖率错误而改写fixture、删除覆盖组/fc_cover绑定或取消coverage上报。


def _check_cycle_budget(max_cycles):
    """检查推进预算，拒绝布尔值及非正整数。"""
    if type(max_cycles) is not int:
        raise TypeError("max_cycles必须为整数")
    if max_cycles <= 0:
        raise ValueError("max_cycles必须大于0")


def api_IntegerDivider_init(env, max_cycles: int = 6) -> None:
    """清零输入并执行规格要求的高5周期、低1周期复位。

    Args:
        env: IntegerDividerEnv实例。
        max_cycles: 本次调用允许推进的总周期数，默认6，至少为6。
    Returns:
        None: 完成复位后返回，可继续调用运算API。
    Raises:
        TypeError: 预算不是整数。
        ValueError: 预算不是正数。
        TimeoutError: 预算不足6周期；此时不驱动任何引脚。
    Example:
        api_IntegerDivider_init(env)
    Note:
        使用环境reset中的Step序列，不修改时钟配置。
    """
    _check_cycle_budget(max_cycles)
    if max_cycles < 6:
        raise TimeoutError("初始化需要6周期")
    env.reset()


def api_IntegerDivider_operate(env, dividend: int, divisor: int,
                              signed: int = 0, use_rem: int = 0,
                              max_cycles: int = 20) -> int:
    """发起一个32位除法事务，仅在done有效时返回原始32位结果。

    Args:
        env: 已完成初始化、无其他并发驱动者的IntegerDividerEnv实例。
        dividend: 被除数的32位无符号编码，范围0到0xffffffff。
        divisor: 除数的32位无符号编码，允许0；负数应先编码为补码。
        signed: 0表示无符号，1表示有符号；接受整数0/1或bool。
        use_rem: 0返回商，1返回余数；接受整数0/1或bool。
        max_cycles: 等待ready、请求接受及等待done的总Step预算，默认20。
    Returns:
        int: done有效时的io_result，无符号32位编码，不进行算术修正。
    Raises:
        TypeError: 操作数、选择位或预算类型不正确。
        ValueError: 操作数越界、选择位不是0/1或预算非正。
        RuntimeError: 调用时reset或flush仍有效。
        TimeoutError: 总周期预算耗尽，异常说明处于哪个等待阶段。
    Example:
        result = api_IntegerDivider_operate(env, 100, 7, 0, 0)
    Note:
        请求只在ready有效时拉高valid并Step一次；随后撤销valid。
        数据和模式保持到done采样完成，不假定硬件锁存了所有输入。
        预算最后一次Step之后仍检查done，避免端点误判超时。
        超时仅撤销valid，可能仍有未完成事务；再次使用前应显式初始化。
    """
    _check_cycle_budget(max_cycles)
    for name, value in (("dividend", dividend), ("divisor", divisor)):
        if type(value) is not int:
            raise TypeError(f"{name}必须为整数编码")
        if not 0 <= value <= 0xffffffff:
            raise ValueError(f"{name}超出32位编码范围")
    for name, value in (("signed", signed), ("use_rem", use_rem)):
        if type(value) not in (int, bool):
            raise TypeError(f"{name}必须为0或1")
        if value not in (0, 1):
            raise ValueError(f"{name}必须为0或1")
    io = env.io
    if io.reset.value or io.flush.value:
        raise RuntimeError("reset/flush有效时不能发起运算")
    spent = 0

    def advance(phase):
        nonlocal spent
        if spent >= max_cycles:
            raise TimeoutError(
                f"{phase}超时: dividend=0x{dividend:08x}, "
                f"divisor=0x{divisor:08x}, signed={int(signed)}, "
                f"use_rem={int(use_rem)}, cycles={spent}")
        env.Step(1)
        spent += 1

    io.valid.value = 0
    while not io.ready.value:
        advance("等待ready")
    io.dividend.value = dividend
    io.divisor.value = divisor
    io.signed.value = int(signed)
    io.useRem.value = int(use_rem)
    io.valid.value = 1
    try:
        advance("请求接受")
        io.valid.value = 0
        while not io.done.value:
            advance("等待done")
        return int(io.result.value)
    finally:
        io.valid.value = 0


def api_IntegerDivider_div(env, dividend: int, divisor: int,
                          signed: int = 0, max_cycles: int = 20) -> int:
    """执行商运算，复用通用事务API的握手、预算和异常处理。

    Args:
        env: 已初始化的环境。
        dividend: 被除数32位编码。
        divisor: 除数32位编码，允许0。
        signed: 0无符号、1有符号。
        max_cycles: 总推进周期预算，默认20。
    Returns:
        int: 商的32位编码。
    Raises:
        TypeError: 参数类型错误。
        ValueError: 参数值越界。
        RuntimeError: reset或flush有效。
        TimeoutError: 总周期预算耗尽。
    Example:
        quotient = api_IntegerDivider_div(env, 100, 7)
    """
    return api_IntegerDivider_operate(env, dividend, divisor, signed, 0, max_cycles)


def api_IntegerDivider_rem(env, dividend: int, divisor: int,
                          signed: int = 0, max_cycles: int = 20) -> int:
    """执行余数运算，复用通用事务API的握手、预算和异常处理。

    Args:
        env: 已初始化的环境。
        dividend: 被除数32位编码。
        divisor: 除数32位编码，允许0。
        signed: 0无符号、1有符号。
        max_cycles: 总推进周期预算，默认20。
    Returns:
        int: 余数的32位编码。
    Raises:
        TypeError: 参数类型错误。
        ValueError: 参数值越界。
        RuntimeError: reset或flush有效。
        TimeoutError: 总周期预算耗尽。
    Example:
        remainder = api_IntegerDivider_rem(env, 100, 7)
    """
    return api_IntegerDivider_operate(env, dividend, divisor, signed, 1, max_cycles)


@pytest.fixture(scope="function")
def ref_model():
    """每例创建独立功能模型，并在结束时执行清理。"""
    from IntegerDivider_reference_model import IntegerDividerReferenceModel
    model = IntegerDividerReferenceModel()
    try:
        yield model
    finally:
        model.cleanup()
