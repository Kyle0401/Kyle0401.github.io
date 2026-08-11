#### 5.3 函数返回值：类型与生成机制

看到：

```cpp
return expression;
```

时，不应该立刻判断“这是复制”“这是移动”或者“这是 NRVO”。**这些机制并不是对所有返回类型都适用。**

分析函数返回值时，最清晰的顺序是：

```text
先看返回类型
    ↓
标量类型 / 类类型 / 引用类型
    ↓
如果是类类型，再分析返回表达式
    ↓
直接构造 / NRVO / 隐式移动 / 复制
```

> [!IMPORTANT]
> **“按值返回”只说明函数返回的是一个值，不等于“必然复制一次”或“必然移动一次”。**

标准从语义上规定，带操作数的 `return` 会用返回表达式初始化函数调用的返回结果。对于类类型，这个初始化过程可能涉及复制构造、移动构造，也可能被复制消除规则省略。

------

##### 5.3.1 先看返回类型

学习返回值时，首先把常见返回类型分成三类：

| 返回类型 | 示例 | 是否讨论复制/移动构造 | 是否可能 NRVO |
| --- | --- | --- | --- |
| 标量类型 | `int`、`double`、`T*` | 否 | 否 |
| 类类型 | `std::string`、`std::vector<T>`、`std::unique_ptr<T>`、用户自定义类 | 是 | 满足条件时可能 |
| 引用类型 | `T&`、`const T&` | 不产生新的 `T` 返回对象 | 否 |

这里尤其要区分 **“变量”** 和 **“类对象”**。

“局部变量”是一个很宽泛的概念：

```cpp
int n;                       // 局部变量，标量类型
Resource* p;                 // 局部变量，指针类型，也是标量类型
std::string s;               // 局部变量，同时也是局部类对象
std::unique_ptr<int> ptr;    // 局部变量，同时也是局部类对象
```

所以不能看到：

```cpp
return 某个局部变量;
```

就直接想到 NRVO。

> **NRVO 讨论的是满足条件的“具名局部类对象”，而不是所有局部变量。**

例如：

```cpp
A f()
{
    A a;
    return a;       // 可能 NRVO
}
```

与：

```cpp
A* f()
{
    A* p = ...;
    return p;       // 不是 NRVO
}
```

虽然形式上都是 `return 某个变量;`，但返回类型不同，适用的机制也完全不同。

------

##### 5.3.2 标量返回

`int`、`double`、枚举、裸指针等属于标量类型。

它们不是类类型，因此不存在：

```text
复制构造函数
移动构造函数
NRVO
```

这些类对象相关机制。

###### 返回普通数值

```cpp
int f()
{
    int n = 10;
    return n;
}
```

`n` 是局部变量，但它是 `int` 类型。

这里可以直接理解为：

```text
读取 n 的值 10
    ↓
用 10 产生函数结果
```

不需要讨论复制构造或移动构造，因为 `int` 根本没有构造函数。

###### 返回裸指针

```cpp
Resource* forward(Resource* ptr)
{
    return ptr;
}
```

`ptr` 是指针类型，也是标量类型。

假设：

```text
ptr 保存的地址值 = 0x1234
```

那么：

```cpp
return ptr;
```

可以理解成：

```text
ptr 中保存 0x1234
        ↓
用地址值 0x1234 产生函数结果
```

函数返回后，可能有多个裸指针保存同一个地址：

```text
原指针 ──┐
         ├──→ Resource
返回指针 ─┘
```

这里复制的是**指针值（地址值）**，并没有复制 `Resource` 对象，也没有发生资源所有权转移。

###### 裸指针与 `std::move`

即使写：

```cpp
Resource* p2 = std::move(p1);
```

也不会自动得到：

```text
p1 → nullptr
p2 → Resource
```

`std::move` 本身不会搬运任何资源，它只是改变表达式的值类别。

裸指针没有移动构造函数，所以初始化后通常仍然是：

```text
p1 ──┐
     ├──→ Resource
p2 ──┘
```

这和 `std::unique_ptr` 的移动行为不同。

> [!IMPORTANT]
> `T* p; return p;` 是**返回指针值**，不是 NRVO，也不是调用“裸指针的移动构造”。

------

##### 5.3.3 类类型总览

如果函数按值返回的是类类型，例如：

```cpp
std::string f();
std::vector<int> g();
std::unique_ptr<Resource> h();
A make_a();
```

才需要进一步分析返回对象是如何形成的。

常见情况可以先记成这张表：

