[TOC]



# Leetcode Hot 100刷题记录

## 1.两数之和(No.1)

### 题目：

> 给定一个整数数组 `nums` 和一个整数目标值 `target`，请你在该数组中找出 **和为目标值** *`target`* 的那 **两个** 整数，并返回它们的数组下标。
>
> 你可以假设每种输入只会对应一个答案，并且你不能使用两次相同的元素。
>
> 你可以按任意顺序返回答案。
>
> **示例 1：**
>
> ```
> 输入：nums = [2,7,11,15], target = 9
> 输出：[0,1]
> 解释：因为 nums[0] + nums[1] == 9 ，返回 [0, 1] 。
> ```
>
> **示例 2：**
>
> ```
> 输入：nums = [3,2,4], target = 6
> 输出：[1,2]
> ```
>
> **示例 3：**
>
> ```
> 输入：nums = [3,3], target = 6
> 输出：[0,1]
> ```
>
>  
>
> **提示：**
>
> - `2 <= nums.length <= 104`
> - `-109 <= nums[i] <= 109`
> - `-109 <= target <= 109`
> - **只会存在一个有效答案**
>



### 解法一（暴力解，时间复杂度O(n^2))：

```c++
class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        int n = nums.size();
        for (int i = 0; i < n; ++i) {
            for (int j = i + 1; j < n; ++j) {
                if (nums[i] + nums[j] == target) {
                    return {i, j}; //可以直接用{}来返回vector
                }
            }
        }
        return {}; //编译器将 {} 解释为调用 vector 的默认构造函数，返回一个空的 vector<int>（即不包含任何元素的整数向量）
    }
};
```

**复杂度分析**

- 时间复杂度：*O*(*N*^2)，其中 *N* 是数组中的元素数量。最坏情况下数组中任意两个数都要被匹配一次。
- 空间复杂度：*O*(1)。

### 解法二（哈希表，时间复杂度*O*(*N*)）

```C++
class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        map<int, int> m;
        for(int i = 0; i < nums.size(); i++)
        {
            if(m.find(target - nums[i]) != m.end())
            {
                return {m[target - nums[i]], i};
            }
            else
                m[nums[i]] = i;
            
        }
        return {};
    }
};
```

**复杂度分析**

- 时间复杂度：O(N)，其中 N 是数组中的元素数量。对于每一个元素 x，我们可以 O(1) 地寻找 target - x。


- 空间复杂度：O(N)，其中 N 是数组中的元素数量。主要为哈希表的开销。

------

## 2.字母异位词分组(No.49)（字符串哈希）

### 题目：

> 给你一个字符串数组，请你将字母异位词（字母异位词是通过重新排列不同单词或短语的字母而形成的单词或短语，并使用所有原字母一次。）组合在一起。可以按任意顺序返回结果列表。
>
> **示例 1:**
>
> **输入:** strs = ["eat", "tea", "tan", "ate", "nat", "bat"]
>
> **输出:** [["bat"],["nat","tan"],["ate","eat","tea"]]
>
> **解释：**
>
> - 在 strs 中没有字符串可以通过重新排列来形成 `"bat"`。
> - 字符串 `"nat"` 和 `"tan"` 是字母异位词，因为它们可以重新排列以形成彼此。
> - 字符串 `"ate"` ，`"eat"` 和 `"tea"` 是字母异位词，因为它们可以重新排列以形成彼此。
>
> **示例 2:**
>
> **输入:** strs = [""]
>
> **输出:** [[""]]
>
> **示例 3:**
>
> **输入:** strs = ["a"]
>
> **输出:** [["a"]]
>
> 
>
> **提示：**
>
> - `1 <= strs.length <= 10^4`
> - `0 <= strs[i].length <= 100`
> - `strs[i]` 仅包含小写字母(也就是意味着不需要考虑[、]、""这些符号)
>



### 解法一：排序

```C++
class Solution {
public:
    vector<vector<string>> groupAnagrams(vector<string>& strs) {
        vector<vector<string>> result;
        map<string, vector<string> > m;
        for(int i = 0; i < strs.size(); i++)
        {
            string tmp = strs[i];
            sort(tmp.begin(), tmp.end());
            if(m.find(tmp) == m.end())
            {
                m[tmp].push_back(strs[i]);
            }
            else
            {
                m[tmp].push_back(strs[i]);
            }
            
        }

        for(auto it = m.begin(); it != m.end(); it++)
        {
            result.push_back(it->second);
        }

        return result;
    }
};
```

**复杂度分析**

- 时间复杂度：O(nklogk)，其中 n 是 strs 中的字符串的数量，k 是 strs 中的字符串的的最大长度。需要遍历 n 个字符串，对于每个字符串，需要 O(klogk) 的时间进行排序以及 O(1) 的时间更新哈希表，因此总时间复杂度是 O(nklogk)。


- 空间复杂度：O(nk)，其中 n 是 strs 中的字符串的数量，k 是 strs 中的字符串的的最大长度。需要用哈希表存储全部字符串。

### 解法二：计数

​	由于互为字母异位词的两个字符串包含的字母相同，因此两个字符串中的相同字母出现的次数一定是相同的，故可以将每个字母出现的次数使用字符串表示，作为哈希表的键。

​	由于字符串只包含小写字母，因此对于每个字符串，可以使用长度为 26 的数组记录每个字母出现的次数。需要注意的是，在使用数组作为哈希表的键时，不同语言的支持程度不同，因此不同语言的实现方式也不同。

```C++
class Solution {
public:
    vector<vector<string>> groupAnagrams(vector<string>& strs) {
        // 自定义对 array<int, 26> 类型的哈希函数
        auto arrayHash = [fn = hash<int>{}] (const array<int, 26>& arr) -> size_t {
            return accumulate(arr.begin(), arr.end(), 0u, [&](size_t acc, int num) {
                return (acc << 1) ^ fn(num);
            });
        };

        unordered_map<array<int, 26>, vector<string>, decltype(arrayHash)> mp(0, arrayHash);
        for (string& str: strs) {
            array<int, 26> counts{};
            int length = str.length();
            for (int i = 0; i < length; ++i) {
                counts[str[i] - 'a'] ++;
            }
            mp[counts].emplace_back(str);
        }
        vector<vector<string>> ans;
        for (auto it = mp.begin(); it != mp.end(); ++it) {
            ans.emplace_back(it->second);
        }
        return ans;
    }
};
```

#### 复杂度分析

- 时间复杂度：O(n(k+∣Σ∣))，其中 n 是 strs 中的字符串的数量，k 是 strs 中的字符串的的最大长度，Σ 是字符集，在本题中字符集为所有小写字母，∣Σ∣=26。需要遍历 n 个字符串，对于每个字符串，需要 O(k) 的时间计算每个字母出现的次数，O(∣Σ∣) 的时间生成哈希表的键，以及 O(1) 的时间更新哈希表，因此总时间复杂度是 O(n(k+∣Σ∣))。


- 空间复杂度：O(n(k+∣Σ∣))，其中 n 是 strs 中的字符串的数量，k 是 strs 中的字符串的最大长度，Σ 是字符集，在本题中字符集为所有小写字母，∣Σ∣=26。需要用哈希表存储全部字符串，而记录每个字符串中每个字母出现次数的数组需要的空间为 O(∣Σ∣)，在渐进意义下小于 O(n(k+∣Σ∣))，可以忽略不计。

#### 代码解读：

- **std::unordered_map 简介**

​	`std::unordered_map` 是 C++ 标准库提供的**哈希映射容器**，以 **键-值对**（key-value）形式存储数据。与有序的 `std::map` 不同，`unordered_map` **不保证元素的顺序**，而是通过哈希函数将键映射到表中的位置，实现 **平均 O(1)** 时间的快速查找和插入。它的模板定义如下：

