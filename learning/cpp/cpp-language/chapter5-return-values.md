#### 5.3 函数返回值：先看类型，再看机制

看到：

```cpp
return expression;
```

时，不要立刻判断“这是复制”“这是移动”或者“这是 NRVO”。更稳妥的分析顺序是：

```text
① 返回类型是什么？
        ↓
标量类型 / 类类型 / 引用类型
        ↓
② 返回表达式是什么？
        ↓
③ 只有类类型才继续讨论
直接构造 / NRVO / 隐式移动 / 复制
```

> [!IMPORTANT]
> **“按值返回”只说明函数返回的是一个值，不等于“必然复制一次”或“必然移动一次”。**

------

##### 5.3.1 先区分返回类型

常见返回类型可以先分成三类：

| 返回类型 | 示例 | 是否讨论复制/移动构造 | 是否可能 NRVO |
| --- | --- | --- | --- |
| 标量类型 | `int`、`double`、枚举、`T*` | 否 | 否 |
| 类类型 | `std::string`、`std::vector<T>`、`std::unique_ptr<T>`、自定义类 | 是 | 满足条件时可能 |
| 引用类型 | `T&`、`const T&` | 不产生新的 `T` 返回对象 | 否 |

这里尤其要区分 **“变量”** 和 **“类对象”**。

```cpp
int n;                       // 变量；标量类型对象
Resource* p;                 // 变量；指针类型对象，也是标量类型对象
std::string s;               // 变量；同时也是类对象
std::unique_ptr<int> ptr;    // 变量；同时也是类对象
```

所以“局部变量”这个词范围很宽：`int`、裸指针、`std::string`、`unique_ptr` 都可以是局部变量。

> **NRVO 讨论的是满足条件的具名局部类对象，而不是所有局部变量。**

例如：

```cpp
A f()
{
    A a;
    return a;       // 类类型：可能 NRVO
}
```

而：

```cpp
A* f()
{
    A* p = ...;
    return p;       // 指针类型：不是 NRVO
}
```

虽然形式上都是 `return 某个变量;`，但返回类型不同，适用的机制完全不同。

------

##### 5.3.2 标量返回：返回的是值

`int`、`double`、枚举、裸指针等属于标量类型。

它们不是类类型，因此不存在“调用复制构造函数”“调用移动构造函数”或 NRVO 这些类对象相关机制。

###### 普通数值

```cpp
int f()
{
    int n = 10;
    return n;
}
```

可以直接理解成：

```text
读取 n 的值 10
    ↓
用 10 产生函数结果
```

函数结束后，局部变量 `n` 的生命周期结束，但函数结果中的数值 `10` 已经产生，不依赖 `n` 继续存在。

###### 裸指针：复制的是地址值

先看一个最容易混淆的例子：

```cpp
Resource* echo(Resource* ptr)
{
    return ptr;
}

Resource* p1 = new Resource;
Resource* p2 = echo(p1);
```

调用 `echo(p1)` 时，不能把所有名字都画成一个“原指针”。实际上有不同的指针变量：

```text
调用前：

p1 ─────────────→ Resource

进入 echo 后：

p1  ──┐
      ├─────────→ Resource
ptr ──┘

return ptr 产生返回值后：

p1       ──┐
ptr       ──┼──────→ Resource
返回结果   ──┘
```

这里 `ptr` 是 `echo` 的**按值形参**。它是函数自己的一个指针变量，保存了从实参 `p1` 得到的同一个地址值。

当函数调用结束后，`ptr` 的生命周期确实会结束：

```text
函数返回后：

ptr        ×      // 形参变量已经不存在

p1  ──┐
      ├─────────→ Resource
p2  ──┘
```

所以“函数返回后可能有多个裸指针保存同一个地址”指的是：

- 调用者原来就可能有 `p1`；
- 函数返回的地址值又可以初始化 `p2`；
- 函数内部的局部指针/形参 `ptr` 则已经结束生命周期。

并不是说**函数内部那个局部指针变量在函数返回后还活着**。

> [!IMPORTANT]
> 要始终区分：
>
> ```text
> 指针变量本身                指针指向的对象
> p1 / ptr / p2     ─────→    Resource
> ```
>
> 指针变量结束生命周期，只是存放地址的那个变量消失；裸指针不会因此自动销毁它指向的对象。

上例中的 `Resource` 是由：

```cpp
new Resource
```

创建的动态对象。它的生命周期不会因为 `echo` 的形参 `ptr` 消失而自动结束；最终需要由负责管理该资源的代码正确 `delete`，或者更推荐交给智能指针管理。

