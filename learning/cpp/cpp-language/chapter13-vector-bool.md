##### 13.2.8 `rbegin()` / `rend()`：逆向迭代器与 `++` 的方向

标准容器通常同时提供正向迭代器和逆向迭代器。对于 `std::vector`：

```cpp
std::vector<int> vec{10, 20, 30, 40};

auto first = vec.rbegin();
```

`rbegin()` 返回指向**逆向遍历第一个元素**的逆向迭代器。对于非空 `vector`，这个元素就是容器的最后一个元素，因此：

```cpp
*vec.rbegin() == 40;  // true
```

`rend()` 返回逆向遍历的**尾后位置**。它不指向任何有效元素，可以把它概念上理解为“位于第一个元素之前”的位置，因此和普通的 `end()` 一样，**不能对 `rend()` 解引用**。

可以这样对照理解：

```text
容器：       [10] [20] [30] [40]
              ↑              ↑
           begin()         rbegin()

正向遍历：   10 → 20 → 30 → 40 → end()
逆向遍历：   40 → 30 → 20 → 10 → rend()
```

因此逆向遍历通常写成：

```cpp
for (auto it = vec.rbegin(); it != vec.rend(); ++it) {
    std::cout << *it << ' ';
}
```

输出：

```text
40 30 20 10
```

这里最容易产生疑问的是：**明明是从右往左遍历，为什么仍然写 `++it`？**

原因是，对迭代器来说，`++` 更准确的含义不是“数组下标加 1”或“内存地址向右移动”，而是：

> **沿着当前迭代器定义的遍历方向，前进到下一个元素。**

所以普通迭代器和逆向迭代器的 `++` 实际方向正好相反：

| 迭代器 | 初始位置 | `++it` 的逻辑含义 | 在原容器中的实际方向 |
| --- | --- | --- | --- |
| `begin()` 得到的正向迭代器 | 第一个元素 | 前进到下一个元素 | 左 → 右 |
| `rbegin()` 得到的逆向迭代器 | 最后一个元素 | 前进到逆向序列的下一个元素 | 右 → 左 |

例如：

```cpp
std::vector<int> vec{10, 20, 30, 40};
auto it = vec.rbegin();

*it;    // 40
++it;
*it;    // 30
++it;
*it;    // 20
```

因此对于逆向迭代器：

```text
++it  ：在原容器中向左移动
--it  ：在原容器中向右移动
```

从 `std::reverse_iterator` 与底层正向迭代器的关系来看，也可以写成：

```cpp
vec.rbegin().base() == vec.end();    // true
vec.rend().base()   == vec.begin();  // true
```

逆向迭代器保存的底层迭代器位置与它实际解引用得到的元素之间相差一个位置，所以 `rbegin()` 的底层 `base()` 是 `end()`，但 `*rbegin()` 得到的却是最后一个元素。相应地，**递增逆向迭代器会使其底层迭代器递减**，从而实现从右向左遍历。

> [!IMPORTANT]
> 不要把迭代器的 `++` 固定理解成“向右”。应理解成“沿该迭代器的遍历方向前进一步”。对正向迭代器，`++` 是向右；对逆向迭代器，`++` 是向左。