```C++
template<
    class Key,        // 键类型
    class T,          // 值类型
    class Hash = std::hash<Key>,            // 哈希函数，对Key生成哈希值，默认使用std::hash<Key>
    class Pred = std::equal_to<Key>,        // 比较函数，判断键相等，默认使用std::equal_to<Key>
    class Alloc = std::allocator< ... >     // 内存分配器，默认略
> class unordered_map;
```

​	**键类型 (Key)** 和 **值类型 (T)** 分别指定存储的键和值的类型。例如 `unordered_map<int, string>` 的键是`int`，值是`string`。

​	**第三模板参数**是哈希函数仿函（functor）。它接受一个键并返回 `size_t` 类型(无符号整数类型（unsigned integral type）)的哈希值，用于决定元素在哈希表中的存储位置。默认使用 `std::hash<Key>`（标准库对常见类型提供的哈希函数）。

> [!NOTE]
>
> 在 C++ 中，**仿函数（Functor，function‑object）不是普通函数，而是一个对象**。它之所以叫“仿函数”，是因为它能像函数那样被调用——**使用圆括号 `()`**，就像调用函数一样。它之所以能这样，是因为它的**类型（类/结构体）**重载了 **函数调用运算符 `operator()`**。
>
> 换句话说：
>
> - 普通函数：`foo(1, 2)`
> - 仿函数对象：`obj(1, 2)` —— 内部其实执行的是 `obj.operator()(1,2)`
>
> **仿函数的本质是一个类的实例，只不过这个类实现了 `operator()`。**

​	**第四模板参数**是判断键相等的比较器，默认用 `std::equal_to<Key>` 调用 `==` 来判断两个键是否相同。这用于处理哈希冲突时区分不同键。

​	由于 `unordered_map` 需要对键进行哈希和比较 **（避免重复键）**，如果我们使用**自定义类型**作为键，标准库未提供默认哈希函数，就必须提供：1) 自定义的哈希函数；2) （可选）自定义比较函数或让该类型支持`==`比较。本题代码中键类型是 `array<int, 26>`（表示26个字母的计数数组），标准库没有对它定义 `std::hash`，因此我们需要提供**自定义哈希函数**。值得庆幸的是，`std::array` 已经支持按元素逐一比较是否相等（重载了`==`运算符），所以可以直接使用默认的 `std::equal_to` 来比较两个 `array<int,26>` 是否相等。接下来，让我们逐行解析代码。

- **代码逐行讲解**

​	下面这段代码实现了“字母异位词分组”（Group Anagrams）的功能：将给定字符串列表按字母组成分组，同组字符串是彼此的重新排列。代码充分运用了 `unordered_map` 的哈希表特性来高效完成分组：