###### 返回局部指针变量 ≠ 返回局部对象地址一定安全

下面两种代码要分清：

```cpp
Resource* good()
{
    Resource* p = new Resource;
    return p;
}
```

这里局部变量 `p` 会消失，但 `new Resource` 创建的动态对象仍然存在，因此返回的地址仍可以指向有效对象（资源释放责任另当别论）。

而：

```cpp
Resource* bad()
{
    Resource r;
    return &r;
}
```

这里返回的是局部对象 `r` 的地址。函数结束时 `r` 自己也结束生命周期，所以返回指针会悬空。

因此判断裸指针返回是否安全，关键不是：

```text
“指针变量是不是局部变量？”
```

而是：

```text
“返回地址所指向的对象，在函数返回后还活着吗？”
```

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

`std::move` 本身只改变表达式的值类别。裸指针没有移动构造函数，所以结果仍可理解为复制地址值：

```text
p1 ──┐
     ├────────→ Resource
p2 ──┘
```

> `T* p; return p;` 是**返回指针值**，不是 NRVO，也不是调用所谓“裸指针的移动构造”。

------

##### 5.3.3 类类型返回：才需要讨论构造机制

如果函数按值返回类类型，例如：

```cpp
std::string f();
std::vector<int> g();
std::unique_ptr<Resource> h();
A make_a();
```

才需要进一步分析返回对象如何形成。

常见情况：

| 写法 | 典型机制 |
| --- | --- |
| `return T{...};` | C++17 起同类型 prvalue 直接构造返回结果 |
| `return local;`，`local` 是满足条件的具名局部类对象 | 可能 NRVO；未实施时再考虑隐式移动 |
| `return param;`，`param` 是类类型按值形参 | 不能 NRVO；满足条件时可用于移动构造返回结果 |
| `return std::move(local);` | 通常会调用移动构造，但会破坏 NRVO 条件 |
| `return global;` / `return static_obj;` | 不属于普通自动存储期对象的返回时隐式移动场景 |

------

##### 5.3.4 prvalue：直接构造返回结果

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

`A{}` 是一个与函数返回类型相同的 prvalue（纯右值）。

从 C++17 起，更合适的对象模型是：

```text
直接在最终返回结果的位置构造 A
```

而不是：

```text
先构造临时 A
    ↓
再复制 / 移动
    ↓
返回结果 A
```

因此这一返回过程本身不需要额外调用复制构造或移动构造。

同理：

```cpp
std::unique_ptr<int> make_ptr()
{
    return std::make_unique<int>(42);
}
```

`std::make_unique<int>(42)` 产生同类型 prvalue，C++17 起可以直接形成返回结果。

------

##### 5.3.5 NRVO：具名局部类对象

NRVO（Named Return Value Optimization，具名返回值优化）的典型形式：

```cpp
A make_a()
{
    A local;
    return local;
}
```

这里 `local` 是**具名局部类对象**。

NRVO 的典型条件包括：

- 函数按值返回类类型；
- `return` 表达式直接命名一个非 `volatile` 对象；
- 该对象具有自动存储期；
- 该对象不是函数形参。

实施 NRVO 时，可以理解为：

```text
最终返回结果 A
      ↑
local 从一开始就在这里构造
```

于是：

```text
local
  ↓ copy / move
返回结果
```

这一步可以完全不存在。

> NRVO 是标准允许的复制消除；函数形参明确不能作为 NRVO 的源对象。

所以通常应写：

```cpp
return local;
```

而不要为了“优化”机械地写：

```cpp
return std::move(local);
```

------

##### 5.3.6 隐式移动：先理解“按值形参”

这一节最容易因为“形参对象”这个词产生误解，所以先把概念拆开。

###### 什么是按值形参？

例如：

```cpp
void f(int n);
void g(Resource* ptr);
void h(std::unique_ptr<Resource> ptr);
```

这里的：

```text
n
ptr
ptr
```

都是**按值形参**。函数调用时，每个形参都会由对应的实参进行初始化。

因此：

```cpp
Resource* p = ...;
g(p);
```

可以近似理解为函数调用时建立了一个新的指针变量：

```cpp
Resource* ptr = p;
```

而：

```cpp
Unique p = ...;
h(std::move(p));
```

则会用移动构造初始化类类型形参 `ptr`。

###### “形参对象”是不是只指类对象？

不是。

C++ 中“对象（object）”的范围比“类对象”宽。指针类型属于对象类型，也属于标量类型。

