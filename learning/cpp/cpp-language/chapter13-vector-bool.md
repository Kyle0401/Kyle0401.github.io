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

##### 13.3.2 `std::vector<bool>::reference`：为什么 `vec[i]` 不是普通 `bool&`

对于普通的 `std::vector<int>`：

```cpp
std::vector<int> vec{1, 2, 3};
```

非 `const` 对象的 `vec[0]` 可以提供对实际 `int` 元素的引用。但 `std::vector<bool>` 通常把多个布尔值压缩在同一个存储单元的不同 bit 中，一个逻辑元素并没有对应一个可以单独取得地址的完整 `bool` 对象。

因此，对于非 `const std::vector<bool>`：

```cpp
std::vector<bool> vec(100, true);
auto ref = vec[30];
```

这里的 `ref` 不是普通的 `bool&`，而是一个代理引用对象，类型为：

```cpp
std::vector<bool>::reference
```

它可以近似理解为“记住某个存储单元以及其中哪一个 bit”的小对象，用来模拟对单个布尔元素的引用：

```text
std::vector<bool> 的压缩存储

机器字中的若干 bit：  1 1 1 1 1 1 1 1 ...
                              ↑
                              │
                    reference 代表其中一个 bit
```

所以：

```cpp
auto ref = vec[30];
ref = false;
```

并不是只修改 `ref` 自己，而是会通过代理对象把 `vec[30]` 对应的那个 bit 改成 `false`：

```cpp
ASSERT(!ref, "ref is false");
ASSERT(!vec[30], "vec[30] is also false");
```

> [!IMPORTANT]
> 这里的“reference”是一种**代理（proxy）**，而不是内置语言意义上的 `bool&`。这也是 `std::vector<bool>` 与普通 `std::vector<T>` 最重要的行为差异之一。

参考：[cppreference：`std::vector<bool>::reference`](https://en.cppreference.com/w/cpp/container/vector_bool/reference)。

##### 13.3.3 `auto ref = vec[i]` 与 `bool ref = vec[i]`：代理对象和真正的值拷贝

在 `std::vector<bool>` 中，`auto` 是否保留代理类型会直接影响后续修改是否作用到原来的元素。

如果写：

```cpp
std::vector<bool> vec(100, true);
auto ref = vec[30];
```

`auto` 根据右侧表达式的类型进行推导，因此这里得到的不是独立 `bool` 值，而是：

```cpp
std::vector<bool>::reference
```

于是：

```cpp
ref = false;
```

会修改代理对象代表的原始 bit，所以此时：

```cpp
ref == false;
vec[30] == false;
```

可以把关系理解成：

```text
auto ref = vec[30];

ref ─────────────→ vec[30] 对应的 bit

ref = false;
       ↓
vec[30] 也变成 false
```

如果真正想**复制出一个独立的布尔值**，应显式要求得到 `bool`：

```cpp
std::vector<bool> vec(100, true);
bool ref = vec[30];

ref = false;
```

这里初始化 `ref` 时，`std::vector<bool>::reference` 会转换成普通 `bool`，之后 `ref` 与 `vec[30]` 就是两个独立的值：

```cpp
ASSERT(!ref, "ref is an independent false value");
ASSERT(vec[30], "vec[30] is still true");
```

也可以显式转换后继续使用 `auto`：

```cpp
auto ref = static_cast<bool>(vec[30]);
```

此时右侧已经是普通 `bool`，所以 `ref` 推导得到的类型也是 `bool`。

| 写法 | `ref` 的类型 | 修改 `ref` 是否影响 `vec[i]` |
| --- | --- | --- |
| `auto ref = vec[i];` | `std::vector<bool>::reference` | 会 |
| `bool ref = vec[i];` | `bool` | 不会 |
| `auto ref = static_cast<bool>(vec[i]);` | `bool` | 不会 |

> [!IMPORTANT]
> 这里并不是说“`auto` 总是引用、`bool` 总是拷贝”。关键在于：**`auto` 会保留 `vec[i]` 返回的代理对象类型，而显式写 `bool` 会要求发生到普通布尔值的转换，从而得到独立值。**

参考：[cppreference：`auto` 占位类型说明符](https://en.cppreference.com/w/cpp/language/auto)。