1. **定义自定义哈希函数：** 首先，代码定义了一个 lambda 表达式 `arrayHash` 作为对 `array<int, 26>` 类型的哈希函数（仿函数）。

   > [!NOTE]
   >
   > ## 🎯 什么是 **lambda 表达式**
   >
   > 在 C++11 及以后版本中，**lambda 表达式**是一种**定义在某个位置的匿名函数**（没有名字的函数），可以像普通函数那样调用使用，但定义更紧凑、方便，**特别适合作为参数传给其它函数或算法**。它本质上产生一个“可调用对象”——也就是一个**仿函数对象（functor）**。
   >
   > 可以把它理解成：
   >
   > > “在需要的位置直接写的一个**小函数**” —— 不用单独写函数名和定义。
   >
   > ------
   >
   > ## 🌟 lambda 的基本语法结构
   >
   > 一个 lambda 的典型写法是：
   >
   > ```cpp
   > [capture](parameters) -> return_type {
   >     // 函数体
   > };
   > ```
   >
   > 各部分含义：
   >
   > | 部分                      | 意义                     |
   > | ------------------------- | ------------------------ |
   > | `[capture]` 捕获列表      | 指定能访问外部作用域变量 |
   > | `(parameters)` 参数列表   | 跟普通函数一样           |
   > | `-> return_type` 返回类型 | **可省略，编译器能推导** |
   > | `{ ... }`                 | 函数体                   |
   >
   > ------
   >
   > ### 📌 例子说明
   >
   > 下面是一个简单的 lambda：
   >
   > ```cpp
   > [](int a, int b) -> int {
   >     return a + b;
   > }
   > ```
   >
   > 这个lambda没有名字，可以像这样调用：
   >
   > ```cpp
   > int x = [](int a, int b){ return a + b; }(2, 3);
   > ```
   >
   > 等价于定义并调用一个小函数。
   >
   > ------
   >
   > ## 🔍 捕获（capture）是什么？
   >
   > `[]` 里面的内容就是 **捕获列表**。
   >  它告诉 lambda 能够访问外部变量，以及怎么访问它们：
   >
   > | 捕获写法 | 意义                                 |
   > | -------- | ------------------------------------ |
   > | `[]`     | **不捕获任何**外部变量               |
   > | `[x]`    | **按值捕获**外部变量 x（**拷贝**它） |
   > | `[&x]`   | 按**引用捕获** x（读写同一个变量）   |
   > | `[=]`    | 按值捕获**所有用到的**外部变量       |
   > | `[&]`    | 按**引用**捕获**所有用到**的外部变量 |
   >
   > 示例：
   >
   > ```cpp
   > int x = 10;
   > auto f = [x]() { return x + 5; }; // 捕获 x 的副本
   > x = 20;
   > cout << f(); // 输出 15
   > ```
   >
   > 即便外部 x 改变了，捕获的是原来的副本，不受影响。
   >
   > ------
   >
   > ## 🧠 lambda 在 C++ 是如何实现的？
   >
   > 尽管看起来像是一段代码，其实编译器会把它转换**成一个匿名类**，例如：
   >
   > ```cpp
   > [x](int y) -> int { return x + y; }
   > ```
   >
   > 等价于（概念上）：
   >
   > ```cpp
   > class __lambda {
   >     int __x;
   > public:
   >     __lambda(int x): __x(x) {}
   >     int operator()(int y) const { return __x + y; }
   > };
   > ```
   >
   > 所以它本质上就是一个能被 **调用的对象（可调用对象）**。
   >
   > ------
   >
   > ## 🧩 为什么要用 lambda？
   >
   > 相比自己写一个类实现 `operator()` 或定义一个普通函数，lambda 的优势是：
   >
   >  ✔ 代码更简洁
   >  ✔ 能直接访问函数作用域中的变量（捕获）
   >  ✔ 可以直接作为参数传给算法（如 `std::accumulate`, `std::sort` 等）
   >  ✔ 不需要写额外的命名函数或类
   >
   > 例如在你的代码里：
   >
   > ```cpp
   > auto arrayHash = [fn = hash<int>{}] (const array<int, 26>& arr) -> size_t {
   >     return accumulate(arr.begin(), arr.end(), 0u, [&](size_t acc, int num) {
   >         return (acc << 1) ^ fn(num);
   >     });
   > };
   > ```
   >
   > 这个表达式就是定义了一个**匿名哈希函数对象**，它：
   >
   > - 捕获了一个哈希器实例 `fn = hash<int>{}`（使用了 C++14 的初始化捕获方式）
   > - 作为一个函数对象，用来对数组 `arr` 计算哈希值
   > - 返回一个 `size_t`（非负整数类型，用于哈希结果）
   >
   > ------
   >
   > ## 📌 关键点总结
   >
   >  🔹 **Lambda 是匿名的函数对象**（本质上是一个类实例）
   >  🔹 它被定义后就能像普通函数一样调用
   >  🔹 捕获列表让它可以访问外围作用域变量
   >  🔹 是现代 C++ 推荐处理短小函数逻辑的写法
   >  🔹 常见于传递给算法或 STL 容器自定义行为

   代码：

   ```C++
   auto arrayHash = [fn = hash<int>{}] (const array<int, 26>& arr) -> size_t {
       return accumulate(arr.begin(), arr.end(), 0u, [&](size_t acc, int num) {
           return (acc << 1) ^ fn(num);
       });
   };
   ```

   解释：

   ​	这个 lambda 捕获了一个标准库提供的 `hash<int>` **函数对象**（用 `fn` 表示）用于**哈希单个整数**。对于传入的 `arr`（长度为26的int数组），它使用 `std::accumulate` 将数组元素依次合并计算出单一哈希值。初始累加值为0，每一步将累加值左移1位并按位异或(`^`)上当前元素的哈希值。这样每个元素对最终哈希都会有影响。**左移并 XOR 合并**是一种常见的方法来组合多个值的哈希，确保不同数组产生尽量不同的哈希结果。最终返回得到的 `size_t` 整数作为整个数组的哈希值。

   > ```cpp
   > fn = std::hash<int>{};
   > ```
   >
   > 通常表示：**把一个“默认构造出来的 `std::hash<int>` 函数对象（functor）”赋值给 `fn`**。`std::hash<int>` 是标准库提供的哈希函数对象类型（常用于 `unordered_map/unordered_set` 等）。
   >
   > ## 这个 `{}` 到底代表什么？
   >
   > `{}` 是 **空的大括号初始化**（brace initialization）。对像 `std::hash<int>` 这种“**类**类型”，空 `{}` 一般会触发 **值初始化/默认构造**，也就是构造出一个“**默认状态**”的 `std::hash<int>` **对象**。
   >
   > 它大致等价于下面这些写法（语义上）：
   >
   > ```cpp
   > std::hash<int> tmp{};   // tmp 是一个默认构造的哈希函数对象
   > fn = tmp;
   > ```
   >
   > 或者更常见的：
   >
   > ```cpp
   > auto fn = std::hash<int>{};
   > ```
   >
   > ## 为什么大家喜欢写成 `std::hash<int>{}`？
   >
   > 1. **明确是在“构造一个对象”**，不是声明函数（可避免经典的 *most vexing parse* 一类歧义）。
   > 2. **顺手创建临时函数对象并立刻使用**：
   >     你经常会看到这种模式：
   >
   > ```cpp
   > std::size_t h = std::hash<int>{}(x); // 先构造 std::hash<int> 临时对象，再用它的 operator()(x)
   > ```
   >
   > 这种写法在标准文档/示例中也很常见。

   ***为何需要这个自定义哈希？*** 

   ​	因为 `std::array<int,26>` **没有默认哈希**，必须提供自定义哈希函数才能将其用作 `unordered_map` 的键。上面的 lambda 就扮演了哈希函数对象的角色。需要注意，**lambda 本身**是**闭包对象**，**不是**默认可拷贝构造的简单函数对象类型，因此**必须**在创建 `unordered_map` 时将此lambda实例传递进去（否则编译器无法默认构造它）。

   > 这里说的**“闭包对象（closure object）”**，就是：**lambda 表达式在运行时生成的那个“匿名类的对象”**。
   >
   > ### 1) lambda 不是“函数”，而是“对象”
   >
   > 在 C++ 里，`[](...) { ... }` 这个 lambda 表达式并不是一个真正的函数本体；它会生成一种**独一无二、没有名字的类类型**，标准里叫 **closure type（闭包类型）**，而这个 lambda 表达式求值的**结果**，就是这个类型的一个对象——**closure object（闭包对象）**。
   >
   > 你可以把它理解成编译器偷偷帮你写了类似这样的东西（示意）：
   >
   > ```cpp
   > struct __Lambda {
   >   // 捕获的东西会变成成员变量
   >   std::hash<int> fn;
   > 
   >   size_t operator()(const std::array<int,26>& arr) const {
   >     ...
   >   }
   > };
   > ```
   >
   > 然后 `auto arrayHash = [fn = hash<int>{}](...) { ... };` 本质上就是在创建一个 `__Lambda` 对象（闭包对象），并把 `fn` 成员初始化好。捕获“按值捕获”的变量会作为闭包类型里的**数据成员**保存起来。
   >
   > ------
   >
   > ### 2) 为什么“捕获的 lambda”通常**不能默认构造**
   >
   > 你的 lambda 里有这段捕获：
   >
   > ```cpp
   > [fn = hash<int>{}]
   > ```
   >
   > 这叫“初始化捕获”，相当于闭包对象里有个成员 `fn`，它必须用 `hash<int>{}` 初始化。
   >
   > 因此 **编译器没法凭空给你 `fn` 一个合理的初值**，所以这种“带捕获”的闭包类型**没有默认构造函数**（至少在 C++20 之前：无捕获才有默认构造；有捕获就没有）。
   >
   > ------
   >
   > ### 3) 这和 `unordered_map` 有什么关系？为什么要“把 lambda 实例传进去”
   >
   > `unordered_map` 里面会保存一个 **Hash 函数对象**。如果你只在模板参数里写了 Hash 的类型，但**构造 `unordered_map` 时没传入一个 Hash 对象**，容器就会尝试**默认构造**一个 Hash 对象来用。
   >
   > 而 `std::hash<Key>` 这一类“哈希器/哈希函数对象”在标准要求里就强调了要满足 **DefaultConstructible** 等要求（能默认构造）。
   >
   > 但你的 Hash 是一个“带捕获的 lambda”的闭包类型，它（在很多标准/实现下）**不能默认构造**，所以你必须像下面这样把**现成的闭包对象**传给 `unordered_map`：
   >
   > ```cpp
   > unordered_map<..., decltype(arrayHash)> mp(0, arrayHash);
   > ```
   >
   > 这样 `unordered_map` 直接拷贝/保存你传进去的那个 `arrayHash`（闭包对象），就不需要默认构造它了。

   > [!NOTE]
   >
   > ## 这段 hash 在做什么
   >
   > ```cpp
   > auto arrayHash = [fn = hash<int>{}] (const array<int, 26>& arr) -> size_t {
   >  return accumulate(arr.begin(), arr.end(), 0u, [&](size_t acc, int num) {
   >      return (acc << 1) ^ fn(num);
   >  });
   > };
   > ```
   >
   > 目标：把 `arr`（26 个整数，表示 a~z 的出现次数）压缩成一个 `size_t` 哈希值，给 `unordered_map` 用。
   >
   > `unordered_map` 需要一个“哈希器”：给你一个 key（这里是 `array<int,26>`），你要返回一个整数（`size_t`），用来决定落在哪个桶里。`std::hash` 这类哈希器就是“可调用对象”，用 `operator()` 计算哈希值。
   >
   > ------
   >
   > ## 第 1 步：捕获 `fn = hash<int>{}` 是干嘛的？
   >
   > ```cpp
   > [fn = hash<int>{}]
   > ```
   >
   > 这叫 **初始化捕获**：在 lambda 里放一个成员变量 `fn`，类型是 `std::hash<int>`，并用 `hash<int>{}` 初始化。
   >
   > 作用：以后你在 lambda 内部写 `fn(num)`，就是对单个整数 `num` 做标准库的哈希：`std::hash<int>{}(num)`。
   >
   > ------
   >
   > ## 第 2 步：`accumulate` 的工作方式（核心）
   >
   > ```cpp
   > accumulate(arr.begin(), arr.end(), 0u, op)
   > ```
   >
   > `std::accumulate` 的定义可以理解成一个**左折叠（left fold）**：
   >
   > ```cpp
   > acc = init;
   > for (x : range) acc = op(acc, x);
   > return acc;
   > ```
   >
   > 也就是说，它从 `init` 开始，把范围里的元素一个个“吃进去”，不断更新累积值。
   >
   > 这里的：
   >
   > - 范围：`arr.begin()` 到 `arr.end()`（26 个计数）
   > - 初值：`0u`（无符号 0）
   > - 运算：你提供的 lambda `op(acc, num)`
   >
   > > 为什么是 `0u` 而不是 `0`？
   > >  因为 `accumulate` 的累积类型会受到 `init` 类型影响；`0u` 让 `acc` 是无符号类型，避免一些隐式转换坑。
   >
   > ------
   >
   > ## 第 3 步：每次如何把一个 `num` 合进 `acc`
   >
   > 内部的 op 是：
   >
   > ```cpp
   > [&](size_t acc, int num) {
   >     return (acc << 1) ^ fn(num);
   > }
   > ```
   >
   > 这句是整个“组合逻辑”：
   >
   > ### 3.1 `fn(num)`：先把单个数字变成“看起来随机”的哈希碎片
   >
   > - `num` 是某个字母的次数，比如 a 出现 2 次，b 出现 0 次……
   > - `fn(num)` 返回一个 `size_t`，让不同 `num` 产生不同的值（尽量分散）
   >
   > ### 3.2 `(acc << 1)`：让“顺序/位置”也参与进来
   >
   > 如果你只做 `acc ^ fn(num)`，不同位置的 `num` 交换可能导致碰撞更容易（虽然这里位置固定 26 个，但仍然希望每一步把状态“滚动”一下）。
   >
   > `acc << 1` 相当于把之前累计的结果整体左移一位（乘 2），给新的信息腾位置（直观理解：像滚动哈希那样“推进一步”）。
   >
   > ### 3.3 `^`（XOR）：把新碎片混进来
   >
   > `(acc << 1) ^ fn(num)` 的意思是：
   >
   > > 把历史信息（acc）推进一下，再用异或把当前 `num` 的哈希混进去。
   >
   > 这种“shift + xor”的组合方式在实践里很常见（例如很多 hash_combine 思路都会用移位/XOR/加常数来混合）。
   >
   > ------
   >
   > ## 用一个小例子走一遍（你就瞬间明白）
   >
   > 假设 `arr` 的前 4 个数是：`[2,0,1,0,...]`
   >
   > acc 初始 `0`：
   >
   > 1. num=2
   >     `acc = (0<<1) ^ fn(2) = fn(2)`
   > 2. num=0
   >     `acc = (fn(2)<<1) ^ fn(0)`
   > 3. num=1
   >     `acc = (((fn(2)<<1) ^ fn(0))<<1) ^ fn(1)`
   > 4. num=0
   >     `acc = (上一步结果<<1) ^ fn(0)`
   >
   > 这样每个位置都会影响最终值：不仅取决于每个 `num`，也取决于它出现的**顺序（位置）**。
   >
   > ------
   >
   > ## 这实现“对不对”？有什么潜在问题？
   >
   > 这能用、也能跑过题，但要知道两点：
   >
   > 1. **哈希不需要“完美”，只要满足：相同 key 必须给相同 hash**（同一次程序运行中）。这段满足。
   > 2. **碰撞不可避免**：shift+xor 是**简单混合**，分布未必最理想。工程里常用 `boost::hash_combine / hash_range` 这类更成熟的组合方式来降低碰撞风险。
   >
   > 
   >
   > ## 注：
   >
   > > ## 1) `[&](size_t acc, int num)` 是什么语法？
   > >
   > > 这是一个 **lambda 表达式**，`[&]` 是 **捕获列表（capture list）**，表示：
   > >
   > > - **默认按引用捕获**：lambda 体里用到的外部变量（比如这里的 `fn`）会以引用方式捕获进来。
   > >
   > > 也就是说，`&` 在这里不是“取地址”，而是“**捕获外部变量时用引用**”。
   > >
   > > 在你这段里，lambda 体用到了外部的 `fn`：
   > >
   > > ```cpp
   > > fn(num)
   > > ```
   > >
   > > 所以 `[&]` 会把 `fn`（以及其他你在 lambda 里用到的外部变量）按引用捕获。
   > >
   > > > 其实这段也可以写得更“精确”一点：`[&fn]`（只捕获 fn），效果在这里等价。
   > > >
   > > > 不过`[&]` **不是“把外部所有变量都自动引用捕获进来”**，而是：
   > > >
   > > > - **允许你在 lambda 体里直接用外部局部变量**
   > > > - 并且**对那些“在 lambda 体里实际被用到（更准确说：被 odr-used）”的变量**，采用**引用捕获**方式
   > > >
   > > > 所以它更像“**默认策略：用到谁就按引用捕获谁**”。
   > > >
   > > > ### 1) 它能捕获哪些“外部变量”？
   > > >
   > > > 主要是 **lambda 所在作用域里可见的局部变量**（以及在成员函数里时的 `this`/`*this` 相关规则）。全局变量/静态变量本来就不需要捕获也能访问。
   > > >
   > > > ### 2) “想捕获什么都可以吗？”
   > > >
   > > > 不完全是：
   > > >
   > > > - ✅ 你在 lambda 体里用到的、且在作用域内可见的局部变量：可以被 `[&]` 以引用方式隐式捕获
   > > > - ❌ 你没用到的变量：不会因为写了 `[&]` 就被捕获
   > > > - ⚠️ **生命周期坑**：引用捕获要求被捕获对象在 lambda 执行时仍然活着；如果你把 lambda 存起来/异步执行/返回出去，而引用指向的局部变量已经出作用域，就会悬空（UB）。这也是工程里很多人更偏向显式捕获或值捕获的原因。
   > > >
   > > > ### 3) 结合这段代码
   > > >
   > > >  accumulate 里 lambda 用到了 `fn`，所以 `[&]` 会把 `fn` 按引用捕获；`arr`、`acc`、`num` 都不是“外部变量”，所以不在捕获讨论范围内。
   > >
   > > ------
   > >
   > > ## 2) `acc` 和 `num` 是哪来的？
   > >
   > > 它们**不是外部变量**，而是这个 lambda 的**形参**，由 `std::accumulate` 在循环过程中传进来。
   > >
   > > 根据 `std::accumulate` 的定义（带二元操作版本）：
   > >
   > > - 它维护一个累加器 `acc`（初值是你传的 `init`，这里是 `0u`）
   > > - 依次遍历区间里的每个元素 `*i`
   > > - 每一步执行：`acc = op(acc, *i)`（C++20 起可能 move 一下，但逻辑一样）
   > >
   > > 所以在你的例子里：
   > >
   > > - `acc`：上一步累积出来的哈希值（第一次是 `0u`）
   > > - `num`：当前遍历到的 `arr` 里的元素（一个计数，比如 `arr[0]`、`arr[1]`…）
   > >
   > > ------
   > >
   > > ## 3) 为什么 lambda 里参数写成 `(size_t acc, int num)`？
   > >
   > > - `acc` 用 `size_t`：因为你在累积的是哈希值（返回也是 `size_t`）。
   > > - `num` 用 `int`：因为 `arr` 的元素类型是 `int`（`array<int,26>`）。
   > >
   > > 等价的“更贴近定义”的写法也常见：
   > >
   > > ```cpp
   > > [&](size_t acc, const int& num) { ... }
   > > ```
   > >
   > > 但这里按值接收 `int` 没问题（很小、拷贝便宜）。
   > >
   > > 编译器**不是**“看到名字叫 `num` 就知道它是 `arr` 的元素”。它完全是靠 **`std::accumulate` 的函数签名/调用约定**来决定“这个 lambda 的两个参数分别是什么”。
   > >
   > > ------
   > >
   > > ## 4) `num` 为什么就是 `arr` 里的元素？
   > >
   > > 因为 `std::accumulate(first, last, init, op)` 的规则是：
   > >
   > > > 对区间 `[first, last)` 的每个元素 `*i`，按顺序做
   > > >  `acc = op(acc, *i)`（C++20 起可能是 `op(std::move(acc), *i)`，意思一样） 
   > >
   > > 这里的 `first = arr.begin()`，`last = arr.end()`，所以 `*i` 就是 `arr` 里当前遍历到的那个 `int`。
   > >
   > > 因此你的 lambda：
   > >
   > > ```cpp
   > > [&](size_t acc, int num) { ... }
   > > ```
   > >
   > > 会被 `accumulate` 以这种方式调用（伪代码）：
   > >
   > > ```cpp
   > > acc = op(acc, arr[0]);
   > > acc = op(acc, arr[1]);
   > > ...
   > > ```
   > >
   > > 所以 **`num` 只是“第二个形参名字”**，每次调用时它的实参都会是当前的 `arr[k]`。
   > >
   > > ------
   > >
   > > ## 5) `acc` 这个命名是哪来的？
   > >
   > > `acc` 不是关键字，也不是标准规定的名字，只是作者随手起的变量名（accumulator 的缩写）。标准/库只规定“第一个参数表示累计值”，名字你随便取。
   > >
   > > `std::accumulate` 的说明里也常用 “acc” 表示累加器这个概念（文档描述用的名词），但你代码里的 `acc` **只是形参名**。
   > >
   > > ------
   > >
   > > ## 6) `acc` 和 `num` 可以换成别的名字吗？
   > >
   > > 当然可以，只要**顺序和类型匹配**就行，比如：
   > >
   > > ```cpp
   > > [&](size_t h, int x) { return (h << 1) ^ fn(x); }
   > > ```
   > >
   > > 完全等价。
   > >
   > > 注意点只有两个：
   > >
   > > 1. **第一个形参**接收的是“当前累计结果”（类型通常和 `init` 一致，这里是 `size_t` 因为 `init` 是 `0u`，会推到 unsigned/size_t 相关；作者显式写了 `size_t` 更清晰）。
   > > 2. **第二个形参**接收的是“当前元素”，类型能接住 `*iterator`（这里就是 `int`）。

   

