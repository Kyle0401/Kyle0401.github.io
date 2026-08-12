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