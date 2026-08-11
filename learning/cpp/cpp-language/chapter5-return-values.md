#### 5.3 函数返回值是如何产生的

函数写成“按值返回”时，并不意味着运行时一定会先创建一个局部对象，再调用一次移动构造函数把它搬到调用者那里。对于类类型返回值，实际过程可能是：

- 直接构造最终的返回结果对象；
- 通过 NRVO 省略局部对象到返回结果对象之间的复制/移动；
- 如果不能或没有进行复制消除，再通过移动构造或复制构造产生返回结果。

因此，分析 `return` 时不能只问“是不是按值返回”，还要继续看：**`return` 后面的表达式是什么、它的值类别是什么、是否满足复制消除条件，以及未消除时重载决议会选择复制还是移动。**

标准从语义上把带操作数的 `return` 描述为：用 `return` 的操作数去初始化函数调用的返回结果。对于类类型，这个初始化过程可能涉及复制构造或移动构造，也可能被复制消除规则省略。

> [!IMPORTANT]
> **“按值返回”描述的是函数接口，不等于“必然调用移动构造”。**

##### 5.3.1 先区分：返回类型、返回表达式和返回结果对象

例如：

```cpp
std::string make_name()
{
    return std::string{"Kyle"};
}
```

这里有三个不同概念：

```text
std::string                 → 函数的返回类型
std::string{"Kyle"}          → return 的操作数（返回表达式）
调用 make_name() 得到的结果 → 返回结果对象
```

对于类类型，真正需要分析的是：**返回表达式如何初始化最终的返回结果对象。**

如果返回类型是 `int`、`double`、指针等非类类型，则本来就不存在“调用复制构造函数还是移动构造函数”的问题。例如：

```cpp
int add(int a, int b)
{
    return a + b;
}
```

`a + b` 产生一个 `int` 值，用它产生函数结果即可；`int` 没有复制构造函数和移动构造函数。

------

##### 5.3.2 `return T{};`：C++17 起直接构造返回结果

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

从 C++17 起，这种同类型 prvalue 不需要先物化成一个独立的临时 `A`，再复制或移动到返回结果对象中；它可以直接初始化最终的返回结果对象。

可以把旧式的直观模型：

```text
先构造临时 A
      ↓
复制 / 移动
      ↓
返回结果 A
```

改成：

```text
直接构造返回结果 A
```

所以在 C++17 及以后：

```cpp
A make_a()
{
    return A{};
}
```

这一返回过程本身不需要调用：

```cpp
A(const A&);  // 复制构造
A(A&&);       // 移动构造
```

这类情况常被口语化地称为“保证的复制消除（guaranteed copy elision）”；更准确地理解是：C++17 的 prvalue 语义允许对象直接在最终目标位置构造，不必先创建一个独立源对象再把它消除掉。

同理：

```cpp
std::unique_ptr<int> make_ptr()
{
    return std::make_unique<int>(42);
}
```

`std::make_unique<int>(42)` 返回的是 `std::unique_ptr<int>` 类型的 prvalue，与函数返回类型一致，因此 C++17 起可以直接形成 `make_ptr()` 的返回结果，不需要再额外调用一次 `unique_ptr` 的移动构造函数。

> [!NOTE]
> 这也是为什么不能简单地说“函数按值返回对象时都会移动一次”。`return T{};`、`return make_unique<T>();` 这类同类型 prvalue 返回，在 C++17 以后通常根本没有那一步移动。

------

##### 5.3.3 `return local;`：普通局部变量优先考虑 NRVO

例如：

```cpp
A make_a()
{
    A local;
    return local;
}
```

这里 `local` 是：

- 有名字的局部对象；
- 自动存储期；
- 非 `volatile`；
- 类型与函数返回类型匹配；
- 不是函数形参。

这种情况满足 **NRVO（Named Return Value Optimization，具名返回值优化）** 的典型条件。

如果编译器实施 NRVO，可以把 `local` 直接构造在最终返回结果的位置：

