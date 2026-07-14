# CUDA Programming Guide v13.3 中英术语表

本表用于本译本的全局术语一致性检查。API、类型、标识符、命令和产品名保持原文拼写。

| 英文术语 | 统一译法 | 类别 |
| --- | --- | --- |
| kernel | 内核 | 核心模型 |
| kernel launch | 内核启动 | 核心模型 |
| launch configuration | 启动配置 | 核心模型 |
| thread | 线程 | 核心模型 |
| warp | 线程束 | 核心模型 |
| lane | 通道 | 核心模型 |
| thread block | 线程块 | 核心模型 |
| grid | 网格 | 核心模型 |
| thread block cluster | 线程块簇 | 核心模型 |
| cooperative thread array (CTA) | 协作线程阵列（CTA） | 核心模型 |
| streaming multiprocessor (SM) | 流式多处理器（SM） | 核心模型 |
| compute capability | 计算能力 | 核心模型 |
| occupancy | 占用率 | 核心模型 |
| SIMT | SIMT（单指令多线程） | 核心模型 |
| SIMD | SIMD（单指令多数据） | 核心模型 |
| independent thread scheduling | 独立线程调度 | 核心模型 |
| divergence | 分歧 | 核心模型 |
| predication | 谓词化执行 | 核心模型 |
| Tile | Tile | Tile 模型 |
| Tile kernel | Tile 内核 | Tile 模型 |
| Tile function | Tile 函数 | Tile 模型 |
| tile block | Tile 块 | Tile 模型 |
| tile space | Tile 空间 | Tile 模型 |
| tensor span | 张量跨度 | Tile 模型 |
| partition view | 分区视图 | Tile 模型 |
| gather | 聚集 | Tile 模型 |
| scatter | 散布 | Tile 模型 |
| broadcasting | 广播 | Tile 模型 |
| reduction | 归约 | Tile 模型 |
| scan | 扫描 | Tile 模型 |
| device memory | 设备内存 | 内存 |
| host memory | 主机内存 | 内存 |
| system memory | 系统内存 | 内存 |
| global memory | 全局内存 | 内存 |
| shared memory | 共享内存 | 内存 |
| distributed shared memory | 分布式共享内存 | 内存 |
| local memory | 局部内存 | 内存 |
| constant memory | 常量内存 | 内存 |
| texture memory | 纹理内存 | 内存 |
| surface memory | 表面内存 | 内存 |
| Unified Memory | 统一内存 | 内存 |
| managed memory | 托管内存 | 内存 |
| unified virtual addressing (UVA) | 统一虚拟寻址（UVA） | 内存 |
| unified virtual address space | 统一虚拟地址空间 | 内存 |
| page-locked host memory | 页锁定主机内存 | 内存 |
| pinned memory | 页锁定内存 | 内存 |
| mapped memory | 映射内存 | 内存 |
| memory pool | 内存池 | 内存 |
| memory allocation | 内存分配 | 内存 |
| stream-ordered memory allocator | 流序内存分配器 | 内存 |
| coalesced memory access | 合并内存访问 | 内存 |
| memory transaction | 内存事务 | 内存 |
| cache line | 缓存行 | 内存 |
| bank | 存储体 | 内存 |
| bank conflict | 存储体冲突 | 内存 |
| memory throughput | 内存吞吐量 | 内存 |
| bandwidth | 带宽 | 内存 |
| latency | 延迟 | 内存 |
| memory synchronization domain | 内存同步域 | 内存 |
| memory fence | 内存栅栏 | 内存 |
| page fault | 缺页故障 | 内存 |
| memory oversubscription | 内存超额分配 | 内存 |
| CUDA Runtime API | CUDA 运行时 API | API 与运行时 |
| CUDA Driver API | CUDA 驱动程序 API | API 与运行时 |
| runtime | 运行时 | API 与运行时 |
| driver | 驱动程序 | API 与运行时 |
| context | 上下文 | API 与运行时 |
| primary context | 主上下文 | API 与运行时 |
| device ordinal | 设备序号 | API 与运行时 |
| error code | 错误码 | API 与运行时 |
| stream | 流 | API 与运行时 |
| default stream | 默认流 | API 与运行时 |
| event | 事件 | API 与运行时 |
| CUDA Graph | CUDA 图 | API 与运行时 |
| graph node | 图节点 | API 与运行时 |
| stream capture | 流捕获 | API 与运行时 |
| callback | 回调 | API 与运行时 |
| virtual memory management | 虚拟内存管理 | API 与运行时 |
| peer access | 对等访问 | API 与运行时 |
| interoperability | 互操作性 | API 与运行时 |
| interprocess communication (IPC) | 进程间通信（IPC） | API 与运行时 |
| entry point | 入口点 | API 与运行时 |
| call site | 调用点 | API 与运行时 |
| public member function | 公有成员函数 | API 与运行时 |
| function member | 函数成员 | API 与运行时 |
| class | 类 | API 与运行时 |
| external linkage | 外部链接 | API 与运行时 |
| header file | 头文件 | API 与运行时 |
| malloc | malloc | API 与运行时 |
| dim3 | dim3 | API 与运行时 |
| Fabric handle | Fabric 句柄 | API 与运行时 |
| concurrency | 并发 | 并发与同步 |
| parallelism | 并行性 | 并发与同步 |
| asynchronous execution | 异步执行 | 并发与同步 |
| synchronous execution | 同步执行 | 并发与同步 |
| synchronization | 同步 | 并发与同步 |
| barrier | 屏障 | 并发与同步 |
| dependency | 依赖关系 | 并发与同步 |
| ordering | 顺序约束 | 并发与同步 |
| atomic operation | 原子操作 | 并发与同步 |
| cooperative groups | 协作组 | 并发与同步 |
| grid group | 网格组 | 并发与同步 |
| cluster group | 簇组 | 并发与同步 |
| warp-level primitive | 线程束级原语 | 并发与同步 |
| warp active mask | 线程束活动掩码 | 并发与同步 |
| warp shuffle function | 线程束洗牌函数 | 并发与同步 |
| work stealing | 工作窃取 | 并发与同步 |
| cluster launch control | 簇启动控制 | 并发与同步 |
| programmatic dependent launch | 程序化依赖启动 | 并发与同步 |
| parent grid | 父网格 | 并发与同步 |
| child grid | 子网格 | 并发与同步 |
| fire-and-forget launch | 即发即弃启动 | 并发与同步 |
| fire-and-forget stream | 即发即弃流 | 并发与同步 |
| tail launch | 尾部启动 | 并发与同步 |
| tail launch stream | 尾部启动流 | 并发与同步 |
| dynamic parallelism | 动态并行 | 并发与同步 |
| launch completion event | 启动完成事件 | 并发与同步 |
| compiler | 编译器 | 编译与工具链 |
| triple-chevron syntax | 三重尖括号语法 | 编译与工具链 |
| literal | 字面量 | 编译与工具链 |
| Compute Sanitizer | Compute Sanitizer | 编译与工具链 |
| host compiler | 主机编译器 | 编译与工具链 |
| device compiler | 设备编译器 | 编译与工具链 |
| front end | 前端 | 编译与工具链 |
| code generation | 代码生成 | 编译与工具链 |
| separate compilation | 分离编译 | 编译与工具链 |
| relocatable device code | 可重定位设备代码 | 编译与工具链 |
| device link | 设备链接 | 编译与工具链 |
| just-in-time compilation (JIT) | 即时编译（JIT） | 编译与工具链 |
| PTX | PTX | 编译与工具链 |
| SASS | SASS | 编译与工具链 |
| cubin | cubin 文件 | 编译与工具链 |
| fat binary | 胖二进制 | 编译与工具链 |
| link-time optimization (LTO) | 链接时优化（LTO） | 编译与工具链 |
| application binary interface (ABI) | 应用二进制接口（ABI） | 编译与工具链 |
| memory model | 内存模型 | C++ 内存模型 |
| memory order | 内存序 | C++ 内存模型 |
| memory ordering | 内存顺序约束 | C++ 内存模型 |
| data race | 数据竞争 | C++ 内存模型 |
| race condition | 竞态条件 | C++ 内存模型 |
| happens-before | 先发生于 | C++ 内存模型 |
| strongly happens-before | 强先发生于 | C++ 内存模型 |
| sequenced-before | 先序于 | C++ 内存模型 |
| synchronizes-with | 同步于 | C++ 内存模型 |
| carries dependency | 传递依赖 | C++ 内存模型 |
| modification order | 修改顺序 | C++ 内存模型 |
| side effect | 副作用 | C++ 内存模型 |
| visible side effect | 可见副作用 | C++ 内存模型 |
| thread scope | 线程作用域 | C++ 内存模型 |
| memory scope | 内存作用域 | C++ 内存模型 |
| relaxed | 宽松 | C++ 内存模型 |
| acquire | 获取 | C++ 内存模型 |
| release | 释放 | C++ 内存模型 |
| acquire-release | 获取-释放 | C++ 内存模型 |
| sequentially consistent | 顺序一致 | C++ 内存模型 |
| NVIDIA Warp | NVIDIA Warp | 高风险专名 |
| device (CUDA execution device) | 设备 | 高风险通用词 |
| launch a kernel | 启动内核 | 高风险通用词 |
| floating-point | 浮点 | 浮点 |
| associative | 满足结合律 | 浮点 |
| rounding mode | 舍入模式 | 浮点 |
| round to nearest, ties to even | 舍入到最近值，遇中间值取偶数 | 浮点 |
| round toward zero | 向零舍入 | 浮点 |
| round toward positive infinity | 向正无穷舍入 | 浮点 |
| round toward negative infinity | 向负无穷舍入 | 浮点 |
| unit in the last place (ULP) | 末位单位（ULP） | 浮点 |
| subnormal number | 次正规数 | 浮点 |
| normal number | 正规数 | 浮点 |
| significand | 有效数 | 浮点 |
| mantissa | 尾数 | 浮点 |
| exponent | 指数 | 浮点 |
| fused multiply-add (FMA) | 融合乘加（FMA） | 浮点 |
| contraction | 运算融合 | 浮点 |
| flush to zero (FTZ) | 刷新为零（FTZ） | 浮点 |
| precision | 精度 | 浮点 |
| accuracy | 准确度 | 浮点 |
| reproducibility | 可复现性 | 浮点 |
| signed zero | 有符号零 | 浮点 |
| infinity | 无穷大 | 浮点 |
| not a number (NaN) | 非数（NaN） | 浮点 |
