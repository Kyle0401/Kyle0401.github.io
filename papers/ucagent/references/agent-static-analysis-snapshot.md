
# IntegerDivider RTL 源码静态分析报告

<STATIC-BUG-SUMMARY>

## 一、潜在Bug汇总

本报告仅记录静态候选，不代表动态确认。按RV32M外部算术要求独立推导预期；README中的内部实现公式不能替代算术正确性判定。工作区仅提供生成Verilog，未提供Scala源码，因此基于当前Verilog分析。

| 序号 | Bug标签 | 功能路径 | 描述摘要 | 置信度 | 涉及文件 | 动态Bug关联 |
|------|---------|----------|----------|--------|----------|-------------|
| 001 | BG-STATIC-001-NEGATIVE-REMAINDER | FG-BOUNDARY/FC-POWER-TWO/CK-POWER-MIN-DIVISOR | 最小负数自除的余数疑似多一 | 高 | IntegerDivider_RTL/IntegerDivider.v | LINK-BUG-[BG-TBD] |

<STATIC-BUG-DETAILS>

## 二、详细分析

### <FG-BOUNDARY> 数值边界与位宽

#### <FC-POWER-TWO> 二次幂及相邻值

##### <CK-POWER-MIN-DIVISOR> 最小负除数

- <BG-STATIC-001-NEGATIVE-REMAINDER> 最小负数自除的余数疑似多一
  - <LINK-BUG-[BG-TBD]>
    - <FILE-IntegerDivider_RTL/IntegerDivider.v:253-255>

      ```verilog
      assign _zz_reminder_csaSum = ((io_negX ? (~ io_sum) : io_sum) + (io_negX ? (~ io_carry) : io_carry));
      assign _zz_reminder_csaSum_2 = (io_negX ? 4'b1111 : 4'b0000);
      assign _zz_reminder_csaSum_1 = {32'd0, _zz_reminder_csaSum_2};
      ```

    置信度：高。独立数学预期：signed=1、useRem=1、a=b=0x80000000，即-2147483648除以-2147483648，q=1，r=a-q*b=0。这不是MIN/-1溢出，也不是除零，两个幅值相等不走ALTB旁路。

    因果分析：令T=io_sum+io_carry+reminder_D（36位模运算）。负被除数路径取反两个CSA分量，并取反修正除数，三个取反项求和为-T-3；当前加15得到-T+12，而补码精确取负应加3。后续先算术右移2位，再按lzcD+1右移。对于绝对值0x80000000，lzcD=0、shiftR=1，额外12经过合计3位右移可能保留为1。若正常校正余数为0，预期当前路径输出1，从而破坏整除余数与恒等式。该偏置在较大右移量下可能被截去，因此常规小除数用例不足以排除缺陷。

    传播位置：同文件270至275行生成reminder_D、相加并输出余数；281至283行注册右移两位结果；834至848行将反归一化量设为lzcD+1。待动态验证时必须保持输入和模式至done，复位高5低1，在ready且!flush时发起请求，只在done有效窗口断言0；并获取真实波形核对最终有效余数与对应内部修正量，不凭中间状态定案。

    建议修复方向：复核负余数路径三个取反项的补码补偿，将15改为精确补偿3或先完整求和再统一补码取负，保留足够位宽及算术移位。此处只提出建议，不修改DUT。复验最小负数自除、最小负数除以其他高位负除数、正负整除和非整除、除零及溢出旁路；同时回归商不受影响。

<STATIC-BUG-PROGRESS>

## 三、批次分析进度

| 源文件 | 发现疑似Bug数 | 状态 |
|--------|---------------|------|
| <file sha256="4f1f590802b4eae50d889104403f359bcd70d39a4926b132557f03587379dc07">IntegerDivider_RTL/IntegerDivider.v</file> | 1 | 完成 |

已覆盖当前6FG、22FC、67CK对应路径：API参数和超时预算属于未来Python基础设施自检；RTL仅核对其握手和采样依赖。无符号与有符号常规算术核对归一化、CSA、商选择及在线转换；特殊值核对除零、溢出、ALTB优先级；边界核对32位幅值、归一化差0至31、移位宽度和末次修正；序列核对startDiv初始化、BUSY刷新优先、DONE单周期及异步复位状态恢复。

其他审查结论：计数最大cycle=17，接受后BUSY计数归零并完成可落在19周期上限内；数据通路持续更新和实时模式选择要求测试保持输入至done，不能把忙时任意改输入作为已定义事务。数据寄存器未复位但每笔请求初始化相关状态，不能仅凭未复位宣称Bug。ALTB只比较前导零数，同位长幅值较小由普通迭代处理，后续以9/13等用例验证，不据此直接报错。零输入lzc截取及商转换边界仍需动态定向与随机检验，本阶段未发现其他可充分论证的独立静态候选。