1. **创建 `unordered_map` 容器：** 定义哈希函数后，下一行创建了一个 `unordered_map` 容器 `mp`：

   ```
   unordered_map<array<int, 26>, vector<string>, decltype(arrayHash)> mp(0, arrayHash);
   ```

   ​	这里 `mp` 的键类型是 `array<int, 26>`，值类型是 `vector<string>`（用于存放一组异位词），第三个模板参数用 `decltype(arrayHash)` 指定哈希函数的类型（即我们刚定义的 lambda 类型)。构造函数参数 `(0, arrayHash)` 的含义是：使用**初始桶数量0**（让实现自行决定合理桶数）和我们提供的 `arrayHash` 哈希函数来初始化 `mp`。此时，`mp` 是一个**空的哈希表**。

   - `unordered_map` 内部会使用 `arrayHash` 来对每个插入的键计算哈希索引，以决定存储位置。由于我们未提供第四模板参数，`mp` 会使用默认的 `std::equal_to<array<int,26>>` 来比较键是否相等；正如前面提到的，这会调用 `array<int,26>` 自带的 `operator==` 来逐元素比较两个数组。
   - 注意我们将 **lambda 实例 `arrayHash` 传入构造函数**。Lambda 类型无法默认构造（因为捕获了状态），所以必须显式传递。这一点在我们上面的 Stack Overflow 示例中也提到。