| 写法 | 典型机制 |
| --- | --- |
| `return T{...};` | C++17 起同类型 prvalue 直接构造返回结果 |
| `return local;`，`local` 是满足条件的具名局部类对象 | 优先可能 NRVO；未实施时通常可以隐式移动 |
| `return param;`，`param` 是按值类类型形参 | 不能 NRVO，但满足条件时可以隐式移动 |
| `return std::move(local);` | 通常移动构造，但会破坏 NRVO 条件 |
| `return global;` / `return static_obj;` | 不属于普通隐式移动返回场景，通常按原本的 lvalue 语义处理 |

后面的几节分别解释这些情况。

------

##### 5.3.4 直接构造：prvalue

例如：

```cpp
struct A {
    A();
    A(const A&);
    A(A&&);
};

A make_a()
{
    return A{};
}
```

`A{}` 是一个与函数返回类型相同的 **prvalue（纯右值）**。

从 C++17 起，这种情况不需要先创建一个独立的临时 `A`，再把临时对象复制或移动到返回结果中。

旧式直觉容易想成：

```text
临时 A
  ↓
复制 / 移动
  ↓
返回结果 A
```

C++17 以后更合适的理解是：

```text
直接在最终返回结果的位置构造 A
```

所以：

```cpp
A make_a()
{
    return A{};
}
```

这一返回过程本身不需要额外调用：

```cpp
A(const A&);   // 复制构造
A(A&&);        // 移动构造
```

同理：

```cpp
std::unique_ptr<int> make_ptr()
{
    return std::make_unique<int>(42);
}
```

`std::make_unique<int>(42)` 产生同类型 prvalue，C++17 起可以直接形成函数的返回结果，不需要再额外移动一次 `unique_ptr`。

这类行为常被口语化称为 **guaranteed copy elision（保证的复制消除）**。从 C++17 的对象模型理解，更准确地说是：同类型 prvalue 可以直接初始化最终目标对象，不必先产生一个独立源对象再复制或移动。

------

##### 5.3.5 NRVO：具名局部类对象

NRVO（Named Return Value Optimization，具名返回值优化）的典型形式是：

```cpp
A make_a()
{
    A local;
    return local;
}
```

这里 `local` 不只是“局部变量”，而是一个**具名局部类对象**。

标准允许 NRVO 的典型条件包括：

- 函数按值返回类类型；
- `return` 表达式直接命名一个对象；
- 该对象是非 `volatile`；
- 该对象具有自动存储期；
- 该对象不是函数形参，也不是异常处理器的异常声明变量。

如果实施 NRVO：

```text
源代码：

A local;
return local;

对象模型可以理解成：

最终返回结果 A
      ↑
local 从一开始就在这个位置构造
```

因此：

```text
local
  ↓ copy / move
返回结果
```

这一步可以完全不存在。

> [!NOTE]
> NRVO 是标准允许的复制消除，并不像 C++17 同类型 prvalue 返回那样在相应条件下由语言语义保证。因此代码仍然应当保证没有 NRVO 时也能正确工作。

如果编译器没有实施 NRVO，`return local;` 还可能继续走下一节介绍的**隐式移动**。

所以一般应该写：

```cpp
return local;
```

而不是为了“优化”机械地写：

```cpp
return std::move(local);
```

------

##### 5.3.6 隐式移动

除了 NRVO，C++ 对某些自动存储期对象的 `return` 还提供了隐式移动机制。

最常见的两类是：

```text
普通局部类对象
函数按值形参对象
```

###### 普通局部类对象：NRVO 未发生时

```cpp
A make_a()
{
    A local;
    return local;
}
```

分析顺序应该是：

```text
return local;
     ↓
满足 NRVO 条件？
     ↓
编译器实施 NRVO？
 ├─ 是 → 直接成为返回结果
 └─ 否 → 再考虑隐式移动
```

如果没有 NRVO，并且移动构造可用，通常会使用：

```cpp
A(A&&);
```

因此不要把：

```cpp
return local;
```

简单记成“NRVO”。更准确的是：

> **它首先给编译器 NRVO 的机会；如果没有实施 NRVO，还可能隐式移动。**

###### 函数形参：不能 NRVO，但可以隐式移动

例如：

```cpp
using Unique = std::unique_ptr<Resource>;

Unique forward(Unique ptr)
{
    return ptr;
}
```

这里的 `ptr` 是**函数形参对象**。

函数形参明确不属于 NRVO 的允许对象，因此：

```cpp
return ptr;
```

不能做 NRVO。

但是 `ptr` 属于可进行返回时隐式移动的典型对象，所以对于 `std::unique_ptr` 可以把效果近似理解成：

```cpp
return std::move(ptr);
```

所有权变化为：

```text
return 前：

ptr ─────────→ Resource

return 后：

ptr      ────→ nullptr
返回结果 ────→ Resource
```

