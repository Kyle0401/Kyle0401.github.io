#### 13.3 `std::vector<bool>`：针对布尔值的特殊化

`std::vector<bool>` 不是把普通 `std::vector<T>` 简单地把 `T` 换成 `bool`。标准库为 `bool` 提供了专门的特化版本，用来更紧凑地保存布尔值。

普通的 `std::vector<int>`、`std::vector<double>`、`std::vector<char>` 可以近似理解为：每个元素在底层连续存储区域中占据一个完整的 `T` 对象。

```text
std::vector<int>

动态存储区：
┌────┬────┬────┬────┐
│int │int │int │int │
└────┴────┴────┴────┘
```

而 `std::vector<bool>` 通常采用**位压缩（bit packing）**：一个逻辑上的 `bool` 不一定对应一个完整字节，而可能只占一个 bit。

例如：

```cpp
std::vector<bool> vec(100, true);
```

逻辑上有 100 个布尔元素：

```text
true true true false true ...
```

底层实现则可能把它们压缩到若干机器字中：

```text
bit：
1 1 1 0 1 1 1 1 ...
└─────────────────┘
      若干机器字
```

这样做的主要目的，是减少大量布尔值所需要的存储空间。代价是 `std::vector<bool>` 的内部管理方式与普通 `std::vector<T>` 不同，因此不能把普通 `vector` 的内部结构机械地套用到它身上。

##### 13.3.1 为什么 `sizeof(std::vector<bool>)` 可能比普通 `vector` 更大

前面提到，在常见的 64 位 GCC libstdc++ 环境中，普通 `std::vector<T>` 常见的对象大小是 24 字节，可以近似理解为内部保存了三个指针。但这只是普通 `vector` 的某种具体实现方式，并不是标准规定。

`std::vector<bool>` 为了管理压缩到 bit 级别的存储，需要维护不同的迭代位置和位偏移等信息，因此它的对象布局可以与普通 `vector` 完全不同。

例如在某个 64 位 libstdc++ 环境中可能观察到：

```cpp
sizeof(std::vector<int>)   // 24
sizeof(std::vector<bool>)  // 40
```

这并不矛盾。`sizeof(vec)` 测量的是 **`vector` 管理对象自身的大小**，不是其中逻辑元素占用的总空间。`std::vector<bool>` 虽然通过位压缩节省了底层元素存储空间，但管理这些 bit 所需的对象本身反而可能比普通 `vector` 更大。

> [!WARNING]
> `24` 和 `40` 都不是 C++ 标准规定的固定值。`sizeof(std::vector<T>)` 与 `sizeof(std::vector<bool>)` 都依赖具体标准库实现、ABI、编译模式等。练习题中如果特别写了“平台相关”，应以实际运行环境的输出为准。

> [!IMPORTANT]
> `std::vector<bool>` 是 `std::vector` 的特殊化版本。它通常使用位压缩，因此普通 `vector` 的“一个元素对应一个完整对象、用普通元素指针表示位置”的直观模型不能完全照搬到 `vector<bool>`。

参考：[cppreference：std::vector<bool>](https://en.cppreference.com/w/cpp/container/vector_bool)、[cppreference：模板特化](https://en.cppreference.com/w/cpp/language/template_specialization)。