```text
表面代码：

A local;
return local;

可能的实际对象模型：

最终返回结果 A
      ↑
local 从一开始就在这里构造
```

于是不存在：

```text
local
  ↓ move/copy
返回结果
```

这一步额外的复制或移动。

需要注意：**NRVO 是允许进行的复制消除，但并不是所有情况下都由语言强制保证。** 因此代码不能依赖“移动构造函数一定不会执行”这种假设。

如果没有进行 NRVO，在本笔记采用的 C++20 语义下，满足隐式移动条件的局部对象在 `return local;` 中会优先尝试按右值语义进行重载决议，因此通常会选择移动构造函数：

```cpp
A(A&&);
```

可以把常见路径概括为：

```text
return local;
     ↓
能做 NRVO？
 ├─ 是 → 直接让 local 成为返回结果对象
 └─ 否 → 通常尝试移动构造
          ↓
        若移动不可用且复制可用，按相应语言规则可能使用复制
```

所以：

```cpp
return local;
```

通常已经是正确写法，不需要为了“让它移动”而手动加 `std::move`。

------

##### 5.3.4 `return std::move(local);`：通常反而会阻止 NRVO

考虑：

```cpp
A make_a()
{
    A local;
    return std::move(local);
}
```

`std::move(local)` 会把表达式转换成 xvalue（将亡值），因此移动构造函数通常可以参与重载决议。

但是 NRVO 的典型条件要求 `return` 的操作数直接是那个具名局部对象：

```cpp
return local;
```

而：

```cpp
return std::move(local);
```

操作数已经变成了一个 `std::move(...)` 表达式，不再是直接返回局部变量名字本身，所以通常不能进行 NRVO。

于是原本可能是：

```text
return local;
     ↓
NRVO
     ↓
0 次复制 + 0 次移动
```

手动加上 `std::move` 后可能变成：

```text
return std::move(local);
          ↓
       移动构造
          ↓
1 次移动
```

因此一般规则是：

> **返回一个与返回类型相同的普通局部变量时，优先写 `return local;`，不要习惯性写 `return std::move(local);`。**

`std::move` 并不是“性能优化开关”；它本质上只是改变表达式的值类别，让移动相关重载有机会被选择。

------

##### 5.3.5 `return ptr;`：按值形参不能做 NRVO，但可以隐式移动

这一点对于 `std::unique_ptr` 特别重要。

例如：

```cpp
using Unique = std::unique_ptr<Resource>;

Unique forward(Unique ptr)
{
    return ptr;
}
```

`ptr` 是**函数形参**。

NRVO 明确不适用于函数形参，所以这里不能把形参 `ptr` 和调用表达式的返回结果对象直接视为同一个对象。

但是 `ptr` 是自动存储期的非 `volatile` 对象，并且它直接出现在 `return ptr;` 中，属于可以进行**隐式移动（implicit move）**的典型返回场景。

因此在 C++20 中可以把它近似理解成：

```cpp
return std::move(ptr);
```

对于 `std::unique_ptr`：

```text
进入 forward：

ptr ─────────→ Resource

return ptr：

ptr      ────→ nullptr
返回结果 ────→ Resource
```

然后形参 `ptr` 自己的生命周期结束并执行 `unique_ptr` 析构函数，但此时它已经是空的，因此不会删除 `Resource`。

这也是下面代码能够编译的原因：

```cpp
Unique forward(Unique ptr)
{
    return ptr;
}
```

虽然 `std::unique_ptr` 的复制构造函数被删除，但返回形参时可以走隐式移动。

> [!NOTE]
> C++23 对“move-eligible expression”的语言规则进一步统一：满足条件的返回表达式会按 xvalue 处理。本笔记以 C++20 为基线，因此主要按 C++20 的“返回时隐式移动”规则理解即可。

------

##### 5.3.6 为什么 `drop()` 返回 `nullptr` 时参数里的资源会被释放

继续看：

