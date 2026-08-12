##### 14.2.1 `std::make_shared<T>(args...)`：参数用于构造被管理对象

`std::make_shared<T>(args...)` 会创建一个 `T` 类型对象，并使用括号中的实参来构造这个对象，然后返回一个拥有该对象的 `std::shared_ptr<T>`。

例如：

```cpp
auto shared = std::make_shared<int>(10);
```

这里模板参数：

```cpp
<int>
```

表示要创建并管理的对象类型是 `int`；括号中的：

```cpp
(10)
```

则是**传给这个 `int` 对象的初始化参数**，因此创建出的 `int` 的值为 `10`：

```cpp
*shared == 10;  // true
```

可以从对象构造语义上近似理解成：

```cpp
std::shared_ptr<int> shared(new int(10));
```

也就是：

```text
shared
  │
  │ std::shared_ptr<int>
  ▼
┌────┐
│ 10 │  ← 被管理的 int 对象
└────┘
```

> [!IMPORTANT]
> 这里的 `10` **不是引用计数**，而是被管理的 `int` 对象的初始值。刚由 `std::make_shared<int>(10)` 创建完成时，只有返回的这个 `shared_ptr` 拥有对象，因此其强引用计数为 `1`。

对于类类型，`make_shared` 后面的参数同样用于构造对象。例如：

```cpp
class Person {
public:
    Person(std::string name, int age) {
        // ...
    }
};

auto person = std::make_shared<Person>("Kyle", 22);
```

其中 `"Kyle"` 和 `22` 会用于构造 `Person`，概念上对应：

```cpp
Person("Kyle", 22)
```

因此可以把：

```cpp
std::make_shared<T>(args...)
```

理解为：

> **创建一个 `T` 对象，用 `args...` 构造它，并把这个对象交给新返回的 `shared_ptr<T>` 管理。**

上面的 `std::shared_ptr<int>(new int(10))` 只用于帮助理解对象构造语义，并不意味着两种写法的分配方式完全相同。`std::make_shared` 通常可以把控制块和被管理对象放在一次分配中，因此创建共享对象时通常应优先使用 `std::make_shared`。