3. **遍历输入字符串并统计字符频率：** 下面进入主循环，遍历输入的字符串数组 `strs`：

   ```c++
   for (string& str : strs) {
       array<int, 26> counts{};
       int length = str.length();
       for (int i = 0; i < length; ++i) {
           counts[str[i] - 'a']++;
       }
       mp[counts].emplace_back(str);
   }
   ```

   逐步解释：

   - `for (string& str : strs)`：使用范围 for 循环遍历每个输入字符串，引用方式获取以避免不必要的拷贝。对于每个字符串 `str`，执行大括号内的过程。

   - `array<int, 26> counts{};`：声明一个长度为26的整数数组**并初始化为全0**。这个数组用于统计当前字符串每个字母出现的次数（下标0对应`a`，1对应`b`，... 25对应`z`）。

   - `int length = str.length();`：取得当前字符串长度，便于后续循环。

   - 内层 `for (int i = 0; i < length; ++i) { counts[str[i] - 'a']++; }`：遍历当前字符串的每个字符，根据字符计算索引并递增对应计数。`str[i] - 'a'` 将字符转换为0到25的索引值，例如 `'a'` 变0，`'c'` 变2。如此一来，`counts` 数组的每个元素就代表该字符串中某个字母的出现次数。这个**频次数组**可唯一表示一组异位词的特征：异位词由于字母组成相同，26个字母的频次分布相同。因此相同的 `counts` 键会汇聚一组异位词。

   - `mp[counts].emplace_back(str);`：这一行将当前字符串放入以 `counts` 为键对应的 vector 中。这里用到了 `unordered_map` 的 **`operator[]`**，通过方括号访问键：

     - 如果 `counts` 这个键**已存在**于 `mp`，`mp[counts]` 会返回对应的 `vector<string>` 的引用，我们直接调用 `.emplace_back(str)` 将字符串**追加**到该向量末尾。
     - 如果 `counts` **不存在**（第一次遇到这种字符分布），`operator[]` **会先创建**一个新的键值对：键为 `counts`，值为一个默认构造的空 `vector<string>`。然后返回这空向量的引用，接着 `.emplace_back(str)` 会把当前字符串放入新向量。换句话说，`mp[counts]` 的调用确保了以 `counts` 为键的向量存在，然后我们将字符串加入其中。

     > 下面把 `std::vector::emplace_back` 讲透，并和 `push_back` 做一个“你写代码时真正用得上的”对比（结合你那行 `mp[counts].emplace_back(str);`）。
     >
     > ------
     >
     > ## 1）`emplace_back` 到底做什么？
     >
     > `emplace_back(args...)` 的核心含义是：
     >
     > > **把参数 `args...` 原封不动（完美转发）交给 `vector` 元素类型 `T` 的构造函数，在 vector 尾部“原地构造”出一个新元素。**
     >
     > 也就是说它不是“先造一个 T，再塞进去”，而是尽量做到“直接在容器尾部那块内存里把 T 构造出来”。
     >
     > cppreference 的描述要点包括：
     >
     > - 参数会被转发给 `T` 的构造函数（`std::forward<Args>(args)...`）
     > - 可能触发扩容（reallocation），扩容会导致迭代器/引用失效（这一点和 push_back 一样）
     >
     > ------
     >
     > ## 2）`push_back` 做什么？
     >
     > `push_back(value)` 的语义是：
     >
     > > **把一个“已经存在的对象 value（T类型）”追加到 vector 末尾**
     > >  它有两个常见重载：接收 `const T&`（拷贝）或 `T&&`（移动）。
     >
     > 所以 `push_back` 更像“我手里已经有一个 T 了，请你把它放进容器”。
     >
     > ------
     >
     > ## 3）最关键的区别：是否需要“先构造一个临时对象”
     >
     > ### A. 你只有构造参数，没有现成的对象 —— `emplace_back` 更自然/可能更省
     >
     > 例如你要放一个 `President(name, country, year)`：
     >
     > ```cpp
     > v.emplace_back("Li", "China", 2026);  // 直接在vector尾部构造
     > ```
     >
     > 如果用 `push_back`，你往往要先构造一个临时对象：
     >
     > ```cpp
     > v.push_back(President("Li", "China", 2026)); // 先临时构造，再移动/拷贝进vector
     > ```
     >
     > `emplace_back` 的典型优势点就在这里：**避免那次“临时对象 -> 容器元素”的额外移动/拷贝（在不触发扩容的理想情况下）**。
     >
     > ------
     >
     > ### B. 你已经有一个现成对象（尤其是个左值 lvalue）—— 两者几乎一样
     >
     > 比如你已经有 `std::string str;`：
     >
     > ```cpp
     > v.emplace_back(str); // 这里传的是“一个现成的string对象”
     > v.push_back(str);
     > ```
     >
     > 这两句本质都会走 **拷贝构造**（因为 `str` 是左值）。`emplace_back(str)` 并不会“神奇地更快”，它只是把 `str` 当成构造参数，调用 `string` 的拷贝构造来在尾部构造元素——和 `push_back(str)`效果相同。
     >
     > > **这正好对应你代码里的：** `mp[counts].emplace_back(str);`
     > >  因为 `str` 是 `string&`（左值引用），所以这里 `emplace_back` 基本**等价于** `push_back(str)`（都要**拷贝**一份 string 进去）。
     > >  真正的性能关键更多在于：是否触发 vector 扩容、string 自身拷贝/移动成本等。
     >
     > ------
     >
     > ## 4）什么时候用哪个？（很实用的经验法则）
     >
     > - **你要“现场构造”元素（只有构造参数）**：优先 `emplace_back(...)`
     >    例：`emplace_back(10, 'a')` 构造 `string(10, 'a')` 这种。
     > - **你已经有一个对象了**：`push_back(obj)` 更直观；`emplace_back(obj)` 也行，但通常没优势。
     > - **你手里是一个右值/临时对象**：`push_back(std::move(obj))` 或 `push_back(T{...})` 通常就很好；`emplace_back(...)` 也可以。两者很多情况下会编译成差不多的效率（看类型/优化/是否扩容）。
     >
     > ------
     >
     > ## 5）一个容易踩的点：`emplace_back` 不一定总更快
     >
     > 即使 `emplace_back`“原地构造”，也要注意：
     >
     > - **如果这次插入触发扩容**，vector 会重新分配并移动/拷贝旧元素——这可能远比你省下的那一次临时对象移动更大。
     > - 某些写法下 `emplace_back` 还可能引入“构造选择/重载匹配”上的意外（更偏进阶，这里先点到为止）。
     >
     > ------
     >
     > ## 6）回到你的代码：那行 `emplace_back` 有没有必要？
     >
     > ```cpp
     > mp[counts].emplace_back(str);
     > ```
     >
     > 这里 **换成 `push_back(str)` 完全等价**（因为 `str` 是左值）。如果你写：
     >
     > ```cpp
     > mp[counts].emplace_back(std::move(str));
     > ```
     >
     > 那就可能触发 **移动构造**（把 `str` 的资源“挪走”），但要小心：你后面还要不要继续用 `str`（移动后它仍然有效但内容未指定）。
     
     调用 `operator[]` 会隐式完成插入操作（若无该键），这是 `unordered_map` 常用的访问/插入手段之一（相比之下，`mp.at(counts)` 不会插入新键，而是在键不存在时抛异常）。这里我们使用 `emplace_back` 而不是 `push_back`，直接在向量尾部**原地构造**字符串，**避免一次拷贝**，但两者作用相同（插入元素）。