所以：

```cpp
void g(Resource* ptr);
```

中的 `ptr` **确实是一个按值形参对象**，更具体地说是：

```text
按值形参
└── 指针类型对象
    └── 标量类型对象
```

而：

```cpp
void h(std::unique_ptr<Resource> ptr);
```

中的 `ptr` 则是：

```text
按值形参
└── 类类型对象
```

两者都叫“按值形参”，但后续返回机制不同：

| 形参 | 类型类别 | `return ptr;` 时应怎样理解 |
| --- | --- | --- |
| `Resource* ptr` | 标量类型 | 返回地址值；不讨论移动构造 |
| `int n` | 标量类型 | 返回数值；不讨论移动构造 |
| `std::unique_ptr<Resource> ptr` | 类类型 | 不能 NRVO；返回时可使用移动语义形成返回对象 |
| `std::string s` | 类类型 | 不能 NRVO；返回时可使用移动语义形成返回对象 |

因此本节说的“隐式移动”，重点是**类类型对象的构造效果**。

裸指针形参虽然也属于可被 `return name;` 使用的自动存储期变量，但它没有移动构造函数，所以分析裸指针时仍应回到 5.3.2：**返回的是地址值。**

###### 具名局部类对象：NRVO 未发生时

```cpp
A make_a()
{
    A local;
    return local;
}
```

分析顺序：

```text
return local;
     ↓
满足 NRVO 条件？
     ↓
编译器实施 NRVO？
 ├─ 是 → 直接成为返回结果
 └─ 否 → 再考虑移动构造
```

所以 `return local;` 不能简单记成“就是 NRVO”。

###### 类类型按值形参：不能 NRVO

```cpp
using Unique = std::unique_ptr<Resource>;

Unique forward(Unique ptr)
{
    return ptr;
}
```

`ptr` 是**类类型的按值形参对象**。

函数形参不满足 NRVO 条件，因此 `return ptr;` 不能做 NRVO。

但它可以作为返回时的移动源，使 `unique_ptr` 的移动构造参与返回对象的形成。学习所有权时可以近似理解成：

```cpp
return std::move(ptr);
```

效果：

```text
return 前：

ptr ─────────→ Resource

return 后：

ptr      ────→ nullptr
返回结果 ────→ Resource
```

随后形参 `ptr` 自己结束生命周期；因为它已经为空，所以不会删除 `Resource`。

------

##### 5.3.7 `std::move`、复制与 `const`

###### 不要机械写 `return std::move(local);`

```cpp
A make_a()
{
    A local;
    return std::move(local);
}
```

`std::move(local)` 把表达式转换成 xvalue，因此移动构造通常可以参与重载决议。

但：

```cpp
return local;
```

可能满足 NRVO；而：

```cpp
return std::move(local);
```

返回表达式已经不是单纯的对象名字 `local`，通常不满足 NRVO 条件。

因此返回同类型具名局部类对象时，通常优先写：

```cpp
return local;
```

###### `const` 可能阻碍移动

```cpp
A make_a()
{
    const A local;
    return local;
}
```

如果实施 NRVO，仍可消除相关复制/移动。

但未实施 NRVO 时，常见移动构造：

```cpp
A(A&&);
```

不能绑定到 `const A` 作为可修改移动源，因此常常只能退回复制构造：

```cpp
A(const A&);
```

###### 全局对象与静态局部对象

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

这些对象具有静态存储期，不属于普通自动存储期对象的返回时隐式移动场景。

------

##### 5.3.8 `unique_ptr`：所有权如何穿过函数

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

```cpp
Unique func(Unique ptr);
```

意味着函数要建立自己的类类型形参对象 `ptr`。

如果调用者有：

```cpp
Unique p = std::make_unique<Resource>();
```

直接写：

```cpp
func(p);              // 错误：需要复制 unique_ptr
```

因为 `unique_ptr` 禁止复制。

应显式转移所有权：

```cpp
func(std::move(p));
```

于是：

```text
调用前：

p ─────────→ Resource

形参初始化后：

p   ───────→ nullptr
ptr ───────→ Resource
```

如果传入的本来就是临时/prvalue `unique_ptr`，通常不需要再手动套一层 `std::move`。

###### `forward`：旧资源继续向外传

```cpp
Unique forward(Unique ptr)
{
    if (ptr) ptr->record('f');
    return ptr;
}
```

形参不能 NRVO，但返回时可以使用移动语义：

```text
ptr ─────────→ Resource
       return ptr
           ↓
ptr      → nullptr
返回结果 → Resource
```

