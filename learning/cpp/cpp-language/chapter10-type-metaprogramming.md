#### 10.4 编译期类型信息：cv、`decltype` 与类型元编程

这一节把几个经常一起出现的概念放在同一条逻辑线上理解：**类型本身也是编译器可以在编译期查询和处理的信息**。`cv` 限定符描述类型的限定状态，`decltype` 用来取得表达式的类型，而 `<type_traits>` 中的 `std::is_same_v` 可以在编译期判断两个类型是否完全相同。

##### 10.4.1 cv 限定符：`const` 与 `volatile`

C++ 中的 **cv-qualifier（cv 限定符）**指：

- `const`
- `volatile`

其中 `c` 来自 `const`，`v` 来自 `volatile`。因此，对于一个类型 `T`，可以形成：

```cpp
T
const T
volatile T
const volatile T
```

例如：

```cpp
int a = 1;
const int b = 2;
volatile int c = 3;
const volatile int d = 4;
```

`const` 表示不能通过该名字或访问路径修改对象；`volatile` 表示对该对象的访问具有特殊的可观察语义，常见于某些底层硬件或内存映射 I/O 场景。

> [!WARNING]
> `volatile` **不是线程同步机制**，不能替代 `std::atomic`、互斥锁等并发同步工具。

cv 限定也是类型的一部分，因此下面两个类型并不相同：

```cpp
int
const int
```

例如：

```cpp
#include <type_traits>

static_assert(std::is_same_v<int, int>);
static_assert(!std::is_same_v<int, const int>);
```

指针中还要区分“被指向对象的 const”与“指针自身的 const”：

```cpp
const int* p1;  // 指向 const int 的指针
int* const p2 = nullptr; // const 指针，指向 int
```

它们是不同类型：

```cpp
static_assert(!std::is_same_v<const int*, int* const>);
```