3. **收集结果：** 当上述循环处理完所有字符串后，`mp` 已将异位词分好了组——每个键（字符频次数组）映射到一个装有若干字符串的向量。这时代码准备将结果输出到 `ans`：

   ```C++
   vector<vector<string>> ans;
   for (auto it = mp.begin(); it != mp.end(); ++it) {
       ans.emplace_back(it->second);
   }
   return ans;
   ```

   解释：

   - `vector<vector<string>> ans;`：初始化准备返回的结果容器，类型是向量的向量，每个子向量是一组异位词。
   - `for (auto it = mp.begin(); it != mp.end(); ++it)`：使用迭代器遍历 `mp` 中的每个键值对。由于 `unordered_map` 不保证顺序，遍历顺序无关紧要。每个 `it` 是一个迭代器，指向类型为 `pair<const array<int,26>, vector<string>>` 的元素。可以通过 `it->first` 访问键（即频次数组），`it->second` 访问对应的值（即装着异位词的 vector）。
   - `ans.emplace_back(it->second);`：将当前迭代器的值（字符串向量）添加到结果 `ans` 中。这里我们只关心异位词列表，不再需要那个键。`emplace_back` 会把整个 `vector<string>` **拷贝**（或移动）到 `ans` 的新元素中。
   - 循环结束后，`ans` 就包含了按异位词分组的若干子向量。最后 `return ans;` 返回结果。

