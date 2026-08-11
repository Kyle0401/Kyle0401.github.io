#### 9.1 字符串字面量、`std::string_literals` 与 `operator""s`

C++ 中需要区分**普通字符串字面量**和标准库的 `std::string` 对象。二者虽然都能写成类似 `"Hello"` 的形式，但类型并不相同。

##### 9.1.1 普通字符串字面量

最常见的窄字符串字面量：

```cpp
"Hello"
```

其类型是一个 `const char` 数组。`"Hello"` 一共有 5 个可见字符，末尾还会自动包含一个空字符 `\0`，因此它的数组类型是：

```cpp
const char[6]
```

可以近似表示为：

```text
'H'  'e'  'l'  'l'  'o'  '\0'
 ↑                        ↑
第 0 个元素               结尾空字符
```

需要特别区分“字符串字面量本身的类型”和使用 `auto` 初始化变量后得到的类型：

```cpp
auto world = "world";
```

`"world"` 本身是 `const char[6]`，但在这种按值的 `auto` 类型推导中，数组会发生**数组到指针转换（array-to-pointer conversion）**，因此 `world` 的类型最终是：

```cpp
const char*
```

所以：

```cpp
static_assert(std::is_same_v<decltype(world), const char*>);
```

> [!IMPORTANT]
> `"world"` 本身不是 `const char*`，而是 `const char[6]`；只是它在许多表达式中会转换为指向首元素的 `const char*`。这和内置数组的数组到指针转换规则是一致的。

参考：[cppreference：字符串字面量](https://zh.cppreference.com/w/cpp/language/string_literal)、[cppreference：数组到指针转换](https://zh.cppreference.com/w/cpp/language/array)。

##### 9.1.2 `std::string_literals` 命名空间与 `"..."s`

C++14 起，标准库提供了字符串字面量后缀 `s`。使用前通常写：

```cpp
#include <string>

using namespace std::string_literals;
```

然后可以写：

```cpp
auto hello = "Hello"s;
```

此时 `hello` 的类型不是字符数组或字符指针，而是：

```cpp
std::string
```

因此：

```cpp
static_assert(std::is_same_v<decltype(hello), std::string>);
```

这里的：

```cpp
using namespace std::string_literals;
```

表示把 `std::string_literals` 命名空间中的名字引入当前作用域参与名字查找，使编译器能够找到字符串字面量运算符 `operator""s`。

`std::string_literals` **不是类**，而是命名空间。可以把关系理解为：

```text
std                                  ← 命名空间
└── literals                         ← inline namespace
    └── string_literals              ← inline namespace
        └── operator""s              ← 字符串字面量运算符

std
└── string                           ← std::basic_string<char> 的类型别名
```

因为相关命名空间是 `inline namespace`，代码中常直接写：

```cpp
using namespace std::string_literals;
```

也可以使用更完整的名字：

```cpp
using namespace std::literals::string_literals;
```

两种写法都可以让标准字符串字面量后缀 `s` 被找到。

> [!NOTE]
> `using namespace` 的作用是影响名字查找，并不是“创建对象”或“使用某个类”。命名空间只是用于组织名字、避免冲突的一种作用域机制。

参考：[cppreference：`operator""s`](https://zh.cppreference.com/w/cpp/string/basic_string/operator%22%22s)、[cppreference：命名空间](https://zh.cppreference.com/w/cpp/language/namespace)。

##### 9.1.3 字符串字面量运算符 `operator""s`

`"Hello"s` 中的 `s` 本质上由标准库提供的**用户定义字面量运算符（user-defined literal operator）**处理，对应的运算符名字是：

```cpp
operator""s
```

对于普通窄字符串，可以把它的作用近似理解为：

```cpp
std::string operator""s(const char* str, std::size_t len);
```

也就是说，编译器遇到：

```cpp
"Hello"s
```

时，会把字符串内容以及长度交给相应的 `operator""s`，最终构造出一个 `std::string` 对象。

因此下面两种写法得到的对象类型相同：

```cpp
std::string a = "Hello";
auto b = "Hello"s;
```

`a` 和 `b` 都是 `std::string`，但形成它们的过程不同：第一种是用普通字符串字面量构造 `std::string`，第二种则直接使用标准库的 `s` 字面量后缀生成 `std::string`。

`operator""s` 会接收字符串长度，因此它也能正确保留字符串内部的空字符。例如：

```cpp
auto text = "A\0B"s;
```

这里：

```cpp
text.size() == 3
```

因为中间的 `\0` 是字符串内容的一部分，并不会让 `std::string` 在那里结束。

参考：[cppreference：用户定义字面量](https://zh.cppreference.com/w/cpp/language/user_literal)、[cppreference：`operator""s`](https://zh.cppreference.com/w/cpp/string/basic_string/operator%22%22s)。

##### 9.1.4 普通字符串字面量与 `s` 后缀对比

| 写法 | 含义 / 推导结果 |
| --- | --- |
| `"Hello"` | 字符串字面量本身的类型是 `const char[6]` |
| `auto x = "Hello";` | `x` 推导为 `const char*` |
| `"Hello"s` | 表达式结果是 `std::string` |
| `auto x = "Hello"s;` | `x` 推导为 `std::string` |
| `'!'` | 单个字符，类型是 `char` |

例如：

```cpp
#include <string>
#include <type_traits>

using namespace std::string_literals;

auto hello = "Hello"s;
auto world = "world";

static_assert(std::is_same_v<decltype(hello), std::string>);
static_assert(std::is_same_v<decltype(world), const char*>);

std::string result = hello + ", " + world + '!';
// result == "Hello, world!"
```

这里最值得记住的是：

> **`"xxx"` 是普通字符串字面量；`"xxx"s` 通过 `operator""s` 直接得到 `std::string`。**
