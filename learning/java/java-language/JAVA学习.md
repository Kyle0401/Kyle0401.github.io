# JAVA语言学习

## 一、方法 main()

你的程序（取决于规模）可以由一个或多个文件组成。每个文件都包含按函数分组的命令（在 Java 中它们也被称为方法）。Java 的最小程序必须至少有一个方法，从它开始执行。这个方法叫 main()。

方法 main()是你程序的入口点。代码的执行总是从它开始。在 Java 21 及以上版本中，最小程序可以只包含一个 main() 方法，甚至可以不包含任何命令。

Java 25 的最小程序如下：

```java
void main()
{
}
```

如你所见，这个示例中的 main() 方法不包含任何命令。但它依然是一个完整的、虽然是最小的程序。它的外观始终如下：

```java
void main()
{
   // 方法中的命令
}
```

这种简化的方式让 Java 对新手更易上手，使你能够把注意力放在程序逻辑而不是语法上。

------

## 二、Java 中的屏幕输出：System.out.println 与 System.out.print

### 1. 认识命令 System.out.println

解析命令：

println 就是 print + line —— 打印一行

System.out 是一个特殊的系统对象，用来把文本输出到屏幕上。它也被称为控制台。控制台 是人与程序交互最常见的方式之一：当用户通过键盘向程序输入命令，而程序把文本输出到屏幕上时，我们就说程序在与控制台交互。

命令示例：

| 命令 | 输出（作用） |
| --- | --- |
| `System.out.println(2025);` | 输出数字：`2025` |
| `System.out.println("Ciao 🍕");` | 输出文本：`Ciao 🍕` |
| `System.out.println("こんにちは 🗾");` | 输出文本：`こんにちは 🗾` |
| `System.out.println("我的年龄：" + 28);` | 拼接字符串和数字后输出：`我的年龄：28` |
| `System.out.println("现在是 " + 2025 + " 年。");` | 拼接多段内容后输出：`现在是 2025 年。` |

**大小写很重要：**

在 Java 中大小写有区别：命令是用大写还是小写书写很关键。命令 System.out.println() 可以工作，而 system.out.println() — 不行。如果大小写写错了，Java 就无法识别，也就不会执行。请务必注意。

### 2. 认识命令 System.out.print

System.out.println() 会把文本输出到屏幕上，并在其后添加一个换行，就像按下 Enter 一样。因此，下一次调用 System.out.println() 时，文本会输出在下一行。再下一次 — 仍然在下一行，依此类推。

与 System.out.println() 不同，System.out.print() 在输出后不会添加 Enter。因此，多次使用 System.out.print() 输出的文本会出现在同一行。

示例 ：

```java
System.out.print("Amigo");
System.out.println("The");
System.out.print("Best");
```

屏幕输出：

```text
AmigoThe
Best
```

**如果想把文本输出在一行里，用 print()；如果想分多行输出，用 println()**

------

## 三、变量与数据类型

### **1.变量名：哪些可以，哪些不可以**

创建变量时，了解以下要点很有用：

- 变量名几乎可以是任意的（例如 temperature、score、userAge）。
- 但有一些限制——它不能以数字开头，也不能与 Java 的保留字重名（例如不能把变量命名为 int 或 if）。
- 不能包含**除 $ 和 _ 之外**的特殊符号。
- 名称**区分大小写**（Age 和 age 是不同的变量）。
- 通常采用 **camelCase** 风格：首字母小写，其后每个单词首字母大写（userAge、maxScore）。

允许的名称示例：

```java
int x123 = 1;
String koteyka;
double PI = 3.14;
String MAIN_PATH = "c:/";
```

不允许的名称示例：

```java
int 1first = 1;			// 名称不能以数字开头
int number# = 25;		// 名称中不能使用符号 #
String name" = "John";	// 名称中不允许出现引号
double pi+e = 5.123;  	// 名称不能包含 +
```



### 2.变量声明

> [!IMPORTANT]
>
> 在同一个代码块中不能创建两个同名变量；但在不同的代码块中可以。这就像放在不同房子里的箱子。关于代码块的更多内容——在后续讲解中。



### 3.**只有已赋值的变量才能使用/修改**

如果只声明了变量但未赋值就尝试使用，Java 编译器会报错。

下面的代码无法通过编译：

```java
String name;
System.out.println(name); // 变量 name 未初始化。程序无法编译。
int a;
a++; // 变量 a 未初始化。程序无法编译。
double x;
double y = x; // 变量 x 未初始化。程序无法编译。
```



### 4.整数：int 类型，int 类型的运算

int 类型的变量可以存储的整数范围大约是从 -20 亿 到 +20 亿。更精确地说，是从 -2,147,483,648 到 2,147,483,647。

字母的大小写有区分：语句 int color 和 int Color 会声明两个不同的变量。

在 Java 中，用 整数 除以 整数，结果总是 整数。余数会被丢弃，也可以说小数部分会被截断。



### 5.字符串与文本：String 类型，字符串操作

Java 中的**所有**对象（真的所有）都可以被转换为 String。或者更准确地说，Java 中的每个对象都能返回其文本（字符串）表示形式。

#### 5.1在字符串中转义特殊字符

你已经知道，字符串由双引号包裹。那么如果需要在字符串里包含引号怎么办？如果我们在字符串中直接写引号，编译器不会把它当成字符串的结束吗？

没错，会的。因此，字符串内部的引号要用一对字符 \" 来表示。代码会是这样：

```java
String quote = "他说：\"您好！\"";
System.out.println(quote); // 他说："您好！"
```