> [!NOTE]
>
> 哈希函数处理后的“东西”**不是介于键和值之间的第三种元素**，它叫：
>
> - **哈希值 / 哈希码（hash value / hash code）**：一个 `size_t` 类型的整数，是由 key 计算出来的结果。
> - `unordered_map` 再用这个哈希值，结合当前桶数，把它映射成：
>   - **桶索引（bucket index）**：决定这个键值对放到哪个 bucket（桶）里。容器内部会做“哈希值 → 桶索引”的映射。
>
> 你可以把过程记成两步：
>
> 1. `h = hash(key)` 得到 **hash code / hash value（哈希值）**（类型通常是 `std::size_t`）
> 2. `bucket = h % bucket_count`（具体公式实现细节可能不同，但思想一致）得到 **bucket index（桶索引）**，把元素放进对应 bucket。
>
> ### 关键澄清
>
> - `unordered_map` 真正存储的元素仍然是 **键值对**：`pair<const Key, T>`，哈希值一般是**用来定位 bucket 的“计算结果”**，不是一个独立“夹在 key 和 value 中间的对象”。
> - “相同哈希码的键会落到同一个桶里”（可能产生冲突），再用 `KeyEqual`（默认是 `==`）在桶内确认到底是不是同一个 key。
>
> “桶（bucket）”就是 **`unordered_map` 内部用来存放元素的一格一格的“分组容器”**——你可以把它想成哈希表背后的一排抽屉/格子。
>
> 更正式一点说：
>
> - `unordered_map` 内部维护了 **很多个桶**（桶的数量叫 `bucket_count()`）。([cppreference: bucket_count](https://en.cppreference.com/w/cpp/container/unordered_map/bucket_count?utm_source=chatgpt.com))
> - 插入一个键值对 `(key, value)` 时，会先算 **哈希值** `h = hash(key)`，再把它映射到某个 **桶编号（bucket index）**，然后把元素放进那个桶里。([cppreference: unordered_map / Bucket interface](https://en.cppreference.com/w/cpp/container/unordered_map.html?utm_source=chatgpt.com))
>
> ------
>
> ## 桶里放的是什么？
>
> 桶里放的是 **元素（也就是 key-value 对）**，不是只放 key，也不是放 hash 值。
>
> 理想情况下：**每个桶里 0 或 1 个元素**，查找就很快。
>  但现实中会发生 **哈希冲突（collision）**：不同的 key **可能**算出来落到同一个桶，于是 **一个桶里会挂着多个元素**，查找时就得在桶里逐个用 `==` 比较 key 来确认。
>
> ------
>
> ## 为什么叫“桶”？
>
> 因为它把“可能很多元素”按哈希映射 **分桶**：每桶负责一部分元素。标准库甚至提供了“桶接口（bucket interface）”，可以让你：
>
> - 问桶总数：`bucket_count()`
> - 问某个 key 在哪个桶：`bucket(key)`
> - 问某个桶里有多少元素：`bucket_size(i)`
> - 遍历某个桶：`begin(i)` / `end(i)`
>    这些都在 `unordered_map` 的接口列表里。
>
> ------
>
> ## 和“负载因子”有什么关系？
>
> `load_factor()` 的定义就是：
>
> > 平均每个桶有多少元素 ≈ `size() / bucket_count()`。
>
> 元素越来越多、桶不够用时，平均每桶元素数会上升，冲突变多，性能会变差；于是容器可能会 **rehash（重新分桶/扩桶）**，增加桶数量并把所有元素重新分配到新桶里。



## 3.每日温度（No.739）

### 题目：

> 给定一个整数数组 `temperatures` ，表示每天的温度，返回一个数组 `answer` ，其中 `answer[i]` 是指对于第 `i` 天，下一个更高温度出现在几天后。如果气温在这之后都不会升高，请在该位置用 `0` 来代替。
>
>  
>
> **示例 1:**
>
> ```
> 输入: temperatures = [73,74,75,71,69,72,76,73]
> 输出: [1,1,4,2,1,1,0,0]
> ```
>
> **示例 2:**
>
> ```
> 输入: temperatures = [30,40,50,60]
> 输出: [1,1,1,0]
> ```
>
> **示例 3:**
>
> ```
> 输入: temperatures = [30,60,90]
> 输出: [1,1,0]
> ```
>
>  
>
> **提示：**
>
> - `1 <= temperatures.length <= 10^5`
> - `30 <= temperatures[i] <= 100`



### 解法一：纯暴力双循环（39/48）【超时】

```c++
class Solution {
    public:
    vector<int> dailyTemperatures(vector<int>& temperatures) {
        vector<int> ans;
        for(int i = 0; i < temperatures.size(); i++)
        {
            int count=0;
            for(int j = i+1; j < temperatures.size(); j++)
            {
                if(temperatures[i] < temperatures[j])
                {
                    ans.push_back(count+1);
                    break;
                }
                else
                {
                    count++;
                }
                if(j == temperatures.size()-1)
                {
                    ans.push_back(0);
                }
            }
            if(i == temperatures.size()-1)
            {
                ans.push_back(0);
            }
        }

        return ans;
    }
};
```

#### 复杂度（暴力解法）：

对于 n 天中的每一天，在最坏情况下我们可能都需要扫描近 n 天，平均而言大约需要 n*(n/2)次比较，即 O(n²)的时间复杂度。当  `n = 100,000` 时，这可能需要进行约 10¹⁰次检查，这是不可行的。

### 解法二：暴力+next数组优化

```c++
class Solution {
    public:
    vector<int> dailyTemperatures(vector<int>& temperatures) {
        int n = temperatures.size();
        vector<int> ans(n), next(101, INT_MAX);
        for (int i = n - 1; i >= 0; --i) {
            int warmerIndex = INT_MAX;
            for (int t = temperatures[i] + 1; t <= 100; ++t) {
                warmerIndex = min(warmerIndex, next[t]);
            }
            if (warmerIndex != INT_MAX) {
                ans[i] = warmerIndex - i;
            }
            next[temperatures[i]] = i;
        }
        return ans;
    }
};
```

#### 代码解读：

​	这份代码用的不是常见的「单调栈」，而是利用了题目给定的**温度范围只有 30~100**（总共最多 71 种温度）这一点，做了一个“从右往左 + 记录每个温度下次出现位置”的解法。

​	这种“next 数组”思路也经常被作为该题的替代解法（因为温度值域很小）。

------

**核心思路：**

从右往左扫 `temperatures`：

- 维护一个数组 `next[0..100]`（这里只用到 30~100），`next[t]` 表示：**温度恰好为 t 的“最近一次出现的位置”（下标）**，而且这个“最近一次”指的是**在当前 i 的右侧**（因为我们从右往左更新）。
- 当处理到第 `i` 天，温度是 `cur = temperatures[i]`：
  - 想找“下一次更高温度”的位置，就是在所有 `t = cur+1 .. 100` 里面，找 `next[t]` 的最小值（离 i 最近的那个更高温度日）。
  - 如果这个最小位置存在，就 `answer[i] = warmerIndex - i`；否则为 0。

为什么可行：因为对于每个“更高温度值 t”，`next[t]` 都记录了它在右侧最靠近的位置。把所有更高温度的“最近位置”取个最小，就是“下一次更高温度”的日子。

复杂度：

- 外层 n 次；
- 内层最多扫 71 个温度（从 cur+1 到 100）；
- 所以总复杂度约 `O(71*n)`，对 `n<=1e5` 很稳（常数小）。题目约束允许。

------

**逐行解读代码（带着每一步“状态”看）**

```cpp
class Solution {
public:
    vector<int> dailyTemperatures(vector<int>& temperatures) {
```

- 定义类与函数，输入是温度数组引用。

```cpp
        int n = temperatures.size();
```

- `n` 是天数。

```cpp
        vector<int> ans(n), next(101, INT_MAX);  //可以连续定义
```

- `ans(n)`：答案数组，默认初始化为 0（`vector<int>` 默认值是 0）。
- `next(101, INT_MAX)`：下标 0..100，用 `INT_MAX` 表示“右侧还没出现过这种温度”。
  - 之所以开 101，是为了直接用温度值当下标（温度最大 100）。

```cpp
        for (int i = n - 1; i >= 0; --i) {
```

- 从右往左遍历，这样 `next` 里维护的永远是“i 右侧”的信息。

```cpp
            int warmerIndex = INT_MAX;
```

- 记录“下一次更高温度”的最早下标，先设为不存在。

```cpp
            for (int t = temperatures[i] + 1; t <= 100; ++t) {
                warmerIndex = min(warmerIndex, next[t]);
            }
```

- 枚举所有比当天温度更高的温度 `t`：
  - `next[t]` 是“温度=t 在右侧最近出现的位置”
  - 取最小的那个位置，就是右侧最早出现的“更高温度日”
- 如果某个温度 `t` 右侧没出现过，`next[t]` 还是 `INT_MAX`，不会影响 `min` 的结果。

```cpp
            if (warmerIndex != INT_MAX) {
                ans[i] = warmerIndex - i;
            }
```

- 如果找到了更高温度日（`warmerIndex` 不是 `INT_MAX`）：
  - 等待天数 = 目标下标 - 当前下标
- 如果没找到，`ans[i]` 保持默认 0，符合题意。

```cpp
            next[temperatures[i]] = i;
```

- 更新：把“温度=temperatures[i] 的最近出现位置”设为当前 i。
- 因为我们从右往左走，所以这一步保证 `next[temp]` 始终是“离当前扫描位置最近的、在右侧的那个 temp 的位置”。

```cpp
        }
        return ans;
    }
};
```

- 遍历完返回答案。

------

**用示例快速对一下直觉（为什么能算出 1,1,4,...）**

以 `[73,74,75,71,69,72,76,73]` 为例（从右往左）：

- i=7 温度73：右侧没有任何天，找不到更高温度 ⇒ ans[7]=0；更新 next[73]=7
- i=6 温度76：右侧温度更高不存在 ⇒ ans[6]=0；更新 next[76]=6
- i=5 温度72：看 73..100，next[73]=7、next[76]=6 ⇒ 最小是 6 ⇒ ans[5]=6-5=1；更新 next[72]=5
- i=4 温度69：看 70..100，next[72]=5 ⇒ ans[4]=1
- …最后就得到 `[1,1,4,2,1,1,0,0]`（与题目示例一致）。

------

**这个解法和单调栈的关系**

- 单调栈是通用的 `O(n)` 解法（不依赖温度值域大小）。 
- 这是**“值域小”的特化**：用 `next[温度]` + 枚举更高温度，把“找下一个更大元素”变成了常数范围扫描。 

### 解法三：单调栈

```c++
class Solution {
public:
    vector<int> dailyTemperatures(vector<int>& temperatures) {
        int n = temperatures.size();
        vector<int> ans(n);
        stack<int> s;
        for (int i = 0; i < n; ++i) {
            while (!s.empty() && temperatures[i] > temperatures[s.top()]) {
                int previousIndex = s.top();
                ans[previousIndex] = i - previousIndex;
                s.pop();
            }
            s.push(i);
        }
        return ans;
    }
};
```

#### 代码解读：

这段代码是「单调递减栈（monotonic decreasing stack）」的经典写法：**栈里存“还没找到下一个更高温度”的那些天的下标**，并且保证这些下标对应的温度从栈底到栈顶是**递减**的。这样一旦遇到更高温度，就能一次性把能被它“解答”的天都弹出来并填答案；每个下标最多入栈一次、出栈一次，所以整体是 **O(n)**。

------

**核心思路（为什么用栈、栈里放什么）**

- 栈 `s` 里放的是 **下标**（不是温度值），方便直接算等待天数 `i - previousIndex`
- 栈保持“温度递减”：对任意相邻元素 `... a, b(栈顶)`，都有 `temperatures[a] >= temperatures[b]`
- 当遍历到第 `i` 天：
  - 如果 `temperatures[i]` 比栈顶那天更热，说明：**栈顶那天的“下一个更高温度”就是今天 i**（因为 i 是从左到右扫描遇到的第一个更高温度日）。弹出并填答案，然后继续看新的栈顶，可能还能解答更多天
- 遍历完后，栈里剩下的下标就是“右边再也没有更高温度”的天，它们答案保持默认 0

------

**逐行解读代码**

```cpp
class Solution {
public:
    vector<int> dailyTemperatures(vector<int>& temperatures) {
```

- 定义解题函数，输入是温度数组引用。

```cpp
        int n = temperatures.size();
```

- `n` 是天数。

```cpp
        vector<int> ans(n);
```

- `ans` 是结果数组，长度为 n。
- `vector<int> ans(n);` 会把元素默认初始化为 **0**，刚好表示“以后不会升温”。

```cpp
        stack<int> s;
```

- 单调栈，存 **下标**。

```cpp
        for (int i = 0; i < n; ++i) {
```

- 从左到右遍历每一天 `i`。

```cpp
            while (!s.empty() && temperatures[i] > temperatures[s.top()]) {
```

- 只要栈不空，并且当前温度 `temperatures[i]` **严格大于** 栈顶那天的温度：
  - 说明栈顶那天终于等到了一个更热的日子，就是今天 `i`。
  - 用 `while` 是因为今天可能比栈里好几天都热，可以连续“结算”多个下标。

```cpp
                int previousIndex = s.top();
```

- 取出栈顶那天的下标（还没找到更高温度的那天）。

```cpp
                ans[previousIndex] = i - previousIndex;
```

- 今天 `i` 是 `previousIndex` 的下一次更高温度日，所以等待天数是差值。

```cpp
                s.pop();
```

- 这个下标已经有答案了，从栈里移除；继续检查新的栈顶是否也能被今天解答。

```cpp
            }
            s.push(i);
```

- 把当前下标 `i` 入栈：表示“第 i 天还没找到更高温度，等待未来来解答它”。
- 入栈后仍能保证栈递减：因为在入栈前，所有比当前温度低的都已经在 `while` 中被弹掉了，所以栈顶温度一定 `>=` 当前温度。

```cpp
        }
        return ans;
    }
};
```

- 遍历结束返回答案。栈里残留的下标没有更高温度，答案自然保持 0

------

**用示例走一小段（帮助你“看见”栈在干嘛）**

以 `[73,74,75,71,69,72,76,73]`：

- i=0,73：栈空，push 0 → 栈 [0]
- i=1,74：74>73，弹0，ans[0]=1；push1 → 栈[1]
- i=2,75：75>74，弹1，ans[1]=1；push2 → 栈[2]
- i=3,71：71不大于75，push3 → 栈[2,3]（温度 75,71 递减）
- i=5,72：72>69 弹4 ans[4]=1；72>71 弹3 ans[3]=2；72不大于75 停；push5 …
- i=6,76：连续弹5、2，得到 ans[5]=1、ans[2]=4 …最终就是题目输出



## 4.字符串解码（No.394）

### 题目：

> 给定一个经过编码的字符串，返回它解码后的字符串。
>
> 编码规则为: `k[encoded_string]`，表示其中方括号内部的 `encoded_string` 正好重复 `k` 次。注意 `k` 保证为正整数。
>
> 你可以认为输入字符串总是有效的；输入字符串中没有额外的空格，且输入的方括号总是符合格式要求的。
>
> 此外，你可以认为原始数据不包含数字，所有的数字只表示重复的次数 `k` ，例如不会出现像 `3a` 或 `2[4]` 的输入。
>
> 测试用例保证输出的长度不会超过 `10^5`。
>
>  
>
> **示例 1：**
>
> ```
> 输入：s = "3[a]2[bc]"
> 输出："aaabcbc"
> ```
>
> **示例 2：**
>
> ```
> 输入：s = "3[a2[c]]"
> 输出："accaccacc"
> ```
>
> **示例 3：**
>
> ```
> 输入：s = "2[abc]3[cd]ef"
> 输出："abcabccdcdcdef"
> ```
>
> **示例 4：**
>
> ```
> 输入：s = "abc3[cd]xyz"
> 输出："abccdcdcdxyz"
> ```
>
>  
>
> **提示：**
>
> - `1 <= s.length <= 30`
> - `s` 由小写英文字母、数字和方括号 `'[]'` 组成
> - `s` 保证是一个 **有效** 的输入。
> - `s` 中所有整数的取值范围为 `[1, 300]` 

### 解法：栈操作

```c++
class Solution {
public:
    string decodeString(string s) {
        int n = s.size();
        stack<string> stk;
        for(int i = 0; i < n; i++)
        {
            if(s[i] != ']')
            {
                stk.push(string(1, s[i]));
            }
           
            stack<string> tmp;
            if(s[i] == ']')
            {
                while(stk.top() != "[")
                {
                    tmp.push(stk.top());
                    stk.pop();
                }
                stk.pop();
                int count=0;
                int rate = 1;
                while(!stk.empty() && stk.top() >= "0" && stk.top() <= "9")
                {
                    count += rate * (stk.top()[0] - '0');
                    stk.pop();
                    rate*=10;
                }
                string tmps;
                while(!tmp.empty())
                {
                    tmps += tmp.top();
                    tmp.pop();
                }
                for(int i = 0; i < count; i++)
                {
                    stk.push(tmps);
                }
            }
        }

        string result;
        stack<string> tmpres;
        while(!stk.empty())
        {
            tmpres.push(stk.top());
            stk.pop();
        }
        while(!tmpres.empty())
        {
            result += tmpres.top();
            tmpres.pop();
        }
        
        return result;
    }
};
```

**时间复杂度：O(N)**
