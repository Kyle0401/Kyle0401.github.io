处理器功能验证实验文件

在 WSL Ubuntu 中解压 ZIP 并进入解压目录。Python 脚本使用 Python 3 标准库。运行时需要对应的 Linux 仿真器和 NEMU 参考库，版本和构建参数见论文笔记。

01-DiffTest
  registers-drain.bin 是原实验使用的减法镜像。difftest_demo.py 会重新生成它，并用两个 NutShell 仿真器验证正常写回和受控故障。

  python3 01-DiffTest/difftest_demo.py --normal "$DIFFTEST_BUILD_DIR/emu-good" --fault "$DIFFTEST_BUILD_DIR/emu-subfault" --reference "$NEMU_REF"

  如需生成两个仿真器的副本，先准备已经构建的顺序版 NutShell 和 NEMU 参考模型，并配置 Java、Mill、Verilator 与编译器。NutShell 使用 041f694、DiffTest 使用 261b441、NEMU 使用 af9d4ce。构建脚本使用 sub-result-bitflip.patch 所记录的同一处改动。

  python3 01-DiffTest/prepare_difftest_demo.py --nutshell "$NUTSHELL_DIR" --nemu-home "$NEMU_HOME"

02-LightSSS
  LIGHTSSS_EMU 指向使用 EMU_TRACE=fst 构建的减法故障版仿真器。脚本读取同包的减法镜像，输出重放日志和 FST。

  bash 02-LightSSS/run_lightsss_replay.sh "$LIGHTSSS_EMU" "$NEMU_REF"

03-ADDI
  四份 bin 是实际运行的输入。脚本会重新生成四份镜像，按提交日志核对立即数分箱和写回值。

  python3 03-ADDI/addi_coverage_demo.py --emulator "$DIFFTEST_BUILD_DIR/emu-good" --reference "$NEMU_REF"

04-XFUZZ
  XFUZZ_DEMO_DIR 指向已构建的 FuzzingNutShell，含 build/fuzzer。脚本按固定顺序读取同包 03-ADDI 的提交镜像，并验证 MUX 覆盖可复跑。NEMU_REF 使用前面的已验证参考库。

  python3 04-XFUZZ/run_fixed_addi.py "$XFUZZ_DEMO_DIR" --reference "$NEMU_REF"

论文笔记、实验结果及附件
https://kyle0401.github.io/papers/functional-verification/#chapter-7