参考：[cppreference：cv type qualifiers](https://en.cppreference.com/w/cpp/language/cv)。

##### 10.4.2 `decltype`：取得表达式的类型

`decltype` 是 C++11 引入的类型推导关键字，用于根据一个表达式得到类型：

```cpp
int x = 10;
decltype(x) y = 20;
```

这里：

```cpp
decltype(x)
```

得到 `int`，因此 `y` 的类型也是 `int`。

对于**未加括号的标识符表达式或未加括号的类成员访问表达式**，`decltype` 通常直接得到该实体声明时的类型。例如：

```cpp
const int x = 10;
static_assert(std::is_same_v<decltype(x), const int>);
```

对于其他表达式，`decltype` 还会根据表达式的值类别决定是否得到引用类型：

| 表达式类别 | `decltype(expr)` 的结果 |
| --- | --- |
| lvalue（左值） | `T&` |
| xvalue（将亡值） | `T&&` |
| prvalue（纯右值） | `T` |

因此下面这个细节非常重要：

```cpp
int x = 10;

static_assert(std::is_same_v<decltype(x), int>);
static_assert(std::is_same_v<decltype((x)), int&>);
```

`decltype(x)` 使用“未加括号标识符”的特殊规则，直接得到声明类型 `int`；而 `(x)` 是一个普通的左值表达式，所以 `decltype((x))` 得到 `int&`。

> [!IMPORTANT]
> `decltype(x)` 与 `decltype((x))` 可能得到不同类型。学习模板和完美转发时，这个差别尤其重要。

`decltype` 只是在编译期查询类型；通常不会为了求类型而真的执行表达式。例如：

```cpp
int func();
using Result = decltype(func()); // Result 是 int
```

这里不需要真正调用 `func()` 就能确定返回表达式的类型。

参考：[cppreference：decltype specifier](https://en.cppreference.com/w/cpp/language/decltype)。

##### 10.4.3 什么是 C++ 元编程

**Metaprogramming（元编程）**可以理解为：让程序在编译阶段处理“程序自身的信息”，例如类型、编译期常量和模板参数，并据此进行计算、判断或选择代码。

普通运行期编程主要处理值：

```cpp
int a = 10;
int b = 20;
int c = a + b;
```

这里程序运行时处理的是 `10`、`20`、`30` 这些数据。

而下面的代码处理的是**类型信息**：

```cpp
std::is_same_v<int, double>
```

它在问编译器：

> `int` 和 `double` 是否为同一个类型？

因此可以把两者粗略区分为：

```text
普通编程：运行时处理数据和值
元编程：  编译时处理类型、模板参数、编译期常量等信息
```

C++ 中模板是元编程的重要基础，因为模板允许把类型作为参数：

```cpp
template <typename T>
void func();
```

这里的 `T` 不是一个普通运行期变量，而是一个**类型参数**。

现代 C++ 的编译期编程并不只有传统的“模板元编程”。`constexpr`、`if constexpr`、concepts 和各种 type traits 也都可以参与编译期计算和约束。因此更准确地说，**模板元编程是 C++ 元编程的一部分，而不是全部。**

##### 10.4.4 `<type_traits>`：编译期类型工具箱

`<type_traits>` 是 C++ 标准库头文件，提供大量用于编译期类型查询和类型变换的工具。例如：

```cpp
#include <type_traits>

std::is_same_v<T, U>          // T、U 是否完全相同
std::is_integral_v<T>         // T 是否为整数类型
std::is_pointer_v<T>          // T 是否为指针类型
std::is_const_v<T>            // T 是否具有顶层 const 限定
std::remove_reference_t<T>    // 去掉引用
std::remove_const_t<T>        // 去掉顶层 const
```

可以把它理解为一个**编译期类型工具箱**。

如果代码直接使用其中的组件，应显式包含：

```cpp
#include <type_traits>
```

不要依赖其他头文件“碰巧”间接包含 `<type_traits>`。

参考：[cppreference：`<type_traits>`](https://en.cppreference.com/w/cpp/header/type_traits)。

##### 10.4.5 `std::is_same` 与 `std::is_same_v`

`std::is_same<T, U>` 是一个 type trait，用于判断 `T` 和 `U` 是否表示**完全相同的类型**。

传统写法是：

```cpp
std::is_same<int, int>::value      // true
std::is_same<int, double>::value   // false
```

从 C++17 起，标准库提供了更简洁的变量模板：

```cpp
std::is_same_v<int, int>      // true
std::is_same_v<int, double>   // false
```

可以把：

```cpp
std::is_same_v<T, U>
```

理解为更简洁的：

```cpp
std::is_same<T, U>::value
```

这里 `_v` 是标准库常见的 **value** 命名形式，表示直接取得 trait 的值。类似地，许多类型变换还提供 `_t` 形式，用于直接取得其中的 `type`：

```cpp
std::remove_reference_t<int&>
```

等价于：

```cpp
typename std::remove_reference<int&>::type
```

因此可以记为：

```text
_v → value → 取值
_t → type  → 取类型
```

但要注意：`_v`、`_t` 是标准库采用的命名约定，不是 C++ 语言本身的特殊语法后缀。

`std::is_same_v` 的判断非常严格。例如：

```cpp
static_assert(std::is_same_v<int, int>);
static_assert(!std::is_same_v<int, const int>);
static_assert(!std::is_same_v<int, int&>);
static_assert(!std::is_same_v<int&, int&&>);
static_assert(!std::is_same_v<int*, const int*>);
```

只要 cv 限定、引用类别或指针所指向类型等存在差异，就可能不是同一个类型。

参考：[cppreference：`std::is_same`](https://en.cppreference.com/w/cpp/types/is_same)。

##### 10.4.6 `decltype` + `std::is_same_v`：验证类型推导结果

两者经常一起使用：

- `decltype(expr)`：**取出类型**；
- `std::is_same_v<T, U>`：**比较类型**。

例如字符串练习：

```cpp
#include <string>
#include <type_traits>

using namespace std::string_literals;

int main()
{
    auto hello = "Hello"s;
    auto world = "world";

    static_assert(std::is_same_v<decltype(hello), std::string>);
    static_assert(std::is_same_v<decltype(world), const char*>);
}
```

分析过程是：

```text
"Hello"s
   ↓
std::string
   ↓
auto hello = ...
   ↓
decltype(hello) == std::string
   ↓
std::is_same_v<std::string, std::string>
   ↓
true
```

而：

```cpp
auto world = "world";
```

中，字符串字面量 `"world"` 本身是 `const char[6]` 类型的数组；在这里进行 `auto` 推导时发生数组到指针转换，因此 `world` 的类型是 `const char*`：

```cpp
static_assert(std::is_same_v<decltype(world), const char*>);
```

> [!NOTE]
> 不要把“字符串字面量自身的类型”和“`auto` 变量最终推导出的类型”混为一谈。`"world"` 本身是字符数组，而 `auto world = "world";` 中的 `world` 是指针。

如果希望编译器在类型不符合预期时直接拒绝编译，通常可以配合 `static_assert`：

```cpp
static_assert(std::is_same_v<decltype(hello), std::string>);
```

这样类型检查在程序运行前就已经完成。

参考：[cppreference：`decltype`](https://en.cppreference.com/w/cpp/language/decltype)、[cppreference：`std::is_same`](https://en.cppreference.com/w/cpp/types/is_same)、[cppreference：Array-to-pointer conversion](https://en.cppreference.com/w/cpp/language/array#Array-to-pointer_decay)。