```cpp
Unique drop(Unique ptr)
{
    if (ptr) ptr->record('d');
    return nullptr;
}
```

这里返回的是：

```cpp
nullptr
```

而不是：

```cpp
ptr
```

因此 `ptr` 所拥有的资源**没有被转移到返回结果中**。

过程可以画成：

```text
进入 drop：

ptr ─────────→ Resource

return nullptr：

返回结果 ────→ nullptr
ptr      ────→ Resource
```

随后 `ptr` 生命周期结束：

```text
~unique_ptr()
      ↓
发现 ptr 仍然持有 Resource
      ↓
调用删除器
      ↓
Resource 析构
```

这里要把两件事分开：

```text
return nullptr
```

决定的是：**返回结果是什么**。

而：

```text
函数形参 ptr 生命周期结束
```

决定的是：**ptr 对象自己需要析构**。

所以“函数返回了 `nullptr`”并不会阻止形参 `ptr` 的析构。

------

##### 5.3.7 `reset()`：返回一个新 prvalue，旧参数不会被转移出去

题目中的函数：

```cpp
Unique reset(Unique ptr)
{
    if (ptr) ptr->record('r');
    return std::make_unique<Resource>();
}
```

这里有两条彼此独立的所有权链：

```text
旧资源：由形参 ptr 持有
新资源：由 std::make_unique<Resource>() 创建
```

执行：

```cpp
return std::make_unique<Resource>();
```

时，返回的是**新的 `unique_ptr`**，不是 `ptr`。

在 C++17 以后，这个同类型 prvalue 可以直接形成函数返回结果：

```text
ptr ─────────→ 旧 Resource

返回结果 ────→ 新 Resource
```

因此旧的 `ptr` 没有被移动出去。等 `ptr` 析构时，它仍持有旧资源，于是旧资源被释放。

所以这三个函数的返回行为可以直接对照：

| 函数 | `return` 操作数 | 形参 `ptr` 的资源是否转移到返回结果 | `ptr` 析构时是否还拥有旧资源 |
| --- | --- | --- | --- |
| `forward(ptr)` | `ptr` | 是，隐式移动 | 否 |
| `drop(ptr)` | `nullptr` | 否 | 是 |
| `reset(ptr)` | 新的 `make_unique` 结果 | 否 | 是 |

------

##### 5.3.8 返回 `const` 局部变量为什么可能阻止移动

例如：

```cpp
A make_a()
{
    const A local;
    return local;
}
```

典型的移动构造函数是：

```cpp
A(A&& other);
```

它需要绑定到：

```cpp
A&&
```

但一个 `const A` 即使被当作右值使用，其类型仍然带有 `const`，相应引用形态是：

```cpp
const A&&
```

`const A&&` 不能绑定到要求可修改源对象的普通 `A&&` 参数，因此常见的 `A(A&&)` 无法使用。

如果类同时有：

```cpp
A(const A&);
```

那么通常只能复制。

所以对于准备按值返回、并希望允许移动的普通局部对象，一般不要无意义地把它声明成 `const`：

```cpp
A local;       // 通常更适合返回
return local;
```

而不是：

```cpp
const A local;
return local;
```

当然，如果实施了 NRVO，复制/移动本身仍可能被省略；这里讨论的是**没有发生 NRVO 时构造函数重载如何选择**。

------

##### 5.3.9 全局变量、静态局部变量不会因为 `return name;` 自动移动

隐式移动规则主要针对满足条件的自动存储期对象。

例如：

```cpp
A global;

A get_global()
{
    return global;
}
```

`global` 不是自动存储期局部对象，因此普通的：

```cpp
return global;
```

不会因为它出现在 `return` 中就自动把全局对象“掏空”。它仍然是一个普通 lvalue，通常按复制语义初始化返回结果。

静态局部变量同理：

```cpp
A get_static()
{
    static A value;
    return value;
}
```

这里 `value` 具有静态存储期，也不属于普通的隐式移动返回场景。

如果显式写：

```cpp
return std::move(global);
```

