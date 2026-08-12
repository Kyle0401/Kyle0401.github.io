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