参考：[cppreference：`std::make_shared`](https://en.cppreference.com/w/cpp/memory/shared_ptr/make_shared)、[cppreference：`std::shared_ptr`](https://en.cppreference.com/w/cpp/memory/shared_ptr)。

##### 14.2.2 `reset()`：放弃当前 `shared_ptr` 的共享所有权

`reset()` 是 `std::shared_ptr` 的成员函数。无参数形式：

```cpp
ptr.reset();
```

会让当前这个 `shared_ptr` **放弃它现在拥有的对象，并把自身变成空的 `shared_ptr`**。

例如：

```cpp
auto shared = std::make_shared<int>(10);
std::shared_ptr<int> ptrs[]{shared, shared, shared};
```

此时共有 4 个 `shared_ptr` 拥有同一个 `int(10)`：

```text
shared ──┐
ptrs[0] ─┤
ptrs[1] ─┼──→ int(10)
ptrs[2] ─┘
```

因此强引用计数为：

```cpp
shared.use_count() == 4;  // true
```

执行：

```cpp
ptrs[0].reset();
```

之后 `ptrs[0]` 变为空，它不再拥有原来的对象：

```text
shared ──┐
ptrs[1] ─┼──→ int(10)
ptrs[2] ─┘

ptrs[0] ──→ nullptr
```

因此强引用计数从 `4` 降为 `3`。

###### `reset()` 不一定会立即销毁被管理对象

调用某一个 `shared_ptr` 的 `reset()`，只表示**这个所有者退出共享所有权关系**。

只要还有其他 `shared_ptr` 继续拥有该对象，对象就不会被销毁：

```cpp
auto p1 = std::make_shared<int>(10);
auto p2 = p1;

p1.reset();
```

此时：

```text
p1 ──→ nullptr
p2 ──→ int(10)
```

因为 `p2` 仍然拥有对象，所以 `int(10)` 仍然存在。

只有当最后一个拥有该对象的 `shared_ptr` 也放弃所有权时，强引用计数才会降为 `0`，此时被管理对象才会被销毁：

```cpp
p2.reset();
```

可以概括成：

```text
某个 shared_ptr.reset()
        ↓
该 shared_ptr 变空
        ↓
强引用计数减 1
        ↓
引用计数是否变成 0？
   ├─ 否 → 对象继续存在
   └─ 是 → 销毁被管理对象
```

###### `reset()` 与赋值为 `nullptr`

对于 `shared_ptr`，下面两种写法在“让当前指针变空并放弃当前共享所有权”这一点上效果相同：

```cpp
ptr.reset();
```

和：

```cpp
ptr = nullptr;
```

因此练习中的：

```cpp
ptrs[0].reset();
ptrs[1] = nullptr;
```

都会使对应的 `shared_ptr` 不再拥有原对象，并使原对象的强引用计数减少 `1`。

###### 带参数的 `reset()`

`reset()` 还可以接收新的裸指针，例如：

```cpp
std::shared_ptr<int> ptr = std::make_shared<int>(10);
ptr.reset(new int(20));
```

它会先放弃当前管理关系，然后让 `ptr` 开始管理新的 `int(20)`。

不过创建新的共享对象时，通常仍应优先使用：

```cpp
ptr = std::make_shared<int>(20);
```

这样更符合现代 C++ 的资源管理习惯，也避免直接处理裸 `new`。

> [!IMPORTANT]
> `reset()` 的核心语义是：**当前这个 `shared_ptr` 放弃所有权并变为空；是否销毁被管理对象，取决于它是不是最后一个共享所有者。**

参考：[cppreference：`std::shared_ptr::reset`](https://en.cppreference.com/w/cpp/memory/shared_ptr/reset)、[cppreference：`std::shared_ptr`](https://en.cppreference.com/w/cpp/memory/shared_ptr)。

##### 14.2.3 `std::move(shared_ptr)`：转移共享所有权，不增加所有者数量

`std::shared_ptr` 可以复制，也可以移动。复制和移动都会让目标 `shared_ptr` 最终参与相应的所有权关系，但二者对**源 `shared_ptr`** 和**强引用计数**的影响不同。

例如：

```cpp
std::shared_ptr<int> a = std::make_shared<int>(10);
std::shared_ptr<int> b = a;
```

这里是复制。复制完成后 `a` 和 `b` 都拥有同一个对象，因此强引用计数从 `1` 增加到 `2`：

```text
a ──┐
    ├──→ int(10)
b ──┘

use_count = 2
```

而如果写：

```cpp
std::shared_ptr<int> a = std::make_shared<int>(10);
std::shared_ptr<int> b = std::move(a);
```

这里发生的是移动。移动完成后，原来由 `a` 持有的共享所有权状态被转移给 `b`，而 `a` 变为空：

```text
移动前：

a ─────→ int(10)

use_count = 1

移动后：

a ─────→ nullptr
b ─────→ int(10)

use_count = 1
```

因此，**移动不会因为这次转移本身再增加一个共享所有者**。可以把它理解为：原来是 `a` 占据一个“所有者名额”，移动以后这个名额交给了 `b`。

###### 移动赋值：`ptrs[2] = std::move(shared)`

在下面的代码中：

```cpp
ptrs[0] = shared;
ptrs[1] = shared;
ptrs[2] = std::move(shared);
```

假设执行前 `shared` 是原对象的唯一所有者，而 `ptrs[0]`、`ptrs[1]` 为空，`ptrs[2]` 正管理另一个对象。

第一句：

```cpp
ptrs[0] = shared;
```

是复制赋值，因此原对象的共享所有者变为两个：

```text
shared ──┐
ptrs[0] ─┴──→ 原对象

use_count = 2
```

第二句：

```cpp
ptrs[1] = shared;
```

再次复制：

```text
shared ──┐
ptrs[0] ─┼──→ 原对象
ptrs[1] ─┘

use_count = 3
```

最后：

```cpp
ptrs[2] = std::move(shared);
```

这里调用的是 `shared_ptr` 的**移动赋值**。`shared` 原来占有的那份共享所有权被转移给 `ptrs[2]`，所以最终：

```text
ptrs[0] ─┐
ptrs[1] ─┼──→ 原对象
ptrs[2] ─┘

shared ─────→ nullptr

use_count = 3
```

强引用计数仍然是 `3`，并不会变成 `4`。

如果 `ptrs[2]` 在移动赋值之前已经拥有另一个对象，那么赋值还会先让 `ptrs[2]` 放弃它原来的所有权。如果它恰好是那个旧对象的最后一个共享所有者，旧对象会在这个过程中被销毁。

###### `std::move` 没有把底层对象“搬走”

这里最容易产生的误解是把：

```cpp
ptrs[2] = std::move(shared);
```

理解成“把 `int(10)` 从一个内存位置搬到另一个位置”。实际并不是这样。

被管理对象仍然留在原来的位置：

```text
移动前：

shared ───────────────┐
                      ▼
                  ┌────────┐
                  │ int(10)│
                  └────────┘

移动后：

ptrs[2] ──────────────┐
                      ▼
                  ┌────────┐
                  │ int(10)│  ← 仍是原来的对象
                  └────────┘

shared ─→ nullptr
```

发生变化的是 `shared_ptr` 自身持有的**指针/控制块关联等所有权状态**，而不是被管理对象本身。

因此可以这样记忆：

| 操作 | 源 `shared_ptr` | 目标 `shared_ptr` | 对同一控制块的强引用计数 |
| --- | --- | --- | --- |
| `target = source;` | 仍拥有对象 | 获得一份共享所有权 | 通常 `+1` |
| `target = std::move(source);` | 变为空 | 接管源的那份所有权 | 不因这次转移而 `+1` |

这里说“通常 `+1`”是针对源和目标原本不是同一所有权状态的普通复制情形；赋值操作还需要考虑目标此前是否已经拥有其他对象。

> [!IMPORTANT]
> 对 `shared_ptr` 使用 `std::move` 时，**移动的是 `shared_ptr` 的所有权状态，不是底层对象。移动后源 `shared_ptr` 为空；这次所有权转移本身不会增加同一控制块的强引用计数。**

参考：[cppreference：`std::shared_ptr::operator=`](https://en.cppreference.com/w/cpp/memory/shared_ptr/operator%3D)、[cppreference：`std::shared_ptr`](https://en.cppreference.com/w/cpp/memory/shared_ptr)、[cppreference：`std::move`](https://en.cppreference.com/w/cpp/utility/move)。

##### 14.2.4 `std::ignore` 与 `std::move`：写了 `std::move` 不等于已经发生移动

`std::ignore` 是标准库提供的一个特殊对象，可以把它理解成一个**“接收后直接忽略”的占位对象**。它定义在 `<tuple>` 中，最常见的用途是配合 `std::tie()` 忽略不需要的结果。

例如：

```cpp
#include <tuple>

int i;
std::string s;

std::tie(i, std::ignore, s) = std::make_tuple(42, 3.14, "C++");
```

这里中间的 `3.14` 被交给 `std::ignore`，程序不会保存它。

从理解语义的角度，可以把 `std::ignore` 想象成一个赋值运算符可以接收各种类型、但收到后什么都不做的对象：

```cpp
std::ignore = value;  // value 被忽略
```

###### 为什么 `std::ignore = std::move(ptrs[0]);` 不会把 `ptrs[0]` 移空

考虑：

```cpp
std::ignore = std::move(ptrs[0]);
```

最容易误解成：

```text
对 ptrs[0] 调用了 std::move
        ↓
ptrs[0] 一定被移动走
        ↓
ptrs[0] 变成 nullptr
```

这个推理是错误的。

`std::move` **本身并不执行资源转移**。它的作用是把表达式转换为可以作为右值使用的形式，使后续操作有机会选择移动构造函数或移动赋值运算符。

因此：

```cpp
std::move(ptrs[0])
```

只表示“把 `ptrs[0]` 当作可移动的右值来使用”，真正是否发生移动，要看**接下来拿这个表达式做什么**。

在：

```cpp
std::shared_ptr<int> p2 = std::move(p1);
```

中，右边的结果用于构造另一个 `shared_ptr`，于是会调用 `shared_ptr` 的移动构造，所有权真的从 `p1` 转移到 `p2`：

```text
移动前：

p1 ──→ int(10)

移动后：

p1 ──→ nullptr
p2 ──→ int(10)
```

但在：

```cpp
std::ignore = std::move(ptrs[0]);
```

中，右侧表达式只是交给 `std::ignore` 的赋值操作，而 `std::ignore` 会直接忽略这个值，并不会用它去移动构造或移动赋值另一个 `shared_ptr`。

因此这里**没有调用 `std::shared_ptr` 的移动构造函数或移动赋值运算符**，`ptrs[0]` 仍然保持原来的所有权状态。

例如：

```cpp
auto p = std::make_shared<int>(10);

std::ignore = std::move(p);
```

执行后仍然有：

```cpp
p != nullptr;       // true
p.use_count() == 1; // true
```

可以把整个过程理解为：

```text
ptrs[0]
   │
   │ std::move
   ▼
得到一个右值表达式
   │
   ▼
交给 std::ignore
   │
   ▼
直接忽略，不构造新的 shared_ptr
   │
   ▼
ptrs[0] 保持不变
```

因此如果原来：

```text
ptrs[0] ─┐
ptrs[1] ─┼──→ int(10)
ptrs[2] ─┘

use_count = 3
```

执行：

```cpp
std::ignore = std::move(ptrs[0]);
```

之后仍然是：

```text
ptrs[0] ─┐
ptrs[1] ─┼──→ int(10)
ptrs[2] ─┘

use_count = 3
```

强引用计数不会因为这一句发生变化。

> [!IMPORTANT]
> **`std::move(x)` 不等于“移动了 `x`”。** `std::move` 只改变表达式的值类别；只有后续操作实际调用移动构造、移动赋值或其他会消耗该右值的操作时，资源或所有权才可能真正发生转移。

这也解释了下面两句为什么不同：

```cpp
std::shared_ptr<int> p2 = std::move(p1);  // 真正发生 shared_ptr 的移动构造
std::ignore = std::move(p1);              // 只是把右值表达式交给 ignore，p1 不会因此被移空
```

参考：[cppreference：`std::ignore`](https://en.cppreference.com/w/cpp/utility/tuple/ignore)、[cppreference：`std::move`](https://en.cppreference.com/w/cpp/utility/move)、[cppreference：`std::shared_ptr`](https://en.cppreference.com/w/cpp/memory/shared_ptr)。