所以资源继续存活。

###### `drop`：旧资源不进入返回结果

```cpp
Unique drop(Unique ptr)
{
    if (ptr) ptr->record('d');
    return nullptr;
}
```

返回的是空 `unique_ptr`，不是 `ptr`：

```text
返回结果 ────→ nullptr
ptr      ────→ Resource
```

旧资源没有被移动出去。当 `ptr` 最终析构时，它仍拥有 `Resource`，因此会删除资源。

###### `reset`：旧资源和新资源分成两条链

```cpp
Unique reset(Unique ptr)
{
    if (ptr) ptr->record('r');
    return std::make_unique<Resource>();
}
```

这里是：

```text
ptr ─────────→ 旧 Resource

返回结果 ────→ 新 Resource
```

旧资源没有进入返回结果；新的 `make_unique` 结果则形成函数返回结果。

三个函数可以总结为：

| 函数 | 返回表达式 | 旧资源是否进入返回结果 | `ptr` 最终析构时是否还拥有旧资源 |
| --- | --- | --- | --- |
| `forward` | `ptr` | 是 | 否 |
| `drop` | `nullptr` | 否 | 是 |
| `reset` | 新的 `make_unique` 结果 | 否 | 是 |

> 分析智能指针时始终区分：
>
> ```text
> unique_ptr 对象本身
>        ↓ 管理
> Resource 资源对象
> ```
>
> `unique_ptr` 对象结束生命周期并不等于资源一定被删除；只有它在析构时仍拥有资源，才会删除资源。

------

##### 5.3.9 参数对象的析构时机

前面为了理解所有权，可以先用“形参最终会结束生命周期”这个直观模型。

如果程序依赖**析构的精确先后顺序**，还要注意一个更细的规则：函数参数对象是在被调用函数退出时销毁，还是推迟到包含该函数调用的外围 full-expression（完整表达式）结束时销毁，是 implementation-defined（实现定义）的。

例如：

```cpp
forward(drop(reset(forward(forward(reset(nullptr))))));
```

这一整条表达式直到最后的：

```cpp
;
```

才结束外围 full-expression。

所以不能仅仅看到某个内层函数已经返回，就在所有实现上都断言其参数对象已经完成析构。

这对普通程序通常无所谓，但如果析构具有可观察副作用，例如：

```cpp
~Resource()
{
    RECORDS.push_back(_records);
}
```

就会影响记录顺序。

------

##### 5.3.10 一套判断流程

以后看到 `return expression;`，按下面顺序分析：

```text
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
                    未实施再移动  ④ 是否能作为移动源？
                                      │
                                 ┌────┴────┐
                                 是        否
                                 │          │
                              移动构造   按表达式原本
                                         语义初始化
```

最重要的结论：

1. **先看返回类型，再讨论返回机制。**
2. `int`、`double`、裸指针等标量类型不讨论复制/移动构造，也不适用 NRVO。
3. 裸指针变量结束生命周期，不会自动销毁它指向的对象；要分别追踪“指针变量”和“被指对象”。
4. `Resource* ptr` 这样的裸指针按值形参，确实也是**形参对象**，只是它属于标量类型对象。
5. `std::unique_ptr<Resource> ptr` 是类类型按值形参对象；这类对象的返回才需要讨论移动构造。
6. NRVO 针对满足条件的**具名局部类对象**，函数形参明确不能 NRVO。
7. `return T{...};` 这类同类型 prvalue 在 C++17 起可以直接构造最终返回结果。
8. 返回具名局部类对象时优先保留 NRVO 机会，不要机械地写 `return std::move(local);`。
9. `std::move` 本身不搬运资源；真正的移动效果由目标类型的移动语义决定。
10. 对 `unique_ptr` 要分别追踪智能指针对象和它拥有的资源对象。

参考：[C++ 标准草案：object model](https://eel.is/c++draft/intro.object)、[C++ 标准草案：types](https://eel.is/c++draft/basic.types)、[C++ 标准草案：function call](https://eel.is/c++draft/expr.call)、[C++ 标准草案：copy/move elision](https://eel.is/c++draft/class.copy.elision)、[C++ 标准草案：move-eligible expressions](https://eel.is/c++draft/expr.prim.id)、[C++ 标准草案：return statement](https://eel.is/c++draft/stmt.return)、[cppreference：copy elision](https://en.cppreference.com/w/cpp/language/copy_elision)、[cppreference：return statement](https://en.cppreference.com/w/cpp/language/return)。