那是在明确要求把全局对象当作将亡值使用，可能把全局对象留在 moved-from 状态；除非设计上非常确定需要这么做，否则通常不是合理接口。

------

##### 5.3.10 返回引用：根本不是“产生一个新的返回值对象”

例如：

```cpp
A& get(A& value)
{
    return value;
}
```

函数返回类型是：

```cpp
A&
```

因此调用结果只是引用原来的对象，并不会产生一个新的 `A` 对象，也就不存在复制构造或移动构造。

但绝不能返回对普通局部对象的引用：

```cpp
A& bad()
{
    A local;
    return local;  // 错误设计：函数结束后 local 生命周期结束
}
```

函数结束后 `local` 已被销毁，返回的引用会悬空。

因此需要区分：

```text
T  f()   → 按值返回，产生 T 类型的函数结果
T& f()   → 返回引用，调用结果引用某个已有对象
```

------

##### 5.3.11 常见返回写法对照表

| 写法 | 典型行为 |
| --- | --- |
| `return ptr;`，`ptr` 是按值形参 | 不能 NRVO；满足条件时进行**隐式移动** |
| `return local;`，`local` 是普通局部变量 | 优先可能进行 **NRVO**；若未消除，通常尝试移动 |
| `return std::move(local);` | 把表达式变成 xvalue，通常使用移动构造，但通常也会**阻止 NRVO** |
| `return T{};` | C++17 起同类型 prvalue **直接构造返回结果**，不需要复制/移动 |
| `return std::make_unique<T>();` | C++17 起同类型 prvalue 可直接形成返回结果，不需要额外移动 |
| `return const_local;` | 若未 NRVO，普通 `T(T&&)` 往往不能接收 `const T`，通常退回复制 |
| `return global;` / `return static_local;` | 不属于普通隐式移动返回场景，通常按 lvalue 复制 |
| `return 1;` | 返回标量值，不涉及类的复制/移动构造 |
| 返回类型是 `T&`，`return obj;` | 返回已有对象的引用，不产生新的 `T` 返回对象 |

可以把类类型按值返回的判断过程概括为：

```text
看到 return expression;
        ↓
返回的是引用类型吗？
 ├─ 是 → 返回已有对象的引用，不讨论复制/移动构造
 └─ 否
        ↓
expression 是与返回类型相同的 prvalue 吗？
 ├─ 是 → C++17 起直接构造最终返回结果
 └─ 否
        ↓
expression 是满足 NRVO 条件的具名普通局部变量吗？
 ├─ 是 → 编译器可以实施 NRVO
 │        └─ 若未实施，再考虑隐式移动 / 复制
 └─ 否
        ↓
expression 是满足隐式移动条件的自动存储期对象或形参吗？
 ├─ 是 → 返回时优先按移动语义处理
 └─ 否 → 按表达式原本的值类别进行初始化
```

> [!IMPORTANT]
> 对实际编程最有用的规则是：
>
> 1. 返回新对象时，直接写 `return T{...};` 或返回工厂函数产生的 prvalue；
> 2. 返回普通局部变量时，优先写 `return local;`，让编译器有机会做 NRVO；
> 3. 返回按值形参时，`return param;` 已能利用隐式移动，不要机械地加 `std::move`；
> 4. 不要把“按值返回”简单记成“必然移动一次”；
> 5. 分析 `unique_ptr` 时，要分别追踪“智能指针对象本身”和“它所拥有的资源对象”。

参考：[C++ 标准草案：return statement](https://eel.is/c++draft/stmt.return)、[C++ 标准草案：copy/move elision](https://eel.is/c++draft/class.copy.elision)、[C++ 标准草案：move-eligible expressions](https://eel.is/c++draft/expr.prim.id)、[cppreference：return statement](https://en.cppreference.com/w/cpp/language/return)、[cppreference：copy elision](https://en.cppreference.com/w/cpp/language/copy_elision)、[cppreference：value categories](https://en.cppreference.com/w/cpp/language/value_category)。