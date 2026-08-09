# C++语言学习

> [!NOTE]
> 本笔记以 **C++20** 为主要基线。涉及更早标准引入的特性时会注明最低版本；涉及 `std::expected` 等更新内容时会明确标注为 C++23。
>
> 版本速览：`auto`、范围 `for`、移动语义、`override` 与标准智能指针从 C++11 起可用；`std::make_unique` 从 C++14 起可用；`std::optional` 从 C++17 起可用；`std::jthread`、`std::source_location` 和 `std::format` 是 C++20 功能；`std::expected`、`std::print` 和 `std::println` 是 C++23 功能。

## 一、C++基础

### 1、基本样式

```cpp
#include <iostream>

int main() {
    std::cout << "Hello, World!\n";
    return 0;
}
```

### 2、编译和链接代码

单个源文件编译：

```bash
g++ -std=c++20 -Wall -Wextra -Wpedantic main.cpp -o main
```

多个源文件一起编译并链接：

```bash
g++ -std=c++20 -Wall -Wextra -Wpedantic \
    vector.cpp main.cpp -o main
./main
```

头文件通常由源文件通过 `#include` 引入，不应作为普通源文件列在这条编译命令中。

### 3、标准输入输出与分支结构

```cpp
#include <iostream>
#include <string>

int main() {
    double x = 0.0;
    double y = 0.0;
    std::string op;

    std::cout << "Operation: ";
    std::cin >> op;
    std::cout << "x: ";
    std::cin >> x;
    std::cout << "y: ";
    std::cin >> y;

    if (op == "+") {
        std::cout << x + y << '\n';
    } else if (op == "-") {
        std::cout << x - y << '\n';
    } else {
        std::cout << "Unknown operation.\n";
    }

    return 0;
}
```

### 4、循环

```cpp
#include <iostream>
#include <string>

int main() {
    int count = 0;

    while (count < 3) {
        double x = 0.0;
        double y = 0.0;
        std::string op;

        std::cout << "Operation: ";
        std::cin >> op;
        std::cout << "x: ";
        std::cin >> x;
        std::cout << "y: ";
        std::cin >> y;

        if (op == "+") {
            std::cout << x + y << '\n';
        } else if (op == "-") {
            std::cout << x - y << '\n';
        } else {
            std::cout << "Unknown operation.\n";
        }

        ++count;
    }

    return 0;
}
```

for循环的另一种简洁的写法：

范围 `for` 适合依次访问容器中的每个元素。若元素复制成本较高，应使用引用；只读访问时通常使用 `const auto&`：

```cpp
for (const auto& obj : objs) {
    std::cout << obj->to_string() << '\n';
}
```

这里假定 `objs` 保存的是支持 `operator->` 的指针或智能指针对象。

### 5、函数

```cpp
#include <iostream>
#include <string>

void input(std::string& op, double& x, double& y) {
    std::cout << "Operation: ";
    std::cin >> op;
    std::cout << "x: ";
    std::cin >> x;
    std::cout << "y: ";
    std::cin >> y;
}
```

函数参数中的 `const` 可以防止函数通过该参数修改实参。对于 `double` 这类小型标量，按值传递通常更简单；下面使用引用是为了演示只读引用参数：

```cpp
void calculate(const std::string& op, const double& x, const double& y) {
    if (op == "+") {
        std::cout << x + y << '\n';
    } else if (op == "-") {
        std::cout << x - y << '\n';
    } else {
        std::cout << "Unknown operation.\n";
    }
}
```

#### 5.1 `static` 关键字

`static` 在不同上下文中的作用并不相同。下面这个例子中两个 `static` 分别控制函数的链接属性和局部变量的存储期：

```cpp
static int func(int param) {
    static int static_ = param;
    return static_++;
}
```

##### 5.1.1 修饰命名空间作用域函数：内部链接

函数定义前的 `static`：

```cpp
static int func(int param)
```

表示该函数具有 **internal linkage（内部链接）**。也就是说，这个名字只在当前翻译单元中可见，其他 `.cpp` 文件不能通过普通的外部声明链接到这个函数。

> [!NOTE]
> 这里的 `static` 不会让函数“保存上一次调用的状态”。它影响的是函数名的链接属性。现代 C++ 中，如果只是想让命名空间作用域的实体只在当前翻译单元内部使用，也常使用匿名命名空间。

##### 5.1.2 修饰局部变量：静态存储期

函数内部的局部 `static` 变量：

```cpp
static int static_ = param;
```

仍然具有**局部作用域**，只能在所在代码块中访问；但它具有 **static storage duration（静态存储期）**，对象的存储会持续到程序结束。

对于这里依赖运行期参数 `param` 的初始化表达式，初始化会在程序第一次执行到这条声明时发生，并且只发生一次。因此第一次调用 `func(5)` 时 `static_` 被初始化为 `5`；之后再调用 `func(4)`、`func(3)` 时，不会重新用新的 `param` 初始化它。

又因为：

```cpp
return static_++;
```

`static_++` 是后置自增：先产生自增前的值作为表达式结果，再把 `static_` 加 `1`。

> [!IMPORTANT]
> 局部 `static` 的关键点是：**作用域仍然是局部的，但存储期是静态的，并且动态初始化只执行一次。** 从 C++11 起，局部静态变量的初始化本身保证只执行一次；但初始化完成后，如果多个线程同时修改这个变量，仍然需要程序自己进行同步。

