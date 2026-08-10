#### 13.1 `std::array`：固定大小连续容器

`std::array<T, N>` 是 C++11 提供的固定大小容器，定义在 `<array>` 中。它保存恰好 `N` 个 `T` 类型元素，元素在内存中连续存储，并提供和其他标准容器相似的接口。

```cpp
#include <array>

std::array<int, 5> arr{{1, 2, 3, 4, 5}};
```

这里 `int` 是元素类型，`5` 是数组长度，同时也是模板参数的一部分，因此 `std::array<int, 5>` 与 `std::array<int, 6>` 是不同类型。

参考：[cppreference：`std::array`](https://en.cppreference.com/w/cpp/container/array)。

##### 13.1.1 `size()`：取得元素个数

`size()` 返回容器中保存的**元素个数**：

```cpp
std::array<int, 5> arr{{1, 2, 3, 4, 5}};
arr.size();  // 5
```

需要特别区分 `arr.size()` 与 `sizeof(arr)`：

| 表达式 | 含义 | 本例结果 |
| --- | --- | --- |
| `arr.size()` | 元素数量 | `5` |
| `sizeof(arr)` | 整个 `std::array` 对象占用的字节数 | `5 * sizeof(int)` |

`size()` 的单位是“元素”，而 `sizeof` 的单位是“字节”。

参考：[cppreference：`std::array::size`](https://en.cppreference.com/w/cpp/container/array/size)。

##### 13.1.2 `data()`：取得连续元素的首地址

`std::array` 本身是容器对象，不会像内置数组那样在普通表达式中自动退化成元素指针。需要把底层连续元素交给只接受指针的接口时，可以调用 `data()`。

```cpp
std::array<int, 5> arr{{1, 2, 3, 4, 5}};
int* p = arr.data();
```

对于非 `const std::array<int, 5>`，`arr.data()` 返回 `int*`；对于 `const` 对象则返回 `const int*`。当数组非空时，可以把它理解为 `arr.data() == &arr[0]`。

例如：

```cpp
std::array<int, 5> arr{{1, 2, 3, 4, 5}};
int ans[]{1, 2, 3, 4, 5};

ASSERT(std::memcmp(arr.data(), ans, 5 * sizeof(int)) == 0,
       "The object representations should match.");
```

`std::memcmp` 的第三个参数单位是**字节**而不是元素个数，所以 5 个 `int` 对应 `5 * sizeof(int)` 字节。

> [!WARNING]
> `memcmp` 比较的是对象表示（原始字节序列），不是 C++ 意义上的通用“值相等”操作。普通标准容器的值比较通常优先使用 `operator==`。

参考：[cppreference：`std::array::data`](https://en.cppreference.com/w/cpp/container/array/data)。

#### 13.2 `std::vector`：动态连续容器

`std::vector<T>` 是动态大小的连续容器。与 `std::array` 的固定长度不同，`vector` 可以在运行时增加或删除元素；它会自行管理一块连续的动态存储区域。

```cpp
#include <vector>

std::vector<int> vec{1, 2, 3, 4, 5};
```

`vector` 最容易混淆的是“元素个数”“已分配容量”和“`vector` 对象自身大小”这三个概念。

参考：[cppreference：`std::vector`](https://en.cppreference.com/w/cpp/container/vector)。

##### 13.2.1 `size()` / `empty()` / `capacity()` / `sizeof`：元素数量、容量与对象自身大小

`size()` 返回当前实际存在的元素个数：

```cpp
std::vector<int> vec{1, 2, 3, 4, 5};
vec.size();  // 5
```

`empty()` 用来判断容器是否为空，返回 `bool`。从含义上可以理解为检查 `size() == 0`：

```cpp
if (vec.empty()) {
    // 当前没有元素
}
```

`capacity()` 返回当前已经分配的存储空间最多可以容纳多少个元素，而无需再次重新分配内存。始终有：

```text
size() <= capacity()
```

例如一个 `vector` 可能处于：

```text
size     = 5
capacity = 8

已使用： [1][2][3][4][5]
预留：                  [ ][ ][ ]
```

这表示当前有 5 个有效元素，但现有存储区域最多可以容纳 8 个元素。

###### `sizeof(vec)` 为什么不等于所有元素的总大小

对于：

```cpp
std::vector<int> vec{1, 2, 3, 4, 5};
```

下面这个判断通常是错误的：

```cpp
sizeof(vec) == vec.size() * sizeof(vec[0])  // 通常为 false
```

原因是 `sizeof(vec)` 计算的是 **`std::vector` 管理对象自身占用的字节数**，并不会把 `vector` 在动态存储区中管理的元素一起计算进去。

可以近似理解为：

```text
vector 对象自身                         动态存储区域
┌────────────────────┐                 ┌───┬───┬───┬───┬───┐
│ 管理底层存储的信息 │ ──────────────→ │ 1 │ 2 │ 3 │ 4 │ 5 │
└────────────────────┘                 └───┴───┴───┴───┴───┘
       ↑                                      ↑
 sizeof(vec)                           vec.data() 指向这里
```

因此下面几件事是不同的：

| 表达式 | 含义 | 单位 |
| --- | --- | --- |
| `vec.size()` | 当前实际元素数量 | 元素 |
| `vec.empty()` | 当前是否没有元素 | `bool` |
| `vec.capacity()` | 不重新分配时当前最多可容纳的元素数量 | 元素 |
| `sizeof(vec)` | `vector` 管理对象自身占用空间 | 字节 |
| `vec.size() * sizeof(vec[0])` | 当前有效元素按元素类型计算出的总字节数 | 字节 |

`push_back()`、`pop_back()`、`resize()`、`reserve()` 等操作可能改变 `size()` 或 `capacity()`，但它们通常不会改变 `sizeof(vec)`，因为 `sizeof` 描述的是 `vector` 对象类型本身的静态大小，而不是它当前管理了多少动态元素。

###### 为什么常见 64 位 libstdc++ 中 `sizeof(std::vector<T>)` 经常是 24

C++ 标准**没有规定** `std::vector` 对象内部必须保存哪些字段，也没有规定 `sizeof(std::vector<T>)` 必须是多少。

以 GCC 的 libstdc++ 实现为例，其 `vector` 底层实现中可以看到三个用于管理连续存储区域的指针成员：

```text
_M_start
_M_finish
_M_end_of_storage
```

可以把它们近似理解为：

```text
_M_start           → 第一个元素的位置
_M_finish          → 最后一个有效元素之后的位置
_M_end_of_storage  → 已分配存储区域末尾的位置
```

在常见的 64 位环境中，一个指针通常占 8 字节，因此在这种实现和 ABI 下常见：

```text
sizeof(std::vector<T>) ≈ 3 × 8 = 24 字节
```

这也解释了为什么 5 个 `int` 元素可能只占 `5 * 4 = 20` 字节，而 `sizeof(vec)` 却可能是 24 字节。

> [!WARNING]
> `24` 不是 C++ 标准规定的固定答案。不同标准库实现、ABI、编译模式以及调试迭代器配置都可能改变 `sizeof(std::vector<T>)`。练习题应以当前运行环境的实际结果为准。

> [!IMPORTANT]
> `size()` 描述“现在有几个元素”，`capacity()` 描述“当前这块动态存储空间最多能放几个元素”，`sizeof(vec)` 描述“`vector` 管理对象自己占多少字节”。三者不是同一个概念。

参考：[cppreference：`std::vector::size`](https://en.cppreference.com/w/cpp/container/vector/size)、[cppreference：`std::vector::empty`](https://en.cppreference.com/w/cpp/container/vector/empty)、[cppreference：`std::vector::capacity`](https://en.cppreference.com/w/cpp/container/vector/capacity)、[GCC libstdc++ `vector` 源码](https://gcc.gnu.org/onlinedocs/gcc-12.4.0/libstdc++/api/a00698_source.html)。

##### 13.2.2 `data()`：取得底层连续存储的首地址

`std::vector` 的元素连续存储，因此 `data()` 可以取得底层元素存储区域的起始地址。

```cpp
std::vector<int> vec{1, 2, 3, 4, 5};
int* p = vec.data();
```

对于这个非 `const std::vector<int>`，`vec.data()` 返回 `int*`。当 `vec` 非空时，可以把它理解为：

```cpp
vec.data() == &vec[0]
```

因此可以把 `vector` 底层连续元素交给需要原始指针的接口：

```cpp
std::vector<int> vec{1, 2, 3, 4, 5};
int ans[]{1, 2, 3, 4, 5};

ASSERT(std::memcmp(vec.data(), ans, sizeof(ans)) == 0,
       "The object representations should match.");
```

这里 `vec.data()` 是第一块连续内存的首地址，`ans` 在函数调用中退化为指向首元素的指针，`sizeof(ans)` 则给出整个内置数组的字节数。

> [!IMPORTANT]
> `vec.data()` 指向的是 **vector 管理的元素存储区域**，不是 `std::vector` 管理对象自身的地址。发生重新分配后，之前取得的 `data()` 指针可能失效。

参考：[cppreference：`std::vector::data`](https://en.cppreference.com/w/cpp/container/vector/data)。

##### 13.2.3 `insert()` / `erase()`：按迭代器位置插入和删除

`std::vector::insert()` 和 `std::vector::erase()` 使用**迭代器**表示操作位置，而不是直接传入数组下标。`std::vector` 的迭代器支持随机访问，因此可以使用 `vec.begin() + n` 得到下标 `n` 对应位置的迭代器。

假设当前容器为：

```cpp
std::vector<double> vec{1, 2, 3, 4, 6};
```

要在值 `2` 的前面插入 `1.5`：

```cpp
vec.insert(vec.begin() + 1, 1.5);
```

这里 `vec.begin() + 1` 指向原来的第 1 个元素 `2`，而 `insert(position, value)` 会把新元素插入到 `position` **之前**：

```text
vec.begin() + 1 指向这里
                    ↓
原来：          1 | 2 | 3 | 4 | 6
插入位置：      1 | ↑ | 2 | 3 | 4 | 6
                    1.5

结果：          1 | 1.5 | 2 | 3 | 4 | 6
```

接着要删除值为 `3` 的元素，此时它位于下标 `3`：

```cpp
vec.erase(vec.begin() + 3);
```

删除后得到：

```cpp
{1, 1.5, 2, 4, 6}
```

###### 插入和删除的时间复杂度

`std::vector` 的元素连续存储，因此在中间插入或删除时，操作位置之后的元素通常需要移动：

| 操作 | 时间复杂度 |
| --- | --- |
| `vec[i]` | `O(1)` |
| `push_back()` | 摊销 `O(1)` |
| `pop_back()` | `O(1)` |
| 中间 `insert()` | `O(n)` |
| 中间 `erase()` | `O(n)` |

`push_back()` 之所以是**摊销 `O(1)`**，是因为容量足够时只需在尾部构造一个元素；只有容量不足时才需要重新分配更大的连续存储区域并搬移已有元素。

参考：[cppreference：`std::vector::insert`](https://en.cppreference.com/w/cpp/container/vector/insert)、[cppreference：`std::vector::erase`](https://en.cppreference.com/w/cpp/container/vector/erase)。

##### 13.2.4 `clear()` / `shrink_to_fit()`：清空元素与收缩容量

`clear()` 会销毁容器中的全部元素，因此调用后：

```cpp
vec.clear();

vec.size() == 0;    // true
vec.empty();        // true
```

但是 `clear()` **不会主动缩小 `capacity()`**。它清除的是“现存元素”，而不是顺便把已经分配的存储容量释放掉。

从对象生命周期角度看，`clear()` 并不是把每个元素改成 `0`、空字符或某个“空值”，而是结束这些元素的生命周期。对于 `int`、`char` 这类类型，底层旧字节甚至可能暂时仍留在那块存储中，但它们已经不再是 `vector` 中可以合法访问的有效元素。

```text
clear() 前： size = 5, capacity = 8
clear() 后： size = 0, capacity = 8
```

`shrink_to_fit()` 用于**请求**实现尽量把多余容量释放掉：

```cpp
vec.shrink_to_fit();
```

它通常被理解为请求让 `capacity()` 尽量接近 `size()`。

> [!WARNING]
> C++ 标准规定 `shrink_to_fit()` 是一个 **non-binding request（非强制请求）**。实现可以不实际收缩容量，因此通用代码不应依赖调用后一定满足 `capacity() == size()`。

常见操作对 `size()` 和 `capacity()` 的影响可以总结为：

| 操作 | `size()` | `capacity()` |
| --- | --- | --- |
| `clear()` | 变为 `0` | 不主动缩小 |
| `pop_back()` | 减 `1` | 通常不变 |
| `resize(更小)` | 变小 | 不因缩小而减少 |
| `reserve(n)` | 不变 | 必要时增大到至少 `n` |
| `shrink_to_fit()` | 不变 | 请求缩小，但不保证成功 |

参考：[cppreference：`std::vector::clear`](https://en.cppreference.com/w/cpp/container/vector/clear)、[cppreference：`std::vector::shrink_to_fit`](https://en.cppreference.com/w/cpp/container/vector/shrink_to_fit)。

##### 13.2.5 `vector(n, value)`：构造 n 个相同元素

`std::vector` 提供“数量 + 初始值”形式的构造函数：

```cpp
vector(size_type n, const T& value);
```

它会构造一个包含 `n` 个元素的 `vector`，每个元素都使用 `value` 初始化。例如：

```cpp
std::vector<char> vec(48, 'z');
```

这里第一个参数 `48` 是元素个数，第二个参数 `'z'` 是每个元素的初始值。因此：

```cpp
vec.size() == 48;  // true
vec[0] == 'z';     // true
vec[47] == 'z';    // true
```

> [!IMPORTANT]
> 这里应使用圆括号 `std::vector<char> vec(48, 'z');`。如果写成花括号 `std::vector<char> vec{48, 'z'};`，会优先匹配 `initializer_list`，含义是“用给出的两个值初始化元素”，而不是创建 48 个 `'z'`。

参考：[cppreference：`std::vector::vector`](https://en.cppreference.com/w/cpp/container/vector/vector)。

##### 13.2.6 `resize()`：改变当前元素个数

`resize()` 改变的是 `vector` 当前实际包含的**元素个数，也就是 `size()`**：

```cpp
vec.resize(count);
vec.resize(count, value);
```

**当 `count < size()` 时：删除尾部多余元素。**

例如：

```cpp
std::vector<char> vec(48, 'z');
auto capacity = vec.capacity();

vec.resize(16);
```

此时只保留下标 `0` 到 `15` 的前 16 个元素：

```cpp
vec.size() == 16;              // true
vec.capacity() == capacity;    // true
```

缩小时，被移除的尾部元素会被销毁，但已分配的存储容量不会因为 `resize()` 变小而自动收缩。

**当 `count > size()` 时：在尾部追加新元素。**

如果只写：

```cpp
vec.resize(20);
```

新增元素会按相应的默认插入方式构造。如果希望指定新增元素的值，可以写：

```cpp
vec.resize(20, 'x');
```

如果扩大后的 `count` 不超过当前 `capacity()`，可以直接在原有存储区域中构造新元素；如果 `count > capacity()`，则需要重新分配足够大的连续存储区域，新的 `capacity()` 至少能够容纳 `count` 个元素。

参考：[cppreference：`std::vector::resize`](https://en.cppreference.com/w/cpp/container/vector/resize)。

##### 13.2.7 `reserve()`：预留容量但不增加元素

`reserve(new_cap)` 用来请求 `vector` 提前准备至少能容纳 `new_cap` 个元素的连续存储空间。它主要改变的是**容量（capacity）**，不会因为预留了更多空间就自动创建新元素，因此调用前后的 `size()` 保持不变。

例如：

```cpp
std::vector<char> vec(48, 'z');
vec.resize(16);

vec.reserve(256);
```

调用后：

```cpp
vec.size() == 16;       // true
vec.capacity() >= 256;  // 标准保证
```

> [!WARNING]
> C++ 标准只保证 `reserve(256)` 后 `capacity() >= 256`，并不保证一定**恰好等于** `256`。如果练习题断言 `capacity() == 256`，那是在依赖当前标准库实现的具体行为。

当 `reserve()` 导致重新分配时，原来指向 `vector` 元素的指针、引用和迭代器都会失效；如果没有发生重新分配，则它们保持有效。

`reserve()` 与 `resize()` 的区别可以直接记成：

| 操作 | `size()` | `capacity()` | 是否创建新元素 |
| --- | --- | --- | --- |
| `reserve(n)` | 不变 | 必要时增大到至少 `n` | 否 |
| `resize(n)` | 变成 `n` | 必要时增大 | 可能创建或销毁元素 |

> [!IMPORTANT]
> `resize(n)` 表示“让容器现在有 `n` 个元素”；`reserve(n)` 表示“提前准备至少能容纳 `n` 个元素的空间”。

参考：[cppreference：`std::vector::reserve`](https://en.cppreference.com/w/cpp/container/vector/reserve)。