随后形参 `ptr` 自己会析构，但它已经为空，因此不会删除 `Resource`。

这就是：

```cpp
Unique forward(Unique ptr)
{
    return ptr;
}
```

能够工作的原因：`unique_ptr` 不可复制，但可以移动。

> [!NOTE]
> C++20 及更早版本通常用“返回时隐式移动”的规则解释这一过程；C++23 对 move-eligible expression 的规则进一步统一。学习所有权时，可以先抓住实际效果：**满足条件的局部类对象或形参在 `return name;` 时可以被当作移动源使用。**

------

##### 5.3.7 显式 `std::move` 与复制

###### `return std::move(local);`

例如：

```cpp
A make_a()
{
    A local;
    return std::move(local);
}
```

`std::move(local)` 把表达式转换成 xvalue，因此移动构造通常可以参与重载决议。

但它还有一个副作用：

```cpp
return local;
```

直接命名局部对象，可能满足 NRVO 条件；而：

```cpp
return std::move(local);
```

返回表达式已经不再只是对象名字 `local`，因此通常不满足 NRVO 条件。

结果可能从：

```text
return local;
     ↓
NRVO
     ↓
0 次复制 + 0 次移动
```

变成：

```text
return std::move(local);
          ↓
       移动构造
          ↓
1 次移动
```

所以通常：

> **返回与函数返回类型相同的具名局部类对象时，优先写 `return local;`，不要习惯性加 `std::move`。**

###### `const` 局部类对象

例如：

```cpp
A make_a()
{
    const A local;
    return local;
}
```

如果实施 NRVO，仍然可以省略相关复制/移动。

但如果没有 NRVO，常见移动构造函数：

```cpp
A(A&&);
```

不能直接接收 `const A` 作为可修改的移动源，因此通常会退回到：

```cpp
A(const A&);
```

也就是复制。

因此如果一个局部类对象准备按值返回并希望允许移动，一般不要无意义地给它加 `const`。

###### 全局对象和静态局部对象

```cpp
A global;

A get_global()
{
    return global;
}
```

以及：

```cpp
A get_static()
{
    static A value;
    return value;
}
```

这些对象具有静态存储期，不属于普通自动存储期的隐式移动返回场景，所以 `return name;` 不会仅仅因为处在 `return` 中就自动把它们“掏空”。

------

##### 5.3.8 `unique_ptr` 所有权实例

下面用练习中的三个函数把前面的返回机制串起来：

```cpp
using Unique = std::unique_ptr<Resource>;

Unique reset(Unique ptr)
{
    if (ptr) ptr->record('r');
    return std::make_unique<Resource>();
}

Unique drop(Unique ptr)
{
    if (ptr) ptr->record('d');
    return nullptr;
}

Unique forward(Unique ptr)
{
    if (ptr) ptr->record('f');
    return ptr;
}
```

###### 按值传入 `unique_ptr`

这里：

```cpp
Unique func(Unique ptr);
```

意味着函数需要构造自己的形参对象 `ptr`。

如果调用者有：

```cpp
Unique p = std::make_unique<Resource>();
```

直接写：

```cpp
func(p);              // 错误：需要复制 unique_ptr
```

因为 `unique_ptr` 禁止复制。

应当显式转移所有权：

```cpp
func(std::move(p));   // 可以移动
```

之后：

```text
调用前：

p ─────────→ Resource

形参初始化后：

p   ───────→ nullptr
ptr ───────→ Resource
```

如果传入的本来就是一个临时/prvalue `unique_ptr`，则不需要手动再套一层 `std::move`。

###### `forward`：把旧资源继续返回

```cpp
Unique forward(Unique ptr)
{
    if (ptr) ptr->record('f');
    return ptr;
}
```

这里返回的是形参 `ptr` 本身。

形参不能 NRVO，但可以隐式移动：

```text
ptr ─────────→ Resource
       return ptr
           ↓
ptr      → nullptr
返回结果 → Resource
```

所以资源继续存活。

###### `drop`：不返回旧资源

```cpp
Unique drop(Unique ptr)
{
    if (ptr) ptr->record('d');
    return nullptr;
}
```

这里返回的是一个空 `unique_ptr`，不是 `ptr`：

```text
返回结果 ────→ nullptr
ptr      ────→ Resource
```

因此旧资源没有被移动出去。

当 `ptr` 最终析构时，它仍拥有 `Resource`，于是 `unique_ptr` 会删除资源。

###### `reset`：返回一个新资源

```cpp
Unique reset(Unique ptr)
{
    if (ptr) ptr->record('r');
    return std::make_unique<Resource>();
}
```

这里同时存在两条所有权链：