参考：[cppreference：Storage duration and linkage](https://en.cppreference.com/w/cpp/language/storage_duration.html)

#### 5.2 成员函数尾部的 `const`

对于**非静态成员函数**，参数列表后面的 `const` 是成员函数的 cv 限定符之一：

```cpp
struct Fibonacci {
    int numbers[11];

    int get(int i) const {
        return numbers[i];
    }
};
```

这里最后的 `const`：

```cpp
int get(int i) const
               ^^^^^
```

**不是修饰返回类型 `int`，也不是修饰参数 `i`**，而是限定这个成员函数所操作的当前对象。

成员函数在调用时会隐式接收当前对象。可以把普通成员函数近似理解为存在一个隐式的 `this` 指针：

```cpp
Fibonacci* this;
```

而在 `const` 成员函数中，可以近似理解为：

```cpp
const Fibonacci* this;
```

更准确地说，`this` 指向 const 的当前对象，因此函数不能通过 `this` 修改普通数据成员，也不能调用当前类的非 `const` 成员函数：

```cpp
struct Fibonacci {
    int numbers[11];

    int get(int i) const {
        // numbers[i] = 100;  // 错误：不能修改普通成员
        return numbers[i];    // 正确：只读取
    }

    void reset() {
        numbers[0] = 0;
    }

    void test() const {
        // reset();           // 错误：const 成员函数不能调用非 const 成员函数
    }
};
```

##### 5.2.1 为什么 `const` 对象只能调用 `const` 成员函数

例如：

```cpp
constexpr Fibonacci FIB{{0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55}};
```

`constexpr` 对象本身也是 const 对象。因此下面的成员函数如果没有尾部 `const`：

```cpp
int get(int i) {
    return numbers[i];
}
```

就不能通过 `FIB` 调用，编译器常会报告类似：

```text
passing 'const Fibonacci' as 'this' argument discards qualifiers
```

意思是：调用这个非 `const` 成员函数需要把 const 当前对象当成可修改对象使用，相当于丢弃了 `const` 限定。

正确写法是：

```cpp
int get(int i) const {
    return numbers[i];
}
```

于是：

```cpp
FIB.get(10);  // 正确
```

普通的非 const 对象既可以调用非 const 成员函数，也可以调用 const 成员函数；const 对象则只能调用 const 成员函数：

| 当前对象 | 非 `const` 成员函数 | `const` 成员函数 |
| --- | --- | --- |
| 普通对象 | 可以 | 可以 |
| `const` / `constexpr` 对象 | 不可以 | 可以 |

##### 5.2.2 `const` 成员函数仍可能修改 `mutable` 成员

尾部 `const` 的准确含义不是“这个函数绝对不会产生任何修改”，而是它不能通过当前对象修改普通非静态数据成员。

被声明为 `mutable` 的成员是例外：

```cpp
struct Cache {
    mutable int access_count = 0;

    int read() const {
        ++access_count;  // 允许
        return access_count;
    }
};
```

此外，函数仍然可能修改全局变量、通过指针或引用修改其他对象，或者执行 I/O。因此不要把尾部 `const` 简单理解为“纯函数”。

##### 5.2.3 const 与非 const 成员函数可以构成重载

常见写法是同时提供两个版本：

```cpp
struct Buffer {
    int data[10];

    int& operator[](std::size_t i) {
        return data[i];
    }

    const int& operator[](std::size_t i) const {
        return data[i];
    }
};
```

这样普通对象调用非 const 版本，可以得到可修改引用；const 对象调用 const 版本，只能得到只读引用。

##### 5.2.4 函数中不同位置的 `const`

需要区分 `const` 出现在函数声明中的不同位置：

```cpp
const int f(const int& x) const;
^^^^^       ^^^^^         ^^^^^
返回类型     参数           成员函数尾部
```

它们分别限定不同的对象。尤其要记住：

> **只有非静态成员函数参数列表后面的 `const`，才是在限定当前对象 `*this`。**

静态成员函数没有 `this` 指针，因此不能写成员函数尾部的 cv 限定符。

参考：[cppreference：Non-static member functions](https://en.cppreference.com/w/cpp/language/member_functions.html)

### 6、引用

引用参数让函数直接访问调用方对象。需要修改实参时使用非常量左值引用，只读访问时优先使用 const 引用：

```cpp
#include <string>

void input(std::string& op, double& x, double& y);
void calculate(const std::string& op, double x, double y);

int main()
{
    double x = 0.0;
    double y = 0.0;
    std::string op;

    input(op, x, y);
    calculate(op, x, y);
}
```

### 7、数组

在内置数组变量声明 `T array[N]` 中，数组界限 `N` 必须是常量表达式；动态分配的 `new T[n]` 可以使用运行期长度，但运行期序列通常应优先使用 `std::vector`。固定长度可使用 `std::array`：

```cpp
#include <array>
#include <cstddef>

constexpr std::size_t size = 3;
std::array<double, size> numbers{};
```

运行期才能确定长度时使用 `std::vector`，不要使用 `double numbers[size]` 这类编译器扩展：

```cpp
#include <cstddef>
#include <vector>

std::size_t size = 3;
std::vector<double> numbers(size);
```

### 8、结构体

```cpp
#include <cstddef>
#include <iostream>
#include <string>

struct Numbers {
    double* data = nullptr;
    std::size_t size = 0;
};

void input(std::string& op, Numbers numbers)
{
    std::cin >> op;

    for (std::size_t i = 0; i < numbers.size; ++i) {
        std::cin >> numbers.data[i];
    }
}
```

`Numbers` 只借用外部数组，并不拥有 `data` 指向的内存；调用者必须保证该数组在使用期间仍然有效。

### 9、字符串

```cpp
#include <string>
```

#### 9.1 行读取 `std::getline()` 函数

```cpp
std::string line;

if (std::getline(std::cin, line)) {
    std::cout << line << '\n';
}
```

`std::getline` 把一整行保存到 `line`。若前面使用过 `operator>>`，需先妥善处理输入缓冲区中遗留的换行符；不要读取一行后又忽略 `line`、继续从 `std::cin` 解析同一份输入。

#### 9.2 字符串流 `std::stringstream`

```cpp
#include <stringstream>
```

```cpp
#include <cstddef>
#include <iostream>
#include <sstream>
#include <string>

struct Numbers {
    double* data = nullptr;
    std::size_t size = 0;
};

void input(std::string& op, Numbers numbers)
{
    std::string line;
    if (!std::getline(std::cin, line)) {
        return;
    }

    std::stringstream stream{line};
    stream >> op;

    for (std::size_t i = 0; i < numbers.size; ++i) {
        stream >> numbers.data[i];
    }
}
```

这样可以先取得一整行，再把该字符串当作输入流逐项解析。

这样就能够实现getline之后依旧用流的形式进行拆分读取变量。

### 10、数据类型

#### 10.1 size_t

```cpp
#include <cstddef>
```

在 C++ 中，`std::size_t` 是 `<cstddef>` 中定义的无符号整数类型，能够表示实现所支持的任意对象大小，常用于对象大小、容器长度和数组索引。许多标准库头文件也会间接声明它，但需要直接使用时应包含 `<cstddef>`。


#### 10.2 枚举类型：`enum` 与 `enum class`

枚举（enumeration）是一种独立类型，用一组有名字的常量表示有限的离散取值。每个枚举都有一个**底层整数类型（underlying type）**。

C++ 中主要有两类枚举：无作用域枚举 `enum`，以及 C++11 引入的有作用域枚举 `enum class`（`enum struct` 与之等价）。

##### 10.2.1 无作用域枚举 `enum`

```cpp
enum ColorEnum : unsigned char {
    COLOR_RED = 31,
    COLOR_GREEN,
    COLOR_YELLOW,
    COLOR_BLUE,
};
```

`: unsigned char` 显式指定了底层类型。若后续枚举项没有显式赋值，其值为前一个枚举项加 `1`，因此这里依次为 `31、32、33、34`。

无作用域枚举的枚举项会进入外围作用域，可以直接写：

```cpp
ColorEnum color = COLOR_RED;
```

因此不同枚举若定义同名枚举项，容易发生名字冲突，这就是常说的“命名空间污染”。无作用域枚举值还可以隐式转换为整数类型：

```cpp
int value = COLOR_RED;  // value == 31
```

> [!NOTE]
>
> 枚举项不是普通的 `constexpr` 变量。更准确地说，它们是**枚举类型的命名常量**，可以用于要求常量表达式的场景。

##### 10.2.2 有作用域枚举 `enum class`

```cpp
enum class Color : int {
    Red = 31,
    Green,
    Yellow,
    Blue,
};
```

枚举项位于枚举自身的作用域中，因此使用时要写：

```cpp
Color color = Color::Red;
```

`enum class` 的主要优点是**避免名字污染**并提供更强的**类型安全**。它不会隐式转换为整数：

```cpp
Color color = Color::Green;

// int value = color;               // 错误
int value = static_cast<int>(color); // 正确
```

若 `enum class` 没有显式指定底层类型，其底层类型默认为 `int`。

##### 10.2.3 枚举之间的显式转换

不同枚举即使数值相同，也仍然是不同类型。需要明确进行值转换时可以使用 `static_cast`：

```cpp
Color color = Color::Green;
ColorEnum old_color = static_cast<ColorEnum>(color);
```

对具有固定底层类型的目标枚举，`static_cast` 会按照标准规定的枚举转换规则完成转换。

> [!WARNING]
>
> `static_cast` 不会验证转换后的数值一定对应某个已经命名的枚举项。接口仍应保证输入值处于约定范围内。

参考：[`enum`](https://en.cppreference.com/w/cpp/language/enum)、[`static_cast`](https://en.cppreference.com/w/cpp/language/static_cast)。

#### 10.3 联合体 `union`

`union`（联合体）是一种特殊的类类型。多个非静态数据成员**共享同一块存储空间**，通常同一时刻只有一个成员处于活动状态（active member）。

```cpp
union Value {
    int i;
    double d;
};

Value value;
value.i = 42;   // i 成为活动成员
int x = value.i;

value.d = 3.14; // d 成为新的活动成员
```

联合体必须拥有足够的空间容纳最大的成员，但各成员使用的是重叠存储，而不是像 `struct` 那样分别占用独立空间。

##### 10.3.1 活动成员与类型双关

**类型双关（type punning）**是把一种类型的对象表示当成另一种无关类型解释。传统代码有时会写：

```cpp
union TypePun {
    int i;
    float f;
};

TypePun pun;
pun.i = 0x3f800000;
float value = pun.f;
```

这里先写 `i`，再读取另一个成员 `f`。

> [!WARNING]
>
> 在标准 C++ 中，读取非当前活动成员的 `union` 成员通常是**未定义行为（undefined behavior）**。某些编译器把它作为扩展支持，但不能据此把它视为可移植的标准 C++。标准只为少数特殊情况提供例外，例如标准布局类型的共同初始序列。

C 与 C++ 对 `union` 类型双关的规则并不相同，因此不能把 C 中的写法直接当成标准 C++ 技巧。

##### 10.3.2 `union` 不是通用类型转换工具

例如本题中的两个枚举：

```cpp
enum ColorEnum : unsigned char { COLOR_RED = 31 };
enum class Color : int { Red = 31 };

union TypePun {
    ColorEnum e;
    Color c;
};
```

如果写：

```cpp
TypePun pun;
pun.c = Color::Red;
return pun.e;
```

此时 `c` 是活动成员，而 `e` 不是，因此读取 `pun.e` 在标准 C++ 中通常属于未定义行为。

此外，`ColorEnum` 的底层类型是 `unsigned char`，而 `Color` 的底层类型是 `int`。它们的大小和对象表示通常不同；即使某个平台或编译器扩展下“碰巧能工作”，结果也可能依赖字节序、整数表示和编译器实现。

真正想进行**枚举值转换**时应写：

```cpp
return static_cast<ColorEnum>(c);
```

如果真正需要按位复制对象表示，C++20 提供 `std::bit_cast`（`<bit>`），但它要求 `sizeof(To) == sizeof(From)`，且两种类型都必须是 trivially copyable。因此本例中底层类型大小不同的两个枚举不能用 `std::bit_cast` 互转。

参考：[`union`](https://en.cppreference.com/w/cpp/language/union)、[`std::bit_cast`](https://en.cppreference.com/w/cpp/numeric/bit_cast)。

------

### 11、内存管理（动态分配）

#### 11.1 `new` 与 `delete`

```cpp
#include <cstddef>

int main()
{
    constexpr std::size_t capacity = 16;
    double* data = new double[capacity];

    for (std::size_t i = 0; i < capacity; ++i) {
        data[i] = 0.0;
    }

    delete[] data;
    return 0;
}
```

> [!WARNING]
>
> 这段代码用于说明 `new[]` 必须与 `delete[]` 配对。实际项目应优先使用 `std::vector<double>` 或 `std::unique_ptr<double[]>`，以便在提前返回或抛出异常时仍能自动释放资源。

如果需要扩容：

```cpp
#include <algorithm>
#include <limits>
#include <memory>
#include <stdexcept>

void reallocate()
{
    if (capacity_ >
        std::numeric_limits<std::size_t>::max() / 2) {
        throw std::length_error{"Vector capacity overflow"};
    }

    const std::size_t new_capacity =
        capacity_ == 0 ? 1 : 2 * capacity_;
    std::unique_ptr<T[]> new_data{new T[new_capacity]};

    if (size_ != 0) {
        std::copy_n(data_, size_, new_data.get());
    }

    delete[] data_;
    data_ = new_data.release();
    capacity_ = new_capacity;
}
```

临时 `std::unique_ptr<T[]>` 会在元素复制抛出异常时释放新数组；只有复制成功后才提交新资源。

扩容可以采用每次多一倍的容量。

#### 11.2 RAII 机制

**RAII** 是 **Resource Acquisition Is Initialization** 的缩写，通常译为：

> **资源获取即初始化**

不过，更准确地理解应该是：

> **把资源的生命周期绑定到一个 C++ 对象的生命周期。**

对象构造时获取资源，对象析构时释放资源。这样，程序员不需要在每一条返回路径上手动清理资源。C++ Core Guidelines 将其作为资源管理的首要原则：使用资源句柄和 RAII 自动管理资源。

------

##### 11.2.1 什么是“资源”

这里的资源不只是动态内存，还包括：

- 堆内存
- 文件句柄
- 网络套接字
- 数据库连接
- 互斥锁
- 线程
- 操作系统句柄
- 图形资源
- 临时状态

这些资源通常都有成对操作：

| 获取资源    | 释放资源       |
| ----------- | -------------- |
| `new`       | `delete`       |
| `fopen()`   | `fclose()`     |
| `lock()`    | `unlock()`     |
| 打开 socket | 关闭 socket    |
| 创建线程    | 等待或结束线程 |

RAII 的作用，就是把这种**成对操作**封装进对象：

```text
构造函数：获取资源
析构函数：释放资源
```

------

##### 11.2.2 RAII 依赖什么语言机制

RAII 的基础是 C++ 对象的**确定性析构**。

对于普通局部对象：

```cpp
void function()
{
    SomeObject obj;

    // 使用 obj
}
```

当程序离开这对大括号时，`obj` 的析构函数会被调用。C++ 标准将这类局部变量称为具有**自动存储期**的对象，它们的存储持续到所在代码块退出。

离开作用域的原因可以是：

```text
正常运行到 }
return
break
continue
抛出异常
```

尤其重要的是异常情况。异常传播时，C++ 会进行 **stack unwinding，栈展开**，销毁已经成功构造但尚未销毁的局部对象，而且按照构造完成顺序的逆序销毁。

因此，RAII 的核心流程是：

```text
进入作用域
   ↓
构造 RAII 对象
   ↓
获取资源
   ↓
使用资源
   ↓
离开作用域
   ↓
自动调用析构函数
   ↓
释放资源
```

------

##### 11.2.3 不使用 RAII 会有什么问题

考虑手动管理文件：

```cpp
#include <cstdio>

void write_file()
{
    std::FILE* file = std::fopen("data.txt", "w");

    if (file == nullptr)
        return;

    std::fputs("Hello\n", file);

    std::fclose(file);
}
```

这段代码看起来没问题，但是函数一旦变复杂：

```cpp
void write_file()
{
    std::FILE* file = std::fopen("data.txt", "w");

    if (file == nullptr)
        return;

    if (some_condition())
        return;  // 忘记 fclose

    do_something();  // 这里可能抛出异常

    std::fputs("Hello\n", file);

    std::fclose(file);
}
```

这里至少有两种资源泄漏路径：

1. `some_condition()` 成立时提前 `return`；
2. `do_something()` 抛出异常。

你可以在每个出口手动添加 `fclose()`：

```cpp
if (some_condition())
{
    std::fclose(file);
    return;
}
```

但随着函数变复杂，这种写法非常容易遗漏。资源越多，清理顺序也越难维护。

------

##### 11.2.4 使用 RAII 封装文件资源

可以写一个管理文件的类：

```cpp
#include <cstdio>
#include <stdexcept>
#include <utility>

class File
{
private:
    std::FILE* file = nullptr;

public:
    // 构造函数：获取资源
    explicit File(const char* path, const char* mode)
    {
        file = std::fopen(path, mode);

        if (file == nullptr)
        {
            throw std::runtime_error("无法打开文件");
        }
    }

    // 析构函数：释放资源
    ~File() noexcept
    {
        if (file != nullptr)
        {
            std::fclose(file);
        }
    }

    // 禁止复制
    File(const File&) = delete;
    File& operator=(const File&) = delete;

    // 允许移动：转移资源所有权
    File(File&& other) noexcept
        : file(std::exchange(other.file, nullptr))
    {
    }

    File& operator=(File&& other) noexcept
    {
        if (this != &other)
        {
            if (file != nullptr)
            {
                std::fclose(file);
            }

            file = std::exchange(other.file, nullptr);
        }

        return *this;
    }

    std::FILE* get() const noexcept
    {
        return file;
    }
};
```

现在使用它：

```cpp
void write_file()
{
    File file("data.txt", "w");

    std::fputs("Hello\n", file.get());

    if (some_condition())
    {
        return;
    }

    do_something();
}
```

无论函数以哪种方式离开：

```text
正常结束
提前 return
抛出异常
```

局部对象 `file` 都会被销毁，其析构函数随之调用：

```cpp
~File()
{
    if (file != nullptr) {
        std::fclose(file);
    }
}
```

因此，文件能够自动关闭。

------

##### 11.2.5 “资源获取即初始化”具体是什么意思

以下语句：

```cpp
File file("data.txt", "w");
```

同时完成了两件事：

1. 构造 `File` 对象；
2. 获取文件资源。

如果文件打开失败，构造函数抛出异常：

```cpp
throw std::runtime_error("无法打开文件");
```

于是不会产生一个“已经构造完成但不能正常使用”的 `File` 对象。

也就是说，构造成功后，`File` 对象会管理一个有效资源，直到资源被转移或对象析构。移动后的源对象仍然有效，但处于不拥有文件的空状态；它可以安全析构或重新赋值，要求文件资源的成员函数则必须先检测该状态。

这也是 RAII 很重要的一点：

> **不要让对象长期处于“半初始化”状态。**

例如不太理想的设计是：

```cpp
File file;
file.open("data.txt");
```

此时在 `open()` 之前，`file` 到底是不是一个有效对象，就需要额外判断。

**RAII 通常更倾向于：**

```cpp
File file("data.txt");
```

构造成功即代表资源已经可用；构造失败则直接报告错误。

------

##### 11.2.6 为什么必须禁止复制

假设允许 `File` 对象被复制：

```cpp
File file1("data.txt", "w");
File file2 = file1;
```

如果采用默认的成员复制，那么两个对象内部可能保存相同的 `FILE*`：

```text
file1.file ──┐
             ├── 同一个文件句柄
file2.file ──┘
```

函数结束时：

```text
file2 析构 → fclose
file1 析构 → 再次 fclose
```

这会导致**重复释放资源**。

因此，对于独占资源，通常有两种设计：

**禁止复制**

```cpp
File(const File&) = delete;
File& operator=(const File&) = delete;
```

**支持移动**

```cpp
File(File&& other) noexcept;
File& operator=(File&& other) noexcept;
```

移动不是复制资源，而是转移所有权：

```text
移动前：

file1 ──→ 文件
file2 ──→ 空

移动后：

file1 ──→ 空
file2 ──→ 文件
```

这与 `std::unique_ptr` 的语义相同。标准将 `std::unique_ptr` 定义为拥有并通过指针管理另一个对象的独占所有权对象，它禁止复制，但支持移动。

------

##### 11.2.7 RAII 和智能指针

最常见的 RAII 工具就是智能指针。

###### 11.2.7.1 `std::unique_ptr`

不推荐：

```cpp
void function()
{
    int* p = new int(100);

    do_something();

    delete p;
}
```

如果 `do_something()` 抛出异常，`delete p` 不会执行。

推荐：

```cpp
#include <memory>

void function()
{
    auto p = std::make_unique<int>(100);

    do_something();
}
```

离开作用域时：

```text
p 的析构函数被调用
    ↓
释放它所拥有的 int 对象
```

`std::unique_ptr` 表达的是：

> **这个对象由我独占拥有。**

------

###### 11.2.7.2 `std::shared_ptr`

```cpp
auto p1 = std::make_shared<int>(100);
auto p2 = p1;
```

`p1` 和 `p2` 共享对象所有权。最后一个拥有者销毁时，被管理对象才会被销毁。

不过不能因为它方便就全部使用 `shared_ptr`。一般原则是：

```text
默认使用值语义
    ↓
确实需要动态独占所有权时使用 unique_ptr
    ↓
确实需要共享所有权时才使用 shared_ptr
```

否则容易造成：

- 所有权关系不清晰；
- 引用计数开销；
- 循环引用；
- 对象释放时间难以判断。

------

##### 11.2.8 RAII 和互斥锁

手动加锁的代码：

```cpp
mutex.lock();

do_something();

mutex.unlock();
```

如果 `do_something()` 抛出异常，`unlock()` 不会执行，互斥锁可能永远保持锁定。

RAII 写法：

```cpp
#include <mutex>

std::mutex mutex;

void function()
{
    std::lock_guard<std::mutex> guard(mutex);

    do_something();
}
```

流程如下：

```text
guard 构造
   ↓
mutex.lock()

执行代码

guard 析构
   ↓
mutex.unlock()
```

标准中的锁包装对象就是为了在正常路径和异常路径中减轻手动解锁负担。

因此不要轻易这样写：

```cpp
mutex.lock();
// ...
mutex.unlock();
```

优先写成：

```cpp
std::lock_guard<std::mutex> guard(mutex);
```

需要手动提前解锁时，可以使用：

```cpp
std::unique_lock<std::mutex>
```

------

##### 11.2.9 标准库中大量使用了 RAII

很多常用 C++ 类型本身就是 RAII 对象：

| 类型               | 管理的资源       |
| ------------------ | ---------------- |
| `std::vector`      | 动态数组内存     |
| `std::string`      | 字符串存储空间   |
| `std::unique_ptr`  | 独占动态对象     |
| `std::shared_ptr`  | 共享动态对象     |
| `std::ifstream`    | 输入文件         |
| `std::ofstream`    | 输出文件         |
| `std::lock_guard`  | 互斥锁的锁定状态 |
| `std::unique_lock` | 可控制的锁定状态 |
| `std::jthread`（C++20） | 线程生命周期     |

例如：

```cpp
void function()
{
    std::vector<int> numbers(100000);

    std::string text = "Hello";

    std::ofstream output("data.txt");

    auto object = std::make_unique<MyClass>();
}
```

离开作用域时，这些对象会通过各自析构函数完成清理。`std::vector` 和 `std::string` 本身没有 `release()` 成员；`std::ofstream` 通常无需显式 `close()`；`std::unique_ptr` 管理的对象也不应再手动 `delete`。

------

##### 11.2.10 析构顺序

局部对象按照**构造顺序的逆序**析构：

```cpp
void function()
{
    A a;
    B b;
    C c;
}
```

构造顺序：

```text
a → b → c
```

析构顺序：

```text
c → b → a
```

C++ 标准明确规定，离开作用域时，局部自动存储期变量按照构造顺序的逆序销毁。

这使得资源之间的依赖关系可以自然表达：

```cpp
Connection connection;
Transaction transaction(connection);
```

`transaction` 依赖 `connection`，所以：

```text
先构造 connection
再构造 transaction

先析构 transaction
再析构 connection
```

这正好满足依赖对象先被释放、底层资源后被释放的需求。

------

##### 11.2.11 构造函数抛出异常时会发生什么

考虑：

```cpp
class Example
{
private:
    ResourceA a;
    ResourceB b;
    ResourceC c;

public:
    Example()
        : a(), b(), c()
    {
    }
};
```

构造顺序为：

```text
a → b → c
```

如果构造 `c` 时抛出异常：

```text
a 已构造成功
b 已构造成功
c 构造失败
```

C++ 会自动执行：

```text
销毁 b
销毁 a
```

但是不会调用 `Example` 自己的析构函数，因为 `Example` 对象**没有完整构造成功**。

这就是为什么应当把资源包装成成员对象：

```cpp
class Good
{
    ResourceA a;
    ResourceB b;
};
```

而不是大量保存裸资源：

```cpp
class Risky
{
    ResourceA* a;
    ResourceB* b;
};
```

前一种方式中，每个成员都自己负责自己的资源，**构造途中发生异常时，已经完成构造的成员也会自动清理。**

------

##### 11.2.12 Rule of Zero：比手写析构函数更好的做法

虽然前面手写了一个 `File` 类，但现代 C++ 更鼓励：

> 尽可能让成员对象自己管理资源，从而不必手写析构、复制和移动操作。

例如：

```cpp
class Person
{
private:
    std::string name;
    std::vector<int> scores;

public:
    Person(std::string n, std::vector<int> s)
        : name(std::move(n)), scores(std::move(s))
    {
    }
};
```

这个类不需要写：

```cpp
~Person()
Person(const Person&)
Person& operator=(const Person&)
Person(Person&&)
Person& operator=(Person&&)
```

因为：

```cpp
std::string
std::vector
```

已经正确实现了资源管理。

这叫做：

**Rule of Zero，零法则**

> 如果类的所有资源都由 RAII 成员管理，那么尽量不要自己定义析构、复制构造、复制赋值、移动构造和移动赋值。

相对地，如果一个类**直接管理裸资源**，往往需要认真考虑：

- 析构函数
- 复制构造函数
- 复制赋值运算符
- 移动构造函数
- 移动赋值运算符

这通常称为 **Rule of Five，五法则**。

------

##### 11.2.13 析构函数为什么不应该抛出异常

RAII 依赖析构函数完成清理，因此析构函数通常应当保证不抛异常：

```cpp
~File() noexcept
{
    if (file != nullptr)
    {
        std::fclose(file);
    }
}
```

假设程序已经因为异常而进行栈展开，此时某个析构函数又抛出异常，程序将调用 `std::terminate()`。C++ 标准明确规定，栈展开期间直接调用的析构函数如果通过异常退出，会触发终止。

因此通常遵循：

```text
析构函数负责尽力清理
析构函数不向外抛异常
```

C++ Core Guidelines 也提出“析构函数不得失败”，并建议析构函数具有 `noexcept` 语义。

有些清理操作本身可能失败，例如：

```text
刷新文件
提交数据库事务
发送剩余网络数据
```

这时可以设计一个显式操作：

```cpp
file.close();      // 可以报告错误
transaction.commit(); // 可以报告错误
```

析构函数则作为最后的清理保障：

```cpp
~File() noexcept;
~Transaction() noexcept;
```

------

##### 11.2.14 RAII 不等于垃圾回收

RAII 和垃圾回收的目标有部分相似，但机制不同。

| RAII                        | 垃圾回收                     |
| --------------------------- | ---------------------------- |
| 基于对象生命周期            | 基于运行时可达性分析         |
| 通常在确定时刻释放资源      | 回收时机可能不确定           |
| 不仅管理内存                | 主要解决内存回收             |
| 依赖析构函数                | 通常依赖垃圾回收器           |
| 适合锁、文件、socket 等资源 | 不适合依赖及时释放的锁等资源 |

RAII 的关键优势是：

```text
资源何时释放，通常可以从作用域直接判断。
```

例如：

```cpp
{
    std::lock_guard<std::mutex> guard(mutex);

    // 临界区
}
// 到这里锁已经释放
```

不是“将来某个时候可能释放”，而是离开作用域时释放。

------

##### 11.2.15 RAII 也不是“栈上才能用”

这是一个常见误解。

RAII 对象可以位于栈上：

```cpp
File file("data.txt", "w");
```

也可以动态创建：

```cpp
auto file = std::make_unique<File>("data.txt", "w");
```

真正关键的是：

> 管理资源的对象本身也必须被正确管理。

下面仍然会泄漏：

```cpp
File* file = new File("data.txt", "w");

// 忘记 delete file
```

因为 `File` 对象自己没有被销毁，它的析构函数自然也不会执行。

应写为：

```cpp
auto file = std::make_unique<File>("data.txt", "w");
```

形成两层 RAII：

```text
unique_ptr 管理 File 对象
File 对象管理文件句柄
```

离开作用域时：

```text
unique_ptr 析构
   ↓
销毁 File
   ↓
File 析构
   ↓
关闭文件
```

------

##### 11.2.16 RAII 的本质是所有权管理

理解 RAII 时，最好同时理解“所有权”。

拥有资源

```cpp
std::unique_ptr<int> owner;
```

`owner` 负责释放对象。

只观察资源

```cpp
int* observer;
```

裸指针通常可以表示：

> 我可以访问它，但不一定负责释放它。

所以裸指针本身并不天然意味着资源泄漏。真正的问题是：

```text
谁拥有资源？
谁负责释放？
所有者的生命周期是什么？
```

一个良好的 RAII 设计，应当让这些问题从类型上尽可能清晰。

------

##### 11.2.17 一个完整示例

```cpp
#include <cstdio>
#include <stdexcept>
#include <utility>

class File
{
private:
    std::FILE* file = nullptr;

public:
    explicit File(const char* path, const char* mode)
    {
        file = std::fopen(path, mode);

        if (file == nullptr)
        {
            throw std::runtime_error("打开文件失败");
        }
    }

    ~File() noexcept
    {
        if (file != nullptr)
        {
            std::fclose(file);
        }
    }

    File(const File&) = delete;
    File& operator=(const File&) = delete;

    File(File&& other) noexcept
        : file(std::exchange(other.file, nullptr))
    {
    }

    File& operator=(File&& other) noexcept
    {
        if (this == &other)
        {
            return *this;
        }

        if (file != nullptr)
        {
            std::fclose(file);
        }

        file = std::exchange(other.file, nullptr);

        return *this;
    }

    void write(const char* text)
    {
        if (file == nullptr)
        {
            throw std::logic_error("不能写入已移出的 File");
        }

        if (std::fputs(text, file) == EOF)
        {
            throw std::runtime_error("写入文件失败");
        }
    }
};

void save_data()
{
    File file("data.txt", "w");

    file.write("第一行\n");
    file.write("第二行\n");

    throw std::runtime_error("模拟后续操作失败");
}

int main()
{
    try
    {
        save_data();
    }
    catch (const std::exception& error)
    {
        std::printf("发生异常：%s\n", error.what());
    }

    return 0;
}
```

虽然这里主动抛出了异常：

```cpp
throw std::runtime_error("模拟后续操作失败");
```

但在异常离开 `save_data()` 之前：

```text
局部对象 file 被析构
    ↓
File::~File() 被调用
    ↓
fclose() 被执行
    ↓
异常继续传播到 catch
```

这就是 RAII 提供的**异常安全资源清理**。



### 12、类

#### 12.1 构造函数和析构函数

```cpp
class Vector {
public:
    Vector()
        : data_{new double[16]}, capacity_{16}, size_{0}
    {
    }

    Vector(const Vector&) = delete;
    Vector& operator=(const Vector&) = delete;

    ~Vector()
    {
        delete[] data_;
    }

private:
    double* data_;
    std::size_t capacity_;
    std::size_t size_;
};
```

该教学版本直接拥有动态数组，因此在实现深复制之前先明确禁止复制，避免两个对象重复释放同一地址。

##### 12.1.1 成员初始化列表（member initializer list）

```cpp
Vector()
    : data_{new T[2]}, capacity_{2}, size_{0}
{
}
```

成员初始化列表直接初始化基类和数据成员。`const` 数据成员与引用数据成员必须在进入构造函数体之前完成初始化：可以使用类内默认成员初始化器，也可以由构造函数的成员初始化列表提供值；若不同构造函数需要不同的值，通常使用成员初始化列表。

对于类类型成员，初始化列表还能避免先默认构造、再在函数体中赋值。更重要的是，它准确表达初始化语义；成员实际初始化顺序始终按类内声明顺序，而不是初始化列表的书写顺序。

##### 12.1.2 默认构造函数

代码见二.7.3

```cpp
Buffer() = default;
```

表示：**显式要求编译器生成 `Buffer` 的默认构造函数**。

其中：

```cpp
Buffer()
```

是一个**无参数构造函数**，也称默认构造函数；而：

```cpp
= default;
```

表示“这个函数的实现使用编译器生成的默认版本”。这种写法在标准中称为**显式默认化定义**（explicitly-defaulted definition）。

**在这个 `Buffer` 类中的作用:**

例如：

```cpp
#include <cstddef>

class Buffer {
private:
    int* data_ = nullptr;
    std::size_t size_ = 0;

public:
    Buffer() = default;

    explicit Buffer(std::size_t size)
        : data_(size == 0 ? nullptr : new int[size]),
          size_(size)
    {
    }

    Buffer(const Buffer&) = delete;
    Buffer& operator=(const Buffer&) = delete;

    ~Buffer()
    {
        delete[] data_;
    }
};
```

现在可以无参数创建对象：

```cpp
Buffer a;
Buffer b{};
```

构造后：

```cpp
a.data_ == nullptr
a.size_ == 0
```

因为**成员本身具有类内默认初始化器**：

```cpp
int* data_ = nullptr;
std::size_t size_ = 0;
```

默认构造函数会使用这些**初始化器**。

**为什么不直接省略这一行？**

因为类中已经声明了**其他构造函数**：

```cpp
explicit Buffer(std::size_t size);
```

只要类中存在用户声明的构造函数，编译器就**不会再自动隐式声明无参数默认构造函数**。

也就是说，删除：

```cpp
Buffer() = default;
```

以后，下面是**错误示例**：

```cpp
Buffer a;      // 编译错误：不存在默认构造函数
Buffer b(10);  // 正确
```

因为此时只存在接收 `size` 的构造函数。

**修正版：**写上：

```cpp
Buffer() = default;
```

相当于明确告诉编译器：

> 虽然我定义了其他构造函数，但仍然需要一个无参数构造函数，请你生成。

##### 12.1.3 `explicit` 构造函数

依旧是二.7.3中的代码。

这里的：

```cpp
explicit Buffer(std::size_t size);
```

`explicit` 是 C++ 的**显式说明符**。它表示：

> 这个构造函数只能被明确调用，不能被编译器用于隐式类型转换。

**不加 `explicit`**

```cpp
class Buffer {
public:
    Buffer(std::size_t size);
};
```

由于这个构造函数可以只接收一个参数，编译器可能把整数自动转换为 `Buffer`：

```cpp
Buffer a = 10;   // 允许：相当于 Buffer a(10);
```

甚至函数调用时也可能发生隐式转换：

```cpp
void process(Buffer buffer);

process(10);     // 编译器自动构造 Buffer(10)
```

这种可用于隐式转换的构造函数称为**转换构造函数**。标准规定，**未声明**为 `explicit` 的构造函数可以定义从参数类型到类类型的转换。

------

**加上 `explicit`**

```cpp
class Buffer {
public:
    explicit Buffer(std::size_t size);
};
```

**错误示例：**下面的隐式转换不再允许：

```cpp
Buffer a = 10;   // 编译错误
process(10);     // 编译错误
```

必须明确写出构造操作：

```cpp
Buffer a(10);          // 正确：直接初始化
Buffer b{10};          // 正确：直接列表初始化
process(Buffer(10));   // 正确
process(Buffer{10});   // 正确
```

标准示例同样指出：`explicit` 构造函数可以用于直接初始化，但**不能**用于类似 `对象 = 参数` 的隐式转换。

**为什么 `Buffer` 应该加 `explicit`?**

```cpp
explicit Buffer(std::size_t size);
```

这里的 `size` 只是表示缓冲区容量。一个普通整数和一个 `Buffer` 对象在语义上并不是同一种东西，因此不应该允许：

```cpp
Buffer buffer = 100;
```

加上 `explicit` 后，程序员必须明确表达：

```cpp
Buffer buffer(100);
```

这样可以避免一些意外转换，例如：

```cpp
void save(Buffer buffer);

save(1024);  // 没有 explicit 时，可能意外创建一个 1024 大小的 Buffer
```

**直接初始化和复制初始化**

**错误示例：**显式构造函数不能用于复制初始化或复制列表初始化：

```cpp
explicit Buffer(std::size_t size);

Buffer c = 10;   // 编译错误
Buffer d = {10}; // 编译错误
```

**修正版：**使用直接初始化或直接列表初始化：

```cpp
Buffer a(10);
Buffer b{10};
```

C++ 标准中的示例明确区分了这些初始化形式：显式构造函数可用于直接初始化，而隐式转换和复制列表初始化会受到限制。

因此，这一行可以读作：

```cpp
explicit Buffer(std::size_t size);
```

> 声明一个接收缓冲区大小的构造函数，但禁止把 `std::size_t` 自动转换成 `Buffer`。

对于**只接收一个主要参数**的构造函数，除非确实需要隐式转换，**通常都应该考虑加上 `explicit`。**

#### 12.2 复制构造函数

用同类型对象初始化新对象时，会调用复制构造函数：

```cpp
Vector<double> source;
Vector<double> first{source};
Vector<double> second = source;
```

这里是否写 `=` 不是问题的根源。真正的风险是：类直接拥有裸指针，而隐式复制构造函数只逐成员复制该指针地址。两个对象随后会认为自己拥有同一资源，最终重复释放。

典型运行结果如下：

```console
$ ./main
>>> + 1 2 3
6
free(): double free detected in tcache 2
Aborted (core dumped)
```

下面是拥有动态数组的深复制实现：

```cpp
Vector(const Vector& other)
    : data_(other.capacity_ == 0
                ? nullptr
                : new T[other.capacity_]),
      capacity_(other.capacity_),
      size_(other.size_)
{
    try {
        if (size_ != 0) {
            std::copy_n(other.data_, size_, data_);
        }
    }
    catch (...) {
        delete[] data_;
        throw;
    }
}
```

每个副本拥有独立数组。元素复制失败时，函数释放刚申请的存储并继续传播异常。

> [!NOTE]
>
> 构造函数抛出时，尚未构造完成的对象本身不会执行析构函数。因此直接管理泛型资源时，必须显式清理构造过程中取得的裸资源；更好的方式是用 RAII 成员或临时对象持有资源。

编译器是否隐式声明、默认化或删除复制构造函数，取决于类的其他特殊成员函数和各成员是否可复制。若复制语义不合理，应明确禁止：

```cpp
Vector(const Vector&) = delete;
```

#### 12.3 复制赋值运算符

复制赋值处理两个已经存在的对象：

```cpp
target = source;
```

错误示例是先释放当前资源，再申请和复制新资源：

```cpp
Vector& operator=(const Vector& other)
{
    delete[] data_;
    data_ = new T[other.capacity_]; // 可能抛出
    // 复制元素
    return *this;
}
```

它既不能正确处理 `value = value;`，也会在分配失败后让 `data_` 成为悬空指针，破坏类不变量。

可以先构造临时副本，再交换资源：

```cpp
Vector& operator=(const Vector& other)
{
    Vector temporary{other};
    swap(temporary);
    return *this;
}
```

若复制失败，当前对象保持不变；若成功，临时对象在函数结束时释放旧资源。赋值运算符返回 `*this` 的引用，以支持与内置赋值相同的链式语义：

```cpp
first = second = third;
```

也可以采用后文的按值 copy-and-swap 统一版本：

```cpp
Vector& operator=(Vector other)
{
    swap(other);
    return *this;
}
```

统一按值版本与单独的复制/移动赋值重载应二选一。

### 13、STL（标准模板库）

> [!NOTE]
>
> STL也是C++标准库的一部分，涉及到的STL函数单独放在此章节，并未合并到后面的一、16中

| 容器 | 存储与组织方式 |
|---|---|
| `std::vector` | 动态、连续存储 |
| `std::array` | 固定大小、连续且内嵌于对象 |
| `std::list` | 动态、基于非连续节点 |
| `std::map` | 有序键值关联容器 |
| `std::unordered_map` | 基于哈希的键值关联容器 |
| `std::set` | 有序键集合 |
| `std::unordered_set` | 基于哈希的键集合 |

### 14、类型别名声明（using别名）

```cpp
template<typename T>
using Vector = std::vector<T>;
```

C++ 中这种写法：

```text
using 新名字 = 原类型;
```

叫作 **类型别名声明**（type alias declaration），也常简称为 **using 别名**。

例如：

```cpp
using Integer = int;
using String = std::string;
using IntPtr = int*;
```

之后：

```cpp
Integer x = 10;   // 等价于 int x = 10;
IntPtr p = &x;    // 等价于 int* p = &x;
```

它和旧式的 `typedef` 基本等价：

```cpp
typedef int Integer;
using Integer = int;
```

通常推荐使用 `using`，因为阅读顺序更自然，而且它支持**别名模板**：

```cpp
template<typename T>
using Vector = std::vector<T>;

Vector<int> numbers;  // 等价于 std::vector<int>
```

### 15、using声明

```cpp
using std::swap;
```

是 **using 声明**，用于把一个已有名字引入当前作用域。

与类型别名声明对比：

```cpp
using Integer = int;  // 给 int 创建类型别名

using std::swap;      // 把 std::swap 引入当前作用域
```

可以把它简单理解为：

```text
using 名字空间::名称;
```

例如：

```cpp
using std::cout;
using std::string;

cout << "hello";

string text = "C++";
```

不过在泛型交换代码中，推荐保留这种惯用写法：

```cpp
using std::swap;
swap(a, b);
```

而不是一律写成：

```cpp
std::swap(a, b);
```

因为前一种写法既支持自定义 `swap`，又有标准库版本兜底。

### 16、常用标准库函数

#### 16.1 `<string>`

##### 16.1.1 `std::to_string()`

`std::to_string` 是 C++ 标准库提供的**数值转字符串函数**，它接收一个数值，返回对应的：

```cpp
std::string
```

例如：

```cpp
int a = 123;
std::string s = std::to_string(a);
```

此时：

```cpp
s == "123"
```

标准库为整数和浮点类型提供了多组 `std::to_string` 重载，包括 `int`、`long`、`long long`、`float`、`double` 和 `long double` 等。

### 17、异常处理机制

```cpp
if (op_str == "+") {
    objs.push_back(std::make_unique<Addition>());
}
else if (op_str == "-") {
    objs.push_back(std::make_unique<Subtraction>());
}
else {
    throw std::runtime_error{"Unknown operation."};
}
```

这里让容器持有 `std::unique_ptr<Object>`，异常发生时已经插入的对象仍会自动销毁。

`try`、`catch`、`throw` 用来处理程序运行期间出现的**异常情况**，例如：

- 文件打不开；
- 内存分配失败；
- 参数超出允许范围；
- 无法完成某项操作；
- 对象状态不满足函数要求。

三者的分工可以概括为：

```text
throw：报告异常
try：监视可能发生异常的代码
catch：捕获并处理异常
```

基本结构如下：

```cpp
try {
    // 可能抛出异常的代码
}
catch (异常类型1& e) {
    // 处理异常类型1
}
catch (异常类型2& e) {
    // 处理异常类型2
}
```

当执行 `throw` 时，程序会停止当前正常执行流程，并把控制权转移给最近且类型匹配的异常处理器 `catch`。

------

#### 17.1 `throw`：抛出异常

**① 基本写法**

```text
throw 异常对象;
```

例如：

```cpp
throw 100;
```

这里抛出的是一个 `int` 类型异常。

也可以抛出字符串：

```cpp
throw std::string{"发生错误"};
```

更常见、更规范的做法是抛出标准异常类：

```cpp
#include <stdexcept>

throw std::runtime_error{"发生运行时错误"};
```

`throw` 抛出的对象类型，会决定哪些 `catch` 能够捕获它。

------

② 一个除法示例

```cpp
#include <iostream>
#include <stdexcept>

double divide(double a, double b)
{
    if (b == 0.0) {
        throw std::invalid_argument{"除数不能为 0"};
    }

    return a / b;
}
```

当 `b == 0.0` 时：

```cpp
throw std::invalid_argument{"除数不能为 0"};
```

表示：

> 当前函数无法正常完成任务，向调用者报告一个参数错误。

一旦执行了 `throw`，后面的语句不会继续执行：

```cpp
if (b == 0.0) {
    throw std::invalid_argument{"除数不能为 0"};

    std::cout << "这行不会执行\n";
}
```

控制流程会开始寻找匹配的 `catch`。

#### 17.2 `try`：包住可能抛出异常的代码

调用 `divide()` 时，可以这样写：

```cpp
try {
    double result = divide(10.0, 0.0);
    std::cout << result << '\n';
}
```

`try` 自身不处理异常，它只是划定一个范围：

> 在这个代码块中发生的异常，可以交给后面的 `catch` 处理。

`try` 后面必须紧跟**至少一个** `catch`。

**错误示例：**

```cpp
try {
    // ...
}

// 编译错误：后面没有 catch
```

**修正版：**

```cpp
try {
    // ...
}
catch (...) {
    // ...
}
```

------

#### 17.3 `catch`：捕获异常

完整代码如下：

```cpp
#include <iostream>
#include <stdexcept>

double divide(double a, double b)
{
    if (b == 0.0) {
        throw std::invalid_argument{"除数不能为 0"};
    }

    return a / b;
}

int main()
{
    try {
        double result = divide(10.0, 0.0);
        std::cout << result << '\n';
    }
    catch (const std::invalid_argument& e) {
        std::cout << "参数错误：" << e.what() << '\n';
    }
}
```

输出类似：

```text
参数错误：除数不能为 0
```

这里：

```cpp
catch (const std::invalid_argument& e)
```

表示：

> 捕获类型为 `std::invalid_argument` 的异常，并通过**引用 `e` 访问**异常对象。

标准异常类通常提供：

```cpp
e.what()
```

用于返回异常信息。`std::exception` 是标准库异常类型体系中的基础类之一，定义了虚函数 `what()`。

------

#### 17.4 异常发生时，程序如何查找 `catch`

假设代码为：

```cpp
#include <iostream>
#include <stdexcept>

void f()
{
    throw std::runtime_error{"出错了"};
}

void g()
{
    f();
}

int main()
{
    try {
        g();
    }
    catch (const std::runtime_error& error) {
        std::cout << error.what() << '\n';
    }
}
```

调用过程是：

```text
main()
  └─ g()
      └─ f()
          └─ throw
```

`f()` 中没有 `catch`，于是**异常向调用者传播**：

```text
f() 找不到 catch
    ↓
回到 g() 查找
    ↓
g() 也找不到
    ↓
回到 main()
    ↓
找到匹配的 catch
```

C++ 会寻找动态调用链上最近的匹配处理器；如果当前 `try` 后面的处理器都不匹配，就继续向外层寻找。

------

#### 17.5 可以写多个 `catch`

```cpp
try {
    // 可能抛出不同异常
}
catch (const std::invalid_argument& e) {
    std::cout << "参数错误：" << e.what() << '\n';
}
catch (const std::out_of_range& e) {
    std::cout << "越界错误：" << e.what() << '\n';
}
catch (const std::runtime_error& e) {
    std::cout << "运行时错误：" << e.what() << '\n';
}
```

程序会按照 `catch` 出现的顺序进行匹配，并进入第一个匹配的处理器。

因此，顺序很重要。

------

**派生类异常应放在基类异常前面**

标准异常类通常存在继承关系，例如：

```text
std::exception
    ↑
std::runtime_error
    ↑
某个更具体的异常类
```

错误顺序：

```cpp
try {
    // ...
}
catch (const std::exception& e) {
    // 范围太大，会先捕获很多派生类异常
}
catch (const std::runtime_error& e) {
    // 可能永远轮不到这里
}
```

推荐写法：

```cpp
try {
    // ...
}
catch (const std::runtime_error& e) {
    // 先处理具体类型
}
catch (const std::exception& e) {
    // 再处理一般类型
}
```

因为基类引用处理器可以匹配公有派生类异常，而处理器又是按照书写顺序尝试的。

------

#### 17.6 `catch (...)`：捕获所有异常

```cpp
try {
    // ...
}
catch (...) {
    std::cout << "捕获到了某种异常\n";
}
```

这里的：

```cpp
catch (...)
```

表示捕获任何类型的异常。

一般把它放在最后：

```cpp
try {
    // ...
}
catch (const std::invalid_argument& e) {
    // 处理已知异常
}
catch (const std::exception& e) {
    // 处理其他标准异常
}
catch (...) {
    // 处理无法识别的异常
}
```

因为它什么都能捕获，如果放在前面，后面的处理器就失去意义。

不过 `catch (...)` 不能直接取得异常对象，因此不能写：

```cpp
catch (...) {
    std::cout << e.what(); // 没有 e
}
```

------

#### 17.7 为什么通常使用 `const T&` 捕获

推荐：

```cpp
catch (const std::exception& e)
```

而不是：

```cpp
catch (std::exception e)
```

主要原因是：

**1. 避免复制异常对象**

引用直接绑定异常对象，不需要额外复制。

**2. 避免对象切片**

假设实际抛出的是派生类：

```cpp
throw std::runtime_error{"错误"};
```

如果按基类值捕获：

```cpp
catch (std::exception e)
```

派生类部分可能发生对象切片。

而引用捕获：

```cpp
catch (const std::exception& e)
```

可以保留对象的动态类型，使虚函数调用继续正常工作。

**3. `const` 防止处理器意外修改异常对象**

因此最常见的写法是：

```cpp
catch (const SomeException& e)
```

------

#### 17.8 栈展开：异常为什么能和 RAII 配合

执行 `throw` 后，程序不仅仅是“跳转到 `catch`”，还会执行一个重要过程：

> **栈展开（stack unwinding）**

在从抛出点向匹配处理器传播的过程中，已经构造完成的局部对象会按照作用域退出规则被销毁，其析构函数会执行。

例如：

```cpp
#include <iostream>
#include <stdexcept>

class Resource {
public:
    Resource()
    {
        std::cout << "获取资源\n";
    }

    ~Resource()
    {
        std::cout << "释放资源\n";
    }
};

void test()
{
    Resource resource;

    throw std::runtime_error{"出错了"};
}

int main()
{
    try {
        test();
    }
    catch (const std::exception& e) {
        std::cout << "捕获异常：" << e.what() << '\n';
    }
}
```

输出顺序大致是：

```text
获取资源
释放资源
捕获异常：出错了
```

过程如下：

```text
创建 resource
      ↓
执行 throw
      ↓
退出 test() 的作用域
      ↓
调用 resource 的析构函数
      ↓
进入 catch
```

这就是异常机制与 RAII 紧密结合的原因。

例如：

```cpp
std::vector<int> values;
std::string text;
std::unique_ptr<int> pointer;
```

这些对象在栈展开时会正常析构，所管理的资源也会相应释放。

------

#### 17.9 重新抛出异常：`throw;`

在 `catch` 中只写：

```cpp
throw;
```

表示：

> 重新抛出当前正在处理的异常，让外层继续处理。

例如：

```cpp
void process()
{
    try {
        throw std::runtime_error{"处理失败"};
    }
    catch (const std::exception& e) {
        std::cout << "process 记录日志："
                  << e.what() << '\n';

        throw;
    }
}
```

外层可以继续捕获：

```cpp
#include <iostream>
#include <stdexcept>

void process()
{
    throw std::runtime_error{"处理失败"};
}

int main()
{
    try {
        process();
    }
    catch (const std::exception& error) {
        std::cout << "main 最终处理："
                  << error.what() << '\n';
    }
}
```

单独的 `throw;` 会重新抛出当前异常，常用于“当前层只做部分处理，例如记录日志，然后交给上层”。

不要随意写成：

```cpp
catch (const std::exception& e) {
    throw e;
}
```

因为这会按表达式重新抛出一个对象；如果 `e` 是基类引用，可能引起对象切片。保留原异常应写：

```cpp
throw;
```

------

#### 17.10 自定义异常类型

可以继承标准异常类：

```cpp
#include <stdexcept>
#include <string>

class CalculationError : public std::runtime_error {
public:
    explicit CalculationError(const std::string& message)
        : std::runtime_error{message}
    {
    }
};
```

使用：

```cpp
double calculate(int value)
{
    if (value < 0) {
        throw CalculationError{"value 不能小于 0"};
    }

    return value * 2.0;
}
```

捕获：

```cpp
try {
    calculate(-1);
}
catch (const CalculationError& e) {
    std::cout << e.what() << '\n';
}
```

也可以使用基类捕获：

```cpp
catch (const std::runtime_error& e)
```

因为异常处理器可以通过公有基类引用匹配派生类异常。

------

#### 17.11 未捕获异常会怎样

如果抛出的异常最终没有找到任何匹配的处理器，程序会调用：

```cpp
std::terminate()
```

通常会导致程序异常终止。

例如：

```cpp
#include <stdexcept>

int main()
{
    throw std::runtime_error{"无人处理"};
}
```

没有任何 `catch`，程序不会正常返回。

------

#### 17.12 与 `noexcept` 的关系

如果函数声明为：

```cpp
void f() noexcept
{
    throw std::runtime_error{"错误"};
}
```

异常试图逃出 `noexcept` 函数时，会调用：

```cpp
std::terminate()
```

因此 `noexcept` 的含义不是：

> 函数内部语法上绝对不能出现 `throw`。

而是：

> 不允许异常从这个函数传播到调用者。

所以析构函数、移动构造函数、`swap` 等需要稳定参与清理或容器操作的函数，经常会设计为 `noexcept`。

------

#### 17.13 什么时候适合使用异常

异常适合表达：

> 函数无法完成它承诺的操作，而且当前层不知道如何恢复。

例如：

```cpp
std::ifstream file{"config.txt"};

if (!file) {
    throw std::runtime_error{"无法打开配置文件"};
}
```

不适合把异常当作普通分支或循环工具：

```cpp
// 不推荐
try {
    throw 1;
}
catch (int) {
    // 用异常代替普通 if
}
```

正常、频繁、可预期的情况通常优先使用：

- `if` 或 `switch`；
- 普通返回值或错误码；
- `std::optional`（C++17），表示“可能没有值”；
- `std::expected`（C++23），同时携带成功值或错误信息。

异常更适合处理跨越多层函数调用的失败传播。

------

#### 17.14 完整示例

```cpp
#include <iostream>
#include <stdexcept>

double divide(double a, double b)
{
    if (b == 0.0) {
        throw std::invalid_argument{"除数不能为 0"};
    }

    return a / b;
}

int main()
{
    try {
        double a;
        double b;

        std::cin >> a >> b;

        double result = divide(a, b);

        std::cout << "结果：" << result << '\n';
    }
    catch (const std::invalid_argument& e) {
        std::cout << "参数错误：" << e.what() << '\n';
    }
    catch (const std::exception& e) {
        std::cout << "标准异常：" << e.what() << '\n';
    }
    catch (...) {
        std::cout << "未知异常\n";
    }

    std::cout << "程序继续执行或正常结束\n";
}
```

执行关系是：

```text
try 中调用函数
       ↓
没有异常
       ├─→ 正常执行完 try，跳过所有 catch
       │
       └─→ 发生 throw
               ↓
          进行栈展开
               ↓
          按顺序寻找匹配的 catch
               ↓
          执行对应的异常处理代码
               ↓
          继续执行整个 try-catch 结构之后的代码
```

#### 17.15 最后归纳

```cpp
throw std::runtime_error{"错误"};
```

表示：

> 创建并抛出一个异常，报告当前操作失败。

```cpp
try {
    risky_operation();
}
```

表示：

> 执行可能抛出异常的代码。

```cpp
catch (const std::exception& e) {
    std::cout << e.what();
}
```

表示：

> 捕获匹配的异常并进行处理。

最常见的规范形式是：

```cpp
try {
    // 可能失败的操作
}
catch (const SpecificException& e) {
    // 先处理具体异常
}
catch (const std::exception& e) {
    // 再处理一般标准异常
}
catch (...) {
    // 最后兜底
}
```


### 18、断言

断言（assertion）用于检查程序运行时某个**本应成立的条件**。如果条件成立，程序继续执行；如果条件不成立，说明程序内部状态与预期不一致，断言会报告失败并终止程序。

C++ 标准库提供了 `assert` 宏，定义在 `<cassert>` 中：

```cpp
#include <cassert>

int main()
{
    int value = 99;

    assert(value == 99);  // 条件为 true，程序继续执行
    return 0;
}
```

`assert` 的基本形式为：

```cpp
assert(expression);
```

当 `expression` 的结果为 `true` 时，没有可观察到的效果；当结果为 `false` 时，会输出断言失败相关的诊断信息，并调用 `std::abort()` 终止程序。

例如：

```cpp
#include <cassert>

int main()
{
    int value = 99;

    assert(value == 100);  // 断言失败，程序终止
}
```

> [!IMPORTANT]
>
> `assert` 主要用于检查程序员认为“逻辑上必须成立”的内部条件，例如算法不变量、函数执行后的状态等。它不适合用来处理用户输入错误、文件不存在、网络失败等正常的运行时错误；这些情况通常应使用普通的条件判断、错误码或异常处理。

#### 18.1 `NDEBUG` 与关闭断言

如果在包含 `<cassert>` 之前定义了宏 `NDEBUG`，标准 `assert` 会被禁用：

```cpp
#define NDEBUG
#include <cassert>

int main()
{
    int value = 99;
    assert(value == 100);  // NDEBUG 已定义，该断言不会进行运行时检查
}
```

因此，**不要在 `assert` 的表达式中编写程序必须依赖的副作用**。例如下面的代码是不安全的：

```cpp
assert(++count == 10);
```

如果断言被关闭，`++count` 也不会执行，程序行为就会发生变化。更合理的写法是先完成必要操作，再单独断言：

```cpp
++count;
assert(count == 10);
```

#### 18.2 编译期断言 `static_assert`

除了运行时的 `assert`，C++ 还提供语言级的 `static_assert`，用于在**编译期**检查常量表达式：

```cpp
static_assert(sizeof(int) >= 4, "int should be at least 4 bytes");
```

如果条件为 `false`，程序会直接编译失败。二者可以简单区分为：

| 断言 | 检查时机 | 典型用途 |
| --- | --- | --- |
| `assert(...)` | 运行时 | 检查运行过程中本应成立的内部状态 |
| `static_assert(...)` | 编译期 | 检查类型、模板参数和其他常量表达式 |

> [!NOTE]
>
> 有些教学框架或测试框架会自定义大写的 `ASSERT(...)`。它不是 C++ 标准库的 `assert`；具体参数形式和失败行为取决于该框架自己的定义，应查看对应头文件或框架文档。

参考：[`assert`](https://en.cppreference.com/w/cpp/error/assert)、[`static_assert`](https://en.cppreference.com/w/cpp/language/static_assert)。


### 19、`constexpr` 与常量表达式

`constexpr`（constant expression）是 C++11 引入的关键字，用来声明某个变量或函数**可以参与常量表达式求值**。它与“编译期计算”密切相关，但用于变量和用于函数时，含义并不完全相同。

#### 19.1 `constexpr` 变量

对于变量，`constexpr` 要求初始化器能够在编译期作为常量表达式求值，并且该变量本身也是常量：

```cpp
constexpr int size = 10;
constexpr double pi = 3.1415926;
```

因此它可以用于需要常量表达式的场景，例如：

```cpp
#include <array>

constexpr int size = 10;
std::array<int, size> data{};

static_assert(size == 10);
```

`constexpr` 变量必须初始化：

```cpp
constexpr int x = 10;  // 正确
// constexpr int y;    // 错误：constexpr 变量必须初始化
```

##### 19.1.1 `constexpr` 在声明中的书写位置

在变量声明中，`constexpr` 属于**声明说明符（declaration specifier）**，而 `Fibonacci` 这样的类型名属于类型说明符；它们共同组成声明中的说明符序列。因此在这种简单声明里，下面两种写法是等价的：

```cpp
constexpr Fibonacci FIB{{0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55}};
Fibonacci constexpr FIB{{0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55}};
```

也就是说：

```cpp
Fibonacci constexpr FIB;
```

并不是把 `constexpr` “修饰在 `Fibonacci` 后面”产生了不同语义；它仍然是在声明变量 `FIB` 为 `constexpr` 对象。

这和下面两种 `const` 写法类似：

```cpp
const int a = 10;
int const b = 10;
```

二者都表示顶层 `const` 的 `int` 对象。

> [!NOTE]
>
> 虽然 `Fibonacci constexpr FIB` 合法，但实际 C++ 代码中更常见、也更符合大多数代码风格的是把 `constexpr` 写在类型前：`constexpr Fibonacci FIB`。阅读代码时不要把关键字的位置机械地理解成“只修饰它左边或右边紧挨着的词”，而应结合整个声明语法判断。

##### 19.1.2 `const` 与 `constexpr` 的区别

`const` 的核心含义是**对象不能通过该名字被修改**；它本身并不要求初始化过程一定发生在编译期。`constexpr` 则进一步要求变量能够用常量表达式初始化。

```cpp
int runtime_value();

const int a = runtime_value();  // 可以：a 只读，但值可以在运行时得到
constexpr int b = 10;           // 可以：10 是常量表达式
// constexpr int c = runtime_value();  // 错误：普通函数调用不是常量表达式
```

因此可以粗略记忆为：

```text
const      → 重点是“不能修改”
constexpr  → 重点是“可以作为编译期常量使用”，并且变量本身也是 const
```

> [!NOTE]
>
> 这只是帮助理解的概括。某些满足额外条件的 `const` 整数变量也可以出现在常量表达式中，因此不能反过来说“只有 `constexpr` 才能参与编译期计算”。

#### 19.2 `constexpr` 函数

函数前的 `constexpr` 表示该函数**具备在满足条件时参与常量表达式求值的能力**：

```cpp
constexpr int square(int x)
{
    return x * x;
}
```

它既可以在编译期求值：

```cpp
constexpr int a = square(5);  // 必须得到编译期常量 25
static_assert(a == 25);
```

也可以像普通函数一样在运行期调用：

```cpp
#include <iostream>

int n;
std::cin >> n;
int b = square(n);  // n 的值运行时才知道，因此这里是运行期调用
```

所以：

> **`constexpr` 函数不等于“必须在编译期执行的函数”。**
>
> 它表示函数可以用于常量表达式；到底是否必须进行常量求值，还取决于调用所在的上下文。

例如：

```cpp
constexpr int add(int a, int b)
{
    return a + b;
}

constexpr int x = add(1, 2);  // 这里要求常量求值
int y = add(1, 2);            // 语言规则不要求必须在编译期求值
```

对于第二种情况，编译器仍然可能出于优化目的直接把结果折叠成 `3`，但那属于优化，并不是程序语义要求它必须进行常量求值。

#### 19.3 哪些地方会要求常量表达式

常见场景包括：

- `constexpr` 变量的初始化；
- `static_assert` 的条件；
- `case` 标签；
- 非类型模板参数；
- `std::array<T, N>` 等要求编译期常量的模板参数；
- 内置数组的数组界限等需要常量表达式的语境。

例如：

```cpp
constexpr int get_size()
{
    return 8;
}

constexpr int size = get_size();
int data[size]{};

static_assert(get_size() == 8);
```

#### 19.4 `constexpr` 递归与编译期资源限制

下面的 Fibonacci 函数本身可以声明为 `constexpr`：

```cpp
constexpr unsigned long long fibonacci(int i)
{
    switch (i) {
    case 0:
        return 0;
    case 1:
        return 1;
    default:
        return fibonacci(i - 1) + fibonacci(i - 2);
    }
}
```

对于较小的输入：

```cpp
constexpr auto fib20 = fibonacci(20);
static_assert(fib20 == 6765);
```

这里 `fib20` 是 `constexpr` 变量，因此 `fibonacci(20)` 必须成功完成常量求值。

但如果写成：

```cpp
constexpr auto n = 90;
constexpr auto answer = fibonacci(n);
```

朴素递归 Fibonacci 会产生大量重复调用，常量求值可能超过编译器允许的递归深度、操作次数或其他实现资源限制，从而导致编译失败。

如果改成：

```cpp
constexpr auto n = 90;
auto answer = fibonacci(n);
```

`answer` 不再要求必须是编译期常量，因此程序可以把这次调用留到运行期执行。不过算法本身仍然是指数级递归，所以**能编译并不代表能够很快算出结果**。

也就是说：

```text
constexpr 函数
    ↓
具备编译期求值能力
    ↓
是否必须编译期求值？
    ├─ 常量表达式上下文 → 必须
    └─ 普通运行时上下文 → 不要求
```

#### 19.5 与 `consteval`、`constinit` 的区别

C++20 还提供了两个名字相近但用途不同的关键字：

| 关键字 | 主要作用 |
| --- | --- |
| `constexpr` | 实体可以参与常量表达式求值；`constexpr` 函数也可以运行期调用 |
| `consteval` | 声明立即函数，对它的潜在求值调用必须产生编译期常量 |
| `constinit` | 要求具有静态或线程存储期的变量进行静态初始化，但变量本身不因此变成只读 |

例如：

```cpp
consteval int twice(int x)
{
    return x * 2;
}

constexpr int a = twice(10);  // 正确
```

其中 `consteval` 比 `constexpr` 更严格，不应把二者理解成同一个关键字的不同写法。

参考：[`constexpr`](https://en.cppreference.com/w/cpp/language/constexpr)、[Constant expressions](https://en.cppreference.com/w/cpp/language/constant_expression)、[`consteval`](https://en.cppreference.com/w/cpp/language/consteval)、[`constinit`](https://en.cppreference.com/w/cpp/language/constinit)。

## 二、C++特性

### 1、运算符重载

可以定义在类中：

```cpp
T& operator[](std::size_t index)
{
    return data_[index];
}

const T& operator[](std::size_t index) const
{
    return data_[index];
}
```

两个重载分别服务于可修改对象和只读对象；与标准容器的 `operator[]` 一样，这个简化接口不执行边界检查。

### 2、类模板

类模板让同一套类定义适用于多种类型：

```cpp
template<typename T>
class Vector {
public:
    void push_back(const T& element)
    {
        if (size_ == capacity_) {
            reallocate();
        }

        data_[size_] = element;
        ++size_;
    }

private:
    void reallocate();

    T* data_ = nullptr;
    std::size_t capacity_ = 0;
    std::size_t size_ = 0;
};
```

使用时在尖括号中提供模板实参：

```cpp
Vector<double> numbers;
```

类模板及其成员函数的定义通常必须在实例化点可见，因此最常见的做法是把声明和定义一起放在头文件中。也可以把定义放入 `.tpp` 或 `.ipp` 文件，再由头文件包含。

若只支持一组固定模板实参，也可以在 `.cpp` 中定义并显式实例化；不能简单理解为模板实现永远不能拆分。

> [!WARNING]
>
> 上面的代码只展示模板语法和容量检查，不是完整容器。直接拥有裸指针的类还必须正确处理析构、复制和移动，或显式禁止相应操作。

### 3、Rule of Three、Rule of Five 与 Rule of Zero

当类直接拥有动态内存、文件句柄或套接字等资源，并需要自定义析构、复制或移动语义时，应当整体考虑相关特殊成员函数。

#### 3.1 Rule of Three

在 C++11 之前，核心的三个操作是：

```cpp
class Buffer {
public:
    ~Buffer();                              // 析构
    Buffer(const Buffer& other);            // 复制构造
    Buffer& operator=(const Buffer& other); // 复制赋值
};
```

编译器生成的复制操作会逐成员复制。若成员是拥有资源的裸指针，两个对象可能指向同一地址，最终重复释放并产生未定义行为。

“整体考虑”不等于必须让类型可复制。对于文件句柄、套接字等独占资源，合理设计通常是禁止复制：

```cpp
class Resource {
public:
    Resource(const Resource&) = delete;
    Resource& operator=(const Resource&) = delete;

    Resource(Resource&&) noexcept = default;
    Resource& operator=(Resource&&) noexcept = default;

    ~Resource() = default;
};
```

#### 3.2 Rule of Five（C++11）

C++11 引入移动语义后，还需考虑移动构造和移动赋值：

```cpp
class Buffer {
public:
    ~Buffer();
    Buffer(const Buffer&);
    Buffer& operator=(const Buffer&);
    Buffer(Buffer&&) noexcept;
    Buffer& operator=(Buffer&&) noexcept;
};
```

用户声明析构、复制或移动操作会影响其他特殊成员函数能否由编译器隐式生成。必要时应明确使用 `= default` 或 `= delete`，不要依赖难以察觉的隐式规则。

#### 3.3 Rule of Zero

更优先的设计是使用标准 RAII 类型持有资源，让业务类不直接手写特殊成员函数：

```cpp
#include <string>
#include <vector>

class Record {
public:
    std::string name;
    std::vector<int> values;
};
```

`std::string` 和 `std::vector` 已经正确实现资源管理，`Record` 可以使用编译器生成的析构、复制和移动操作。

一句话概括：

> 直接管理资源时必须明确销毁、复制和移动语义；能采用 Rule of Zero 时，优先让成熟的 RAII 类型替你完成这些工作。

### 4、左值和右值

可以先用一个实用判断理解：

- **左值（lvalue）**：通常有明确身份、可以在后续**继续访问**的对象。
- **右值（rvalue）**：通常是**临时值**，或者是一个资源**允许被转移**的对象。

```cpp
int a = 10;

a;              // 左值：a 是有名字的对象
10;             // 右值中的纯右值 prvalue
a + 1;          // 纯右值 prvalue
std::move(a);   // 右值中的将亡值 xvalue
```

严格来说，C++ 表达式的基本值类别是 `lvalue`、`xvalue` 和 `prvalue`；其中 `xvalue + prvalue` 统称为 `rvalue`。

```text
表达式
├── glvalue
│   ├── lvalue
│   └── xvalue ─┐
└── prvalue ────┴── rvalue
```

### 5、移动语义（C++11）

移动语义允许对象把资源所有权转移给另一个对象，避免不必要的深复制。

```cpp
Vector<double> target{std::move(source)};
```

#### 5.1 `std::move` 本身不移动数据

`std::move` 本质上进行一次类型转换，把表达式转换为 xvalue；随后由正常的重载决议决定调用移动操作还是复制操作。

只有当 `Vector` 存在可访问且匹配的移动构造函数时，资源才会真正转移。若移动操作不存在或不可用，也可能调用复制构造函数。

对 `const` 对象调用 `std::move` 通常仍会复制：

```cpp
const Vector<double> source;
Vector<double> target{std::move(source)};
```

这里的参数类型带有 `const`，而常见移动构造函数接收 `Vector&&`，不能绑定到 `const Vector&&`。

#### 5.2 一个移动构造函数

```cpp
Vector(Vector&& other) noexcept
    : data_{other.data_},
      size_{other.size_},
      capacity_{other.capacity_}
{
    other.data_ = nullptr;
    other.size_ = 0;
    other.capacity_ = 0;
}
```

该实现只转移指针、大小和容量，然后把源对象置于可析构的空状态。

#### 5.3 右值引用与表达式类别

- `T&` 是左值引用。
- 在非推导语境中，`T&&` 是右值引用。
- 在函数模板类型推导等特定语境中，`T&&` 可能是转发引用。
- 即使变量的声明类型是右值引用，只要它有名字，这个变量表达式仍是左值。

```cpp
void consume(Vector&& value)
{
    use(value);            // value 是左值表达式
    use(std::move(value)); // 显式转换为 xvalue
}
```

#### 5.4 移动后的对象

- 对标准库类型，除非具体类型另有更强保证，移动后的对象通常处于“有效但状态未指定”的状态。
- “有效”表示对象内部不变量仍成立，可以安全析构、重新赋值，并调用前置条件仍满足的操作。
- 不能仅凭“发生过移动”就假设对象一定为空。
- `std::unique_ptr` 有更强保证：移动后源指针为空。
- 自定义类型的移动后状态由实现和接口约定决定。

上面的 `Vector` 实现显式把源对象置空，因此可以依赖该实现的空状态；这不是所有类型的普遍规则。

### 6、自动类型推导关键字 `auto`（C++11）

`auto` 是占位类型说明符。编译器根据初始化表达式在编译期推导具体类型；它不是运行时动态类型。

```cpp
std::size_t capacity_ = 16;
double* data_ = nullptr;

const auto current_capacity = capacity_; // const std::size_t
auto* current_data = data_;              // double*
```

这里仅演示类型推导，没有申请新资源，因此不会引入泄漏或容量溢出问题。

变量的类型一旦推导完成就不会改变：

```cpp
auto value = 10; // int
value = 3.14;    // 转换为 int 后赋值，value 仍是 int
```

普通 `auto` 推导会忽略初始化表达式的顶层 `const` 和引用属性；需要保留引用语义时应显式写出 `&`：

```cpp
const int original = 10;

auto copy = original;            // int
const auto constant = original;  // const int
const auto& reference = original; // const int&
```

`auto` 能减少冗长类型的重复，但接口边界或类型转换意图需要清晰时，显式类型往往更容易审查。

### 7、Copy-and-swap 惯用法

Copy-and-swap 的思路是：先把新状态完整地准备在临时对象中，再与当前对象交换。若准备失败，当前对象不变。

#### 7.1 一个完整的 C++20 示例

```cpp
#include <algorithm>
#include <cstddef>
#include <utility>

class Buffer {
public:
    Buffer() = default;

    explicit Buffer(std::size_t size)
        : data_{size == 0 ? nullptr : new int[size]{}},
          size_{size}
    {
    }

    Buffer(const Buffer& other)
        : data_{other.size_ == 0 ? nullptr
                                : new int[other.size_]},
          size_{other.size_}
    {
        if (size_ != 0) {
            std::copy_n(other.data_, size_, data_);
        }
    }

    Buffer(Buffer&& other) noexcept
        : data_{other.data_}, size_{other.size_}
    {
        other.data_ = nullptr;
        other.size_ = 0;
    }

    Buffer& operator=(Buffer other)
    {
        swap(other);
        return *this;
    }

    ~Buffer()
    {
        delete[] data_;
    }

    void swap(Buffer& other) noexcept
    {
        using std::swap;
        swap(data_, other.data_);
        swap(size_, other.size_);
    }

    friend void swap(Buffer& left, Buffer& right) noexcept
    {
        left.swap(right);
    }

private:
    int* data_ = nullptr;
    std::size_t size_ = 0;
};
```

按值参数 `other` 会根据实参通过复制构造或移动构造产生临时对象。交换完成后，临时对象在函数结束时释放旧资源。

#### 7.2 自赋值与异常安全

`buffer = buffer;` 会先产生独立副本，再交换资源，因此自赋值安全。

若复制构造临时对象失败，函数体尚未开始，当前对象保持不变。交换操作又被正确声明为 `noexcept`，所以该示例提供强异常保证。

> [!NOTE]
>
> 构造函数抛出时，尚未构造完成的对象本身不会执行析构函数；语言只会销毁已经构造完成的基类和成员子对象。泛型资源类应使用 RAII 临时对象持有正在准备的新资源，避免在元素复制抛出时泄漏。

#### 7.3 一个危险的传统实现

下面是错误示例：

```cpp
Buffer& operator=(const Buffer& other)
{
    delete[] data_;
    data_ = new int[other.size_]; // 可能抛出
    size_ = other.size_;
    return *this;
}
```

若 `new` 抛出 `std::bad_alloc`，`data_` 仍保存已经释放的旧地址，成为悬空指针；对象析构时可能再次释放该地址，产生未定义行为。自赋值也会先销毁自己的源数据。

最低限度应先准备新资源，再提交：

```cpp
int* new_data = other.size_ == 0
    ? nullptr
    : new int[other.size_];

if (other.size_ != 0) {
    std::copy_n(other.data_, other.size_, new_data);
}

delete[] data_;
data_ = new_data;
size_ = other.size_;
```

#### 7.4 两种赋值接口应二选一

方案一是分开声明复制赋值和移动赋值：

```cpp
Buffer& operator=(const Buffer& other);
Buffer& operator=(Buffer&& other) noexcept;
```

方案二是本节采用的统一按值版本：

```cpp
Buffer& operator=(Buffer other);
```

采用统一版本后，不要再同时声明上述两个重载，否则右值赋值可能产生重载歧义。

#### 7.5 `swap` 与 ADL

非成员 `swap` 调用公开的成员 `swap`，本身不必依赖私有访问。把它定义为类内友元的主要价值，是形成可由参数相关查找（ADL）发现的隐藏友元：

```cpp
using std::swap;
swap(left, right);
```

不能为了接口外观盲目添加 `noexcept`。若被标为 `noexcept` 的函数实际让异常传播，程序会调用 `std::terminate()`。

### 8、友元访问权限

**友元访问权限是什么？**

C++ 中，类的 `private` 和 `protected` 成员通常只能由类自身的成员函数访问。

例如：

```cpp
class Buffer {
private:
    int* data_;
    int size_;
};
```

**错误示例：**类外代码不能直接访问私有成员：

```cpp
Buffer b;

// 错误：data_ 是 private
b.data_ = nullptr;
```

**修正版：**类可以使用 `friend`，主动授予某个函数或某个类访问其私有成员的权限，这种权限就是**友元访问权限**。

------

#### 8.1 友元函数

例如：

```cpp
class Buffer {
private:
    int* data_;
    int size_;

    friend void print(const Buffer& b);
};
```

类外定义：

```cpp
void print(const Buffer& b)
{
    // 可以访问 Buffer 的 private 成员
    std::cout << b.size_;
}
```

虽然 `print` 不是 `Buffer` 的成员函数，但因为它被声明为友元，所以可以访问：

```cpp
b.data_
b.size_
```

------

#### 8.2 友元函数不是成员函数

这一点非常重要。

```cpp
friend void print(const Buffer& b);
```

并不会让 `print` 成为 `Buffer` 的成员函数。

因此调用方式是：

```cpp
print(b);
```

而不是：

```cpp
b.print();
```

友元函数没有隐含的 `this` 指针。访问某个对象的非静态成员时，必须使用显式对象表达式；最常见的做法是通过参数接收该对象：

```cpp
void print(const Buffer& b)
{
    std::cout << b.size_;
}
```

------

#### 8.3 友元类

除了友元函数，也可以把整个类声明为友元：

```cpp
class Buffer {
private:
    int size_;

    friend class BufferDebugger;
};
```

那么 `BufferDebugger` 的成员函数可以访问 `Buffer` 的私有成员：

```cpp
class BufferDebugger {
public:
    void inspect(const Buffer& b)
    {
        std::cout << b.size_;
    }
};
```

可以理解为：

```text
Buffer 将自己的内部访问权限
授予了 BufferDebugger
```

------

#### 8.4 友元关系是单向的

假设：

```cpp
class A {
    friend class B;
};
```

这表示：

```text
B 可以访问 A 的私有成员
```

但不表示：

```text
A 可以访问 B 的私有成员
```

也就是说，友元关系不自动互相成立。

如果希望双方互相访问，必须分别声明：

```cpp
class B;

class A {
    friend class B;
};

class B {
    friend class A;
};
```

------

#### 8.5 友元关系不能传递

假设：

```text
B 是 A 的友元
C 是 B 的友元
```

不能推出：

```text
C 是 A 的友元
```

例如：

```cpp
class A {
    friend class B;
};

class B {
    friend class C;
};
```

`C` 不能访问 `A` 的私有成员。

所以友元关系不是传递关系。

------

#### 8.6 友元关系不会被继承

假设：

```cpp
class A {
    friend class B;
};
```

然后：

```cpp
class C : public B {
};
```

即使 `C` 继承自 `B`，`C` 也不会自动成为 `A` 的友元。

换句话说：

```text
B 有访问权限
≠
B 的子类也有访问权限
```

------

#### 8.7 `friend` 应该放在 `public` 还是 `private`？

下面两种写法的含义相同：

```cpp
class Buffer {
public:
    friend void print(const Buffer&);
};
class Buffer {
private:
    friend void print(const Buffer&);
};
```

因为 `friend` 声明本身不受 `public`、`protected`、`private` 区域的影响。

它放在哪里都表示同一件事：

> 指定的函数或类拥有友元访问权限。

------

#### 8.8 友元会破坏封装吗？

严格来说，友元确实突破了普通的访问控制，因此不应该随意使用。

不过友元并不等于完全破坏封装，因为权限仍然由类本身主动授予：

```cpp
class Buffer {
    friend void swap(Buffer&, Buffer&);
};
```

不是外部函数强行访问，而是 `Buffer` 明确声明：

> 我允许这个特定函数访问我的内部状态。

因此友元适合用于：

- 与类紧密相关的非成员运算符；
- 高效的 `swap`；
- 序列化或调试辅助类；
- 两个高度协作的类；
- 需要对称参数形式的运算符。

例如二元运算符常写成非成员友元：

```cpp
class Complex {
public:
    constexpr Complex(double real, double imag) noexcept
        : real_{real}, imag_{imag}
    {
    }

    friend constexpr Complex operator+(
        const Complex& left,
        const Complex& right
    ) noexcept
    {
        return {
            left.real_ + right.real_,
            left.imag_ + right.imag_
        };
    }

private:
    double real_{};
    double imag_{};
};
```

### 9、继承与运行时类型检查

#### 9.1 公有继承和所有权

下面用一个抽象基类表示表达式中的对象：

```cpp
#include <iostream>
#include <memory>
#include <stdexcept>
#include <string>
#include <typeinfo>
#include <vector>

class Object {
public:
    virtual ~Object() = default;
    virtual std::string to_string() const = 0;
};

class Addition final : public Object {
public:
    std::string to_string() const override
    {
        return "+";
    }
};

class Subtraction final : public Object {
public:
    std::string to_string() const override
    {
        return "-";
    }
};

class Number final : public Object {
public:
    explicit Number(double value) noexcept
        : value_{value}
    {
    }

    std::string to_string() const override
    {
        return std::to_string(value_);
    }

private:
    double value_{};
};

using ObjectBox = std::unique_ptr<Object>;
```

`ObjectBox` 表示独占所有权。`Object` 的虚析构函数保证对象经基类接口销毁时会执行完整的派生类析构过程。

```cpp
std::vector<ObjectBox> objects;
objects.push_back(std::make_unique<Addition>());
objects.push_back(std::make_unique<Number>(3.14));

for (const auto& object : objects) {
    std::cout << object->to_string() << '\n';
}
```

#### 9.2 `dynamic_cast`

`dynamic_cast` 对多态对象进行运行时类型检查。假设：

```cpp
Addition addition;
Object* base = &addition;
```

`base` 的静态类型是 `Object*`，所指对象的动态类型是 `Addition`。

指针形式的向下转换应保存结果并判空：

```cpp
if (const auto* value =
        dynamic_cast<const Addition*>(base)) {
    use(value->to_string());
}
```

若动态类型不匹配，指针形式返回空指针：

```cpp
Subtraction subtraction;
base = &subtraction;

Addition* result = dynamic_cast<Addition*>(base);
// result == nullptr
```

不要直接解引用尚未检查的转换结果。下面是错误示例：

```cpp
const auto value = *dynamic_cast<Addition*>(base);
```

转换失败时会解引用空指针并产生未定义行为；转换成功时，`auto` 还会复制对象而不是建立引用。

引用形式失败时会抛出 `std::bad_cast`：

```cpp
try {
    Addition& value = dynamic_cast<Addition&>(*base);
    use(value.to_string());
}
catch (const std::bad_cast&) {
    // 动态类型不匹配
}
```

若只需虚函数提供的行为，通常无需向下转换；直接通过 `Object&` 或 `Object*` 调用虚函数能保持接口更稳定。

### 10、虚函数和纯虚函数

虚函数支持运行时动态分派。普通虚函数可以给出默认行为：

```cpp
class Object {
public:
    virtual ~Object() = default;

    virtual std::string to_string() const
    {
        return "Object";
    }
};
```

派生类可以重写，也可以继承该版本。

纯虚函数使用 `= 0` 声明接口要求：

```cpp
class Object {
public:
    virtual ~Object() = default;
    virtual std::string to_string() const = 0;
};
```

```cpp
class Number final : public Object {
public:
    std::string to_string() const override
    {
        return std::to_string(value_);
    }

private:
    double value_{};
};
```

`override` 是 C++11 引入的说明符，用于要求该函数确实重写某个基类虚函数。若参数类型、尾置 `const`、引用限定或异常说明不匹配，编译器会报错，而不会静默创建一个新的重载。

#### 10.1 `final` 说明符

`final` 是 C++11 引入的说明符。在**虚成员函数**的声明末尾使用时，表示该虚函数到当前类为止，后续派生类不能再重写它。

例如：

```cpp
struct A {
    virtual char virtual_name() const {
        return 'A';
    }
};

struct B : A {
    char virtual_name() const override {
        return 'B';
    }
};

struct C : B {
    char virtual_name() const final {
        return 'C';
    }
};

struct D : C {
    // char virtual_name() const {  // 编译错误：C 中已经 final
    //     return 'D';
    // }
};
```

这里：

```cpp
char virtual_name() const final
```

表示 `C::virtual_name()` 是这条虚函数重写链中的最终实现。`D` **仍然可以继承并调用**这个函数，只是不能再次重写它：

```cpp
D d;
d.virtual_name();  // 调用 C::virtual_name()，返回 'C'
```

因此，`final` 并不是“这个函数不能再使用”，而是“这个虚函数不能在更深的派生类中继续被 override”。

`final` 也可以和 `override` 同时使用：

```cpp
char virtual_name() const override final;
```

两者的侧重点不同：

- `override`：要求当前函数确实重写了基类虚函数；
- `final`：禁止后续派生类继续重写这个虚函数。

此外，`final` 还可以直接修饰类：

```cpp
struct C final : B {
};

// struct D : C {};  // 编译错误：C 不允许再被继承
```

可以简单区分为：

| 写法 | 含义 |
|---|---|
| `void f() final` | `f()` 后续不能再被重写 |
| `class C final` | `C` 后续不能再被继承 |

参考：[`final` 说明符](https://zh.cppreference.com/w/cpp/language/final)。

#### 10.2 静态类型、动态类型与成员函数调用

判断继承体系中的成员函数调用时，需要先区分**静态类型（static type）**和**动态类型（dynamic type）**：

- **静态类型**：表达式在编译期确定的类型。例如 `A& ref = b;` 中，表达式 `ref` 的静态类型是 `A`（更完整地说，变量 `ref` 的声明类型是 `A&`）。
- **动态类型**：引用或指针实际所指对象的最派生类型。若 `b` 是 `B` 对象，那么 `ref` 所引用对象的动态类型就是 `B`。

对于通过引用或指针进行的成员函数调用，可以先记住两条实用规则：

> **虚函数：看实际对象的动态类型。**
>
> **非虚成员函数：按照调用表达式的静态类型进行普通的名字查找和重载决议。**

例如：

```cpp
struct A {
    virtual char virtual_name() const {
        return 'A';
    }

    char direct_name() const {
        return 'A';
    }
};

struct B : A {
    char virtual_name() const override {
        return 'B';
    }

    char direct_name() const {
        return 'B';
    }
};

B b;
A& ref = b;
```

此时：

```text
ref 的静态类型：A
ref 所引用对象的动态类型：B
```

因此：

```cpp
ref.virtual_name();  // 'B'：虚函数，根据动态类型 B 选择 B::virtual_name()
ref.direct_name();   // 'A'：非虚函数，根据静态类型 A 选择 A::direct_name()
```

可以把这类题简化成下面的判断流程：

```text
调用成员函数
    ↓
这个函数是 virtual 吗？
    ├─ 是  → 看动态类型 → 选择最终重写函数（final overrider）
    └─ 否  → 看静态类型 → 普通名字查找 / 重载决议
```

例如：

```cpp
B b;
A& ref = b;
```

虽然 `ref` 的静态类型是 `A`，但它引用的实际对象是 `B`，所以虚函数可以表现出运行时多态；而同名的非虚函数不会因为实际对象是 `B` 就自动调用 `B` 的版本。

> [!NOTE]
>
> “虚函数看动态类型”是针对正常的虚函数调用。若显式使用限定名，例如 `ref.A::virtual_name()`，会抑制虚分派并明确调用 `A::virtual_name()`。

参考：[`virtual` 函数](https://zh.cppreference.com/w/cpp/language/virtual)。

| 特征 | 普通虚函数 | 纯虚函数 |
|---|---|---|
| 典型写法 | `virtual void f() {}` | `virtual void f() = 0;` |
| 动态分派 | 支持 | 支持 |
| 基类默认行为 | 可以提供 | 可以在类外定义，但仍保持纯虚 |
| 对抽象性的影响 | 本身不会使类抽象 | 若最终重写仍为纯虚，则类抽象 |

纯虚析构函数也必须在类外提供定义。只要对象可能经基类指针销毁，基类析构函数就必须是虚函数。

### 11、多态类和抽象类

- **多态类**：声明或继承了至少一个虚成员函数的类。
- **抽象类**：至少有一个最终重写函数仍为纯虚函数的类，不能直接实例化。

因此抽象类一定是多态类，但多态类不一定抽象。

**错误示例：**抽象类不能直接实例化：

```cpp
class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const = 0;
};

// Shape shape; // 编译错误
```

**修正版：**实例化已经实现纯虚函数的具体派生类：

```cpp
class Circle final : public Shape {
public:
    explicit Circle(double radius) : radius_{radius} {}

    double area() const override
    {
        return 3.141592653589793 * radius_ * radius_;
    }

private:
    double radius_{};
};

Circle circle{2.0};
```

纯虚函数也可以在类外提供定义；但只要它仍是某个类中的纯最终重写函数，该类仍然抽象。抽象类适合表达接口，并通过引用或智能指针使用具体派生对象。

### 12、显式类型转换：`static_cast` 与 `reinterpret_cast`

C 风格转换可能尝试多种不同性质的转换，意图不清晰。C++ 通常优先使用命名转换，使转换目的更容易审查。

`static_cast` 适用于标准明确允许的编译期转换，例如数值转换：

```cpp
double value = 3.9;
int integer = static_cast<int>(value); // 结果为 3
```

但 `static_cast` 不提供运行时类型检查。下面的向下转换即使能通过编译，也只有在 `base` 确实指向相应的 `Derived` 子对象时才成立：

```cpp
Derived* derived = static_cast<Derived*>(base);
```

不确定动态类型时，应对多态基类使用：

```cpp
if (auto* derived = dynamic_cast<Derived*>(base)) {
    // 转换成功
}
```

`reinterpret_cast` 只允许标准列出的低层转换，例如某些指针类型之间，或指针与足够大的整数类型之间的转换。它并非“任意类型都能转换”，也不能移除 `const`。

即使转换能够编译，转换后若违反对象生命周期、对齐或类型访问规则，读取对象仍可能产生未定义行为。除底层系统接口等明确场景外，应避免使用 `reinterpret_cast`。


#### 12.1 枚举转换与类型双关

枚举之间如果只是希望转换**数值语义**，应优先使用 `static_cast`，而不是通过内存表示“猜”出另一个类型的值：

```cpp
ColorEnum convert(Color color)
{
    return static_cast<ColorEnum>(color);
}
```

`Color` 与 `ColorEnum` 是不同的枚举类型，但 `static_cast` 可以显式完成枚举到枚举的转换。

本题中这种 `union` 类型双关不要用于实际 C++ 代码：

```cpp
union TypePun {
    ColorEnum e;
    Color c;
};

TypePun pun;
pun.c = Color::Red;
return pun.e;  // 标准 C++：读取非活动 union 成员，通常是未定义行为
```

这类教学代码真正需要理解的是：

- `union` 成员共享存储；
- 写入某个成员后，它会成为活动成员；
- C 与 C++ 对 `union` 类型双关的规则不同；
- “内存里碰巧是这些字节”不等于“标准保证可以把它当成另一个类型读取”。

`reinterpret_cast` 也不是通用修复方案。它只允许标准规定的一组底层转换，并不会绕过对象生命周期、别名和类型访问规则。

如果目的是“枚举值 A → 枚举值 B”，优先使用：

```cpp
static_cast<TargetEnum>(source);
```

如果目的是按位复制同样大小的两个 trivially copyable 类型，C++20 可以考虑 `std::bit_cast`；但它要求源类型和目标类型大小相同。

参考：[`static_cast`](https://en.cppreference.com/w/cpp/language/static_cast)、[`union`](https://en.cppreference.com/w/cpp/language/union)、[`std::bit_cast`](https://en.cppreference.com/w/cpp/numeric/bit_cast)。

### 13、对象切片（object slicing）

把派生类对象按值复制或赋值给基类对象时，只保留基类子对象，派生类新增成员会被切掉。

#### 13.1 基本示例

```cpp
#include <iostream>
#include <memory>
#include <string>
#include <utility>
#include <vector>

class Animal {
public:
    explicit Animal(std::string name)
        : name_{std::move(name)}
    {
    }

    virtual ~Animal() = default;

    virtual void speak() const
    {
        std::cout << "Animal::speak\n";
    }

protected:
    std::string name_;
};

class Dog final : public Animal {
public:
    Dog(std::string name, int age)
        : Animal{std::move(name)}, age_{age}
    {
    }

    void speak() const override
    {
        std::cout << name_ << "（" << age_ << " 岁）：汪！\n";
    }

private:
    int age_{};
};

Dog dog{"旺财", 3};
Animal animal = dog; // 发生切片
animal.speak();       // Animal::speak
```

切片以后，`animal` 已经是独立的 `Animal` 对象。虚函数不能恢复已被丢弃的 `Dog` 部分。

#### 13.2 常见切片位置

按值形参会切片：

```cpp
void process(Animal animal);
process(dog);
```

按值容器也会切片：

```cpp
std::vector<Animal> animals;
animals.push_back(dog);
```

使用引用、指针或智能指针则保留完整动态类型：

```cpp
void process(const Animal& animal)
{
    animal.speak();
}

std::vector<std::unique_ptr<Animal>> animals;
animals.push_back(std::make_unique<Dog>("旺财", 3));
```

通过 `Base*`、`std::unique_ptr<Base>` 等基类接口销毁派生对象时，基类必须具有虚析构函数。存在其他虚函数不会自动让析构函数变成虚函数。

#### 13.3 抽象基类不能按值存储

**错误示例：**若 `Object` 含纯虚函数，下面不是“发生切片”，而是直接非法：

```cpp
// std::vector<Object> objects; // 错误：Object 是抽象类
```

**修正版：**多态容器保存智能指针：

```cpp
std::vector<std::unique_ptr<Object>> objects;
objects.push_back(std::make_unique<Addition>());
```

#### 13.4 异常对象也可能切片

捕获异常时应使用引用，并把派生类型写在基类之前：

```cpp
try {
    run();
}
catch (const FileError& error) {
    handle(error);
}
catch (const std::exception& error) {
    handle(error);
}
```

重新抛出当前异常应写 `throw;`。写 `throw error;` 会构造新的异常对象，若 `error` 的静态类型是基类，还可能切片。

#### 13.5 切片后的 `dynamic_cast`

```cpp
Animal sliced = dog;
Animal* base = &sliced;
Dog* result = dynamic_cast<Dog*>(base);
// result == nullptr
```

因为 `sliced` 的完整动态类型就是 `Animal`。相反，若基类指针实际指向原来的 `dog`，转换可以成功。

### 14、智能指针与所有权

智能指针是采用 RAII 管理动态对象生命周期的类模板，定义在 `<memory>` 中。

版本说明：

- `std::unique_ptr`、`std::shared_ptr`、`std::weak_ptr`、`std::make_shared` 和 `std::dynamic_pointer_cast`：C++11。
- `std::make_unique`：C++14。
- 以上接口均可在本笔记采用的 C++20 基线中使用。

| 类型 | 所有权语义 | 可复制 | 典型用途 |
|---|---|---|---|
| `std::unique_ptr<T>` | 独占所有权 | 否 | 默认的动态对象所有者 |
| `std::shared_ptr<T>` | 共享所有权 | 是 | 多方确实需要共同延长生命周期 |
| `std::weak_ptr<T>` | 不拥有，只观察 | 是 | 观察共享对象、打破循环引用 |

#### 14.1 `std::unique_ptr`

默认优先使用独占所有权：

```cpp
auto object = std::make_unique<Addition>();
```

`unique_ptr` 不能复制，但可以移动：

```cpp
auto first = std::make_unique<Addition>();
auto second = std::move(first);

// first == nullptr
```

移动后源 `unique_ptr` 为空，这是标准明确给出的保证。

多态容器通常也应优先使用独占所有权：

```cpp
std::vector<std::unique_ptr<Object>> objects;
objects.push_back(std::make_unique<Addition>());
```

若派生对象可能经 `std::unique_ptr<Base>` 销毁，`Base` 必须具有虚析构函数。

#### 14.2 `std::shared_ptr` 和控制块

确实需要共同所有权时，复制 `shared_ptr` 会让多个所有者共享同一控制块：

```cpp
auto first = std::make_shared<Addition>();
auto second = first;
```

典型控制块记录强引用计数、弱引用计数、删除器和分配器。最后一个共享所有者消失时，对象被销毁。

> [!WARNING]
>
> **错误示例：**不要用同一个裸指针分别构造多个 `shared_ptr`：
>
> ```cpp
> T* raw = new T;
>
> std::shared_ptr<T> first{raw};
> std::shared_ptr<T> second{raw}; // 错误：第二个控制块
> ```
>
> 两个控制块最终会对同一对象执行两次删除。也不要写 `std::shared_ptr<T>{first.get()}`。需要共享所有权时，应复制已有的 `shared_ptr`；创建新对象时优先使用 `std::make_shared<T>()`。

`use_count()` 适合诊断和观察，不应作为并发同步或核心业务逻辑的依据。

#### 14.3 `std::weak_ptr`

若两个对象互相持有 `shared_ptr`，强引用计数可能永远无法归零。把其中一个非拥有方向改为 `weak_ptr` 可以打破循环：

```cpp
class B;

class A {
public:
    std::shared_ptr<B> b;
};

class B {
public:
    std::weak_ptr<A> a;
};
```

`weak_ptr` 不增加强引用计数，也不能直接使用 `operator->`。需要访问对象时，只调用一次 `lock()` 并持有结果：

```cpp
if (auto shared = weak.lock()) {
    shared->foo();
}
```

`expired()` 只表示检查瞬间的状态。在并发环境中，先调用 `expired()`、再单独取得对象会产生竞态窗口，因此实际使用对象时应以 `lock()` 的返回值为准。

#### 14.4 观察指针与 `dynamic_pointer_cast`

```cpp
Object* raw = objects[0].get();
```

`raw` 是不拥有对象的观察指针，只有在对应智能指针仍保持对象存活时才能使用。

对 `shared_ptr` 进行多态向下转换时，可使用：

```cpp
std::vector<std::shared_ptr<Object>> shared_objects;
shared_objects.push_back(std::make_shared<Addition>());

auto addition =
    std::dynamic_pointer_cast<Addition>(shared_objects[0]);

if (addition) {
    // 转换成功
}
```

源元素类型必须是多态类型。转换失败返回空 `shared_ptr`；转换成功不会复制对象或创建第二个控制块，而是共享原有所有权。

#### 14.5 选择原则

1. 能直接使用值对象或标准容器时，不进行动态分配。
2. 需要动态对象且只有一个所有者时，使用 `unique_ptr`。
3. 只有在多个主体确实共同负责生命周期时，才使用 `shared_ptr`。
4. 只观察共享对象、又不应延长其生命周期时，使用 `weak_ptr`。
5. 裸指针和引用通常只表达非拥有访问，并必须有清晰的生命周期约束。

## 三、其它

### 1、代码格式化：clang-format

`.clang-format` 是 clang-format 工具的配置文件，用于规定缩进、换行和括号布局等代码风格；配置文件本身不会自动修改代码。

```bash
clang-format -i main.cpp
```

编辑器也可以在保存文件时调用 clang-format。

不要把 clang-format 与标准库格式化接口混淆：

- `std::format` 位于 `<format>`，是 C++20 标准库功能，用于格式化字符串。
- `std::print` 和 `std::println` 位于 `<print>`，是 **C++23** 功能。
- clang-format 是独立开发工具，不属于 C++ 语言标准。

### 2、Valgrind 与 Sanitizer

Valgrind 的 Memcheck 可以检测实际执行路径中的内存泄漏、越界访问、释放后使用和部分未初始化值问题。

建议保留调试信息并降低优化：

```bash
g++ -std=c++20 -g -Og -fno-omit-frame-pointer \
    main.cpp -o app
```

运行：

```bash
valgrind \
    --leak-check=full \
    --show-leak-kinds=all \
    --track-origins=yes \
    ./app
```

报告中的地址和调用栈会随平台、构建及运行变化；应重点关注泄漏分类和对应源码位置。例如：

```console
==76564== HEAP SUMMARY:
==76564==     in use at exit: 76,160 bytes in 6 blocks
==76564==   total heap usage: 10 allocs, 4 frees, 76,388 bytes allocated

==76564== LEAK SUMMARY:
==76564==    definitely lost: 256 bytes in 2 blocks
==76564==    indirectly lost: 0 bytes in 0 blocks
==76564==      possibly lost: 0 bytes in 0 blocks
==76564==    still reachable: 75,904 bytes in 4 blocks
```

注意：

- Valgrind 主要用于 Linux；Windows 通常需要在 WSL 或 Linux 环境运行，macOS 支持取决于具体系统和第三方版本。
- 没有报告错误不等于程序不存在错误；它只能检查本次实际执行到的路径。
- Valgrind 和编译器 Sanitizer 都不属于 C++ 标准。

GCC 或 Clang 也可以启用 AddressSanitizer 和 UndefinedBehaviorSanitizer：

```bash
g++ -std=c++20 -g -O1 \
    -fsanitize=address,undefined \
    -fno-omit-frame-pointer \
    main.cpp -o app

./app
```

### 3、打印式调试与 `std::source_location`

`__FILE__` 和 `__LINE__` 是预定义宏，分别展开为源码文件名和源码行号；`__func__` 表示当前函数名。

```cpp
std::cerr
    << __FILE__ << ':' << __LINE__
    << " [" << __func__ << "] value = "
    << value << '\n';
```

它们记录的是表达式所在的源码位置，并不提供完整调用栈。

C++20 可以使用 `std::source_location` 封装调用位置：

```cpp
#include <iostream>
#include <source_location>
#include <string_view>

void trace(
    std::string_view message,
    const std::source_location location =
        std::source_location::current())
{
    std::cerr
        << location.file_name() << ':'
        << location.line() << " ["
        << location.function_name() << "] "
        << message << '\n';
}

int main()
{
    trace("开始处理输入");
}
```

默认参数中的 `std::source_location::current()` 会记录调用点，而不是固定记录 `trace()` 函数体内部的位置。

打印式调试适合快速确认控制流和变量状态，但不能替代断点调试、Sanitizer、Valgrind、静态分析和自动化测试。多线程输出还可能交错，不能仅凭日志顺序推断线程间先后关系。