其实还要再精细一点。符号 \ 在字符串内部被视为特殊（控制）字符。借助它可以表示各种“不可见字符”，比如换行、制表符等。而要表示符号 \ 本身，需要写 2 次。

以下是最常用的 4 个组合：

| 写法 | 含义             |
| ---- | ---------------- |
| \n   | 换行（newline）  |
| \t   | 制表符（缩进）   |
| \\   | 字面量 \         |
| \"   | 字符串内部的引号 |

示例：

```java
String multiline = "第1行\n第2行";
System.out.println(multiline);
```

输出：

```java
第1行
第2行
```

#### 5.2字符串的内置方法

String 类型有很多自带的方法（也称为“函数”或“方法”）。这些方法非常多，能够极大地方便开发。今天你将认识其中一些（最简单的）。例如：

| 方法                | 说明         | 结果示例                      |
| ------------------- | ------------ | ----------------------------- |
| `str.length()`      | 字符串长度   | `"abc".length() → 3`          |
| `str.toUpperCase()` | 转为大写     | `"abc".toUpperCase() → "ABC"` |
| `str.toLowerCase()` | 转为小写     | `"ABC".toLowerCase() → "abc"` |
| `str.trim()`        | 去掉两端空格 | `"  x y  ".trim() → "x y"`    |

**使用字符串方法的示例：**

这些方法的调用方式如下：变量.函数(...)。

确定字符串的长度：

```java
String name = "Andrey";
int length = name.length();
System.out.println(length); // 6，因为有 6 个字母
```

将字符串转换为大写或小写：

```java
String original = "hello";
System.out.println(original.toUpperCase()); // HELLO
System.out.println(original.toLowerCase()); // hello
```

去掉两端空格（从键盘输入时非常有用）：

```java
String messy = "   hello   ";
System.out.println(messy.trim()); // "hello"
```

每个这样的方法都会返回一个新的字符串，原有字符串本身不会改变。

### 6.数据类型之间的转换

#### 6.1将 int 转换为 String

工作中经常需要得到数字的字符串表示：例如，用于输出到屏幕、保存到文件、通过网络传输、与文本拼接等。在 Java 中有多种方法可用，不同场景各有适用性。

##### String.valueOf() 函数

这是最主要、最常用的方法：

```java
int number = 42;
String str = String.valueOf(number);  // str == "42"
```

String.valueOf() 会把传入对象的值转换为与其类型相对应的字符串。

##### 与空字符串拼接（隐式转换）

一种老但可用的方法：

```java
int number = 42;
String str = "" + number;
```

这种方式在简单场景下很快捷，但对阅读代码的人不够直观。

##### 隐式转换为字符串

如上所述，Java 的设计使得在 Java 中几乎所有变量、对象、表达式都可以转换为 String。

此外，当我们把 String 与其他类型相加时，这种转换会自动发生。示例：

```java
int a = 5;
String name = "Anya" + a;            //  name 包含字符串 Anya5

int a = 5;
String city = a + "New York" + a;   //  city 包含字符串 5New York5

int number = 10;
String code = "Yo";
String message = "Hello! " + number + code; //  message 包含字符串 Hello! 10Yo
```

在这三个示例中，我们把 int 与 String 相加，结果始终是 String 类型。

重要！ 不能对 String 类型执行算术运算。即便该字符串完全由数字组成。

示例：

```java
int a = 5;
String name = "1" + a;              //  name 包含字符串 15

int a = 5;
String city = a + "9" + a;          //  city 包含字符串 595

int number = 10;
String code = "10";
String message = "" + number + code; // message 包含字符串 1010
```

**加法从左到右执行**，因此结果可能会有些出乎意料。例：

```java
int a = 5;
String name = a + a + "1" + a;      // name 包含字符串 1015
```

执行顺序： ((a + a) + "1") + a

------

## 四、编译器与注释

![image-20260613032810576](F:\JAVA学习\assets\image-20260613032810576.png)

### 1.编译器

Java 编译器不会把所有类编译成一个由机器码组成的程序。相反，它会把每个类分别编译，而且不是编译成机器码，而是编译成一种特殊的中间代码（字节码）。在程序启动时才会编译为机器码。

那么在程序启动时是谁把它编译成机器码呢？

为此有一个名为 JVM（Java Virtual Machine，Java 虚拟机）的特殊程序。先启动它，然后再启动由字节码组成的程序。而 JVM 会在执行所需程序之前，将其编译为机器码。

如果你的处理器很强，支持更大的机器指令集，那么在“第二次编译”时，会根据你的处理器和操作系统生成机器码。这也是为什么 Java 有时会比 C++ 更快，后者直接被编译为机器码，只能利用处理器中最常见的那部分指令。

### 2.单行注释

在 Java 中有两种注释——单行和多行。单行注释以双斜杠 // 开始，并一直持续到行尾。// 之后的所有内容都被视为注释，并会被编译器完全忽略。

### 3.多行注释

如果要说的内容很多，像讲一个故事一样？可以使用多行注释，它以 /* 开始，以 */ 结束。这两个符号之间的所有内容都会被编译器忽略，即使它跨越多行。

> [!CAUTION]
>
> 注意：多行注释不能相互嵌套。别试图比编译器更聪明——这不会奏效。

### 4.TODO 和 FIXME 标记

程序员也是人，有时需要提醒自己：这段代码还没写完，或者这里有个 bug。常见的写法是：

```java
// TODO: 添加对空输入的检查
// FIXME: 这个函数对总和的计算不正确
```

许多编辑器和 IDE 甚至会高亮这些词！