```text
ptr ─────────→ 旧 Resource

返回结果 ────→ 新 Resource
```

`std::make_unique<Resource>()` 产生新的 `unique_ptr` prvalue；C++17 起它可以直接形成函数返回结果。

因此 `ptr` 中的旧资源没有被转移出去。当 `ptr` 最终析构时，旧资源也随之销毁。

三个函数可以总结成：

| 函数 | 返回表达式 | 旧资源是否进入返回结果 | `ptr` 最终析构时是否还拥有旧资源 |
| --- | --- | --- | --- |
| `forward` | `ptr` | 是，隐式移动 | 否 |
| `drop` | `nullptr` | 否 | 是 |
| `reset` | 新的 `make_unique` 结果 | 否 | 是 |

> [!IMPORTANT]
> 分析智能指针时始终区分两个对象：
>
> ```text
> unique_ptr 对象本身
>        ↓ 管理
> Resource 资源对象
> ```
>
> `unique_ptr` 对象析构并不等于 `Resource` 一定析构；只有该 `unique_ptr` 在析构时仍拥有资源，才会删除资源。

------

##### 5.3.9 参数析构时机

前面为了理解所有权，可以暂时把“函数结束后形参会析构”当作直观模型。

但如果程序依赖**析构的精确先后顺序**，还需要知道一个更细的规则：

> 函数参数对象是在被调用函数退出时销毁，还是推迟到包含该函数调用的外围 full-expression（完整表达式）结束时销毁，是 implementation-defined（实现定义）的。

例如：

```cpp
forward(drop(reset(forward(forward(reset(nullptr))))));
```

这一整条表达式直到最后的：

```cpp
;
```

才结束外围 full-expression。

因此不能仅仅看到某个内层函数已经返回，就在所有实现上都断言它的形参对象已经析构。

这会影响下面这种代码：

```cpp
~Resource()
{
    RECORDS.push_back(_records);
}
```

因为析构本身具有可观察副作用。

资源经历的操作可能确定为：

```text
Resource A → "ffr"
Resource B → "d"
```

但谁先析构、谁先写入 `RECORDS`，可能因实现选择不同而不同，例如可能出现：

```cpp
{"ffr", "d"}
```

也可能出现：

```cpp
{"d", "ffr"}
```

所以正常工程代码不应该让正确性依赖这种 implementation-defined 的参数析构时机。

------

##### 5.3.10 判断流程

以后看到一个 `return`，可以按下面顺序分析：

```text
看到 return expression;
        ↓
① 返回类型是什么？
        ↓
 ┌──────┼─────────────┐
 │      │             │
标量   引用          类类型
 │      │             │
 │      └→ 引用已有对象│
 │                    ↓
 └→ 返回标量值    ② expression 是同类型 prvalue？
                      │
                 ┌────┴────┐
                 是        否
                 │          │
         C++17 起直接构造    ↓
                        ③ 是满足 NRVO 条件的
                          具名局部类对象？
                              │
                         ┌────┴────┐
                         是        否
                         │          │
                    可以 NRVO       ↓
                    未实施则移动  ④ 是满足隐式移动条件
                                  的局部对象/形参？
                                      │
                                 ┌────┴────┐
                                 是        否
                                 │          │
                              隐式移动   按表达式原本
                                         的值类别初始化
```

最重要的几条结论是：

1. **先看返回类型，再讨论机制。**
2. `int`、`double`、裸指针等标量类型不讨论复制/移动构造，也不适用 NRVO。
3. NRVO 针对的是满足条件的**具名局部类对象**，不是所有“局部变量”。
4. `return T{...};` 这类同类型 prvalue 在 C++17 起可以直接构造最终返回结果。
5. `return local;` 对具名局部类对象应优先保留 NRVO 机会；未实施 NRVO 时还可能隐式移动。
6. 函数按值形参不能 NRVO，但满足条件时可以在返回时隐式移动。
7. `return std::move(local);` 通常会破坏 NRVO 条件，不应机械添加。
8. `std::move` 本身不移动资源；真正的移动效果由目标类型的移动语义决定。
9. 对 `unique_ptr` 要分别追踪智能指针对象与它所拥有的资源对象。

参考：[C++ 标准草案：return statement](https://eel.is/c++draft/stmt.return)、[C++ 标准草案：copy/move elision](https://eel.is/c++draft/class.copy.elision)、[C++ 标准草案：move-eligible expressions](https://eel.is/c++draft/expr.prim.id)、[C++ 标准草案：function call](https://eel.is/c++draft/expr.call)、[cppreference：copy elision](https://en.cppreference.com/w/cpp/language/copy_elision)、[cppreference：return statement](https://en.cppreference.com/w/cpp/language/return)。