参考：[cppreference：`std::vector::rbegin`](https://en.cppreference.com/w/cpp/container/vector/rbegin)、[cppreference：`std::vector::rend`](https://en.cppreference.com/w/cpp/container/vector/rend)、[cppreference：`std::reverse_iterator`](https://en.cppreference.com/w/cpp/iterator/reverse_iterator)。

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

#### 13.4 `std::map`：按键有序存储的关联容器

`std::map<Key, T>` 是标准库中的**有序关联容器**，定义在 `<map>` 中。每个元素由一个唯一的键（key）和与之关联的值（mapped value）组成，元素按照键的比较规则保持有序。

例如：

```cpp
#include <map>
#include <string>

std::map<std::string, std::string> secrets;
secrets["hello"] = "world";
secrets["foo"] = "bar";
```

可以把其中的元素概念上理解为：

```text
key       mapped value
"foo"   → "bar"
"hello" → "world"
```

`std::map` 的模板参数中，`Key` 表示键类型，`T` 表示映射值类型。一个 `map` 中不能同时存在两个等价的 key；再次给同一个 key 赋值时，通常是在修改这个 key 已关联的 value，而不是再创建一个相同 key。

参考：[cppreference：`std::map`](https://en.cppreference.com/w/cpp/container/map)。

##### 13.4.1 `operator[]`：访问 value，不只是“查找 key”

对非 `const std::map`，可以使用 `operator[]` 按 key 访问对应的 mapped value：

```cpp
std::map<std::string, std::string> secrets;
secrets["hello"] = "world";

std::string value = secrets["hello"];
```

对于：

```cpp
std::map<K, V> map;
```

表达式：

```cpp
map[key]
```

得到的是这个 key 对应的 **`V` 对象的引用**，也就是 `mapped_type&`。因此它既可以读取 value，也可以直接修改 value：

```cpp
map[key] = value;
```

但 `operator[]` 有一个非常重要的行为：**如果 key 不存在，它会向 `map` 中插入这个 key，并为 mapped value 进行值初始化，然后返回新 value 的引用。**

例如：

```cpp
std::map<std::string, std::string> secrets;

secrets["foo"];
```

调用前：

```text
secrets = {}
```

调用后会出现一个新元素：

```text
"foo" → ""
```

因为这里的 mapped type 是 `std::string`，值初始化得到空字符串。

因此不要把：

```cpp
map[key]
```

简单理解为“只查一下 key”。它更准确的语义是：

> **取得这个 key 对应的 value；如果 key 不存在，则创建这个元素后再取得 value。**

参考：[cppreference：`std::map::operator[]`](https://en.cppreference.com/w/cpp/container/map/operator_at)。

##### 13.4.2 为什么 `const std::map` 不能使用 `operator[]`

假设函数参数写成：

```cpp
std::map<K, V> const& map
```

这里的 `map` 是对 `const std::map<K, V>` 的引用，函数通过这个引用不能执行会修改该 `map` 的操作。

如果写：

```cpp
map[key]
```

就可能出现矛盾：当 `key` 不存在时，`operator[]` 必须向容器中插入一个新元素，这会修改 `map`。

因此 `std::map::operator[]` **没有 `const` 成员函数版本**，不能通过 `const std::map` 调用：

```cpp
void f(std::map<std::string, std::string> const& map) {
    map["hello"];  // 错误：const map 不能调用 operator[]
}
```

这里需要特别注意：问题并不是“`[]` 天生不能读取 `const` 对象”，而是 **`std::map` 的这个 `operator[]` 具有可能插入元素的语义，因此不能设计成只读的 `const` 操作。**

如果只是想在 `const map` 中查找一个 key，可以使用 `find()`；如果确定 key 已存在并希望读取对应 value，也可以使用 `at()`，因为 `at()` 提供 `const` 重载，并且 key 不存在时会抛出 `std::out_of_range`。

> [!IMPORTANT]
> `std::map::operator[]` 不是纯查询操作。它可能插入元素，所以只能用于非 `const map`。只查询是否存在时应优先使用 `find()`（C++20 起也可以使用 `contains()`）。

参考：[cppreference：`std::map::operator[]`](https://en.cppreference.com/w/cpp/container/map/operator_at)、[cppreference：`std::map::at`](https://en.cppreference.com/w/cpp/container/map/at)。

##### 13.4.3 `find()`：按 key 查找元素

`find(key)` 用于在 `map` 中查找指定 key，并且**不会因为没找到而插入新元素**。

```cpp
std::map<std::string, std::string> secrets{
    {"hello", "world"},
    {"foo", "bar"}
};

auto it = secrets.find("hello");
```

如果找到了，`find()` 返回一个指向对应元素的迭代器；如果没有找到，则返回该容器的 `end()`：

```cpp
secrets.find("hello") != secrets.end();  // true
secrets.find("abc")   == secrets.end();  // true
```

`std::map` 的一个元素实际是类似下面的键值对：

```cpp
std::pair<const Key, T>
```

因此找到元素后可以通过迭代器访问：

```cpp
auto it = secrets.find("hello");

if (it != secrets.end()) {
    it->first;   // key："hello"
    it->second;  // mapped value："world"
}
```

其中：

```text
it->first   → key
it->second  → mapped value
```

对于非 `const map`，`find()` 返回 `iterator`；对于 `const map`，返回 `const_iterator`，因此下面这种只读查询完全合法：

```cpp
bool key_exists(
    std::map<std::string, std::string> const& map,
    std::string const& key
) {
    return map.find(key) != map.end();
}
```

对 `std::map` 来说，`find()` 的查找复杂度是对数级 `O(log n)`。

参考：[cppreference：`std::map::find`](https://en.cppreference.com/w/cpp/container/map/find)。

##### 13.4.4 `end()`：尾后迭代器，不指向任何元素

`map.end()` 返回一个**尾后（past-the-end）迭代器**。它表示“已经越过最后一个元素的位置”，本身不指向任何有效元素，因此不能解引用：

```cpp
auto it = map.end();

*it;        // 错误：不能解引用 end()
it->first;  // 错误
```

可以把它概念上理解成：

```text
map 中的有序元素：

[key1] → [key2] → [key3] → end()
  ↑                         ↑
begin()                  尾后位置
```

`end()` 最常见的用途不是“取得最后一个元素”，而是作为**遍历结束或查找失败的哨兵位置**：

```cpp
for (auto it = map.begin(); it != map.end(); ++it) {
    // 访问 *it
}
```

以及：

```cpp
auto it = map.find(key);

if (it == map.end()) {
    // 没找到 key
} else {
    // 找到了 key，可以使用 it->first / it->second
}
```

对于空 `map`：

```cpp
map.begin() == map.end();
```

这正好表示没有任何可以遍历的元素。

> [!IMPORTANT]
> `end()` 不是“最后一个元素”，而是“最后一个元素之后的位置”。所以它可以用于比较，但不能解引用。

参考：[cppreference：`std::map::end`](https://en.cppreference.com/w/cpp/container/map/end)。

##### 13.4.5 用 `find()` + `end()` 判断 key 是否存在

有了前面的定义，下面这行代码就可以完整理解了：

```cpp
return map.find(key) != map.end();
```

执行过程是：

```text
map.find(key)
     │
     ├── 找到 key ──→ 返回指向该元素的迭代器
     │                    │
     │                    └── != map.end() → true
     │
     └── 没找到 key ─→ 返回 map.end()
                          │
                          └── != map.end() → false
```

因此练习中的函数可以写成：

```cpp
template<class K, class V>
bool key_exists(std::map<K, V> const& map, K const& key) {
    return map.find(key) != map.end();
}
```

而设置键值对可以写成：

```cpp
template<class K, class V>
void set(std::map<K, V>& map, K key, V value) {
    map[key] = value;
}
```

这里两种操作的语义应明确区分：

| 写法 | 主要目的 | key 不存在时是否插入 | 可否用于 `const map` |
| --- | --- | --- | --- |
| `map[key]` | 取得/修改 mapped value | **会** | 否 |
| `map.find(key)` | 查找 key | 不会 | 是 |
| `map.at(key)` | 取得已存在 key 的 value | 不会；不存在则抛异常 | 是（有 `const` 重载） |

C++20 起，如果只需要判断 key 是否存在，还可以直接写：

```cpp
return map.contains(key);
```

但理解 `find()` 与 `end()` 仍然非常重要，因为这种“查找返回迭代器，失败返回 `end()`”的接口模式在标准库容器中非常常见。

> [!IMPORTANT]
> 判断是否存在时，不要写 `return map[key];`。这不仅会在 key 不存在时修改 `map`，而且 `map[key]` 返回的是 mapped value，并不是“key 是否存在”的布尔结果。

参考：[cppreference：`std::map::find`](https://en.cppreference.com/w/cpp/container/map/find)、[cppreference：`std::map::end`](https://en.cppreference.com/w/cpp/container/map/end)、[cppreference：`std::map::contains`](https://en.cppreference.com/w/cpp/container/map/contains)。
