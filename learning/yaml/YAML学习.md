# YAML 学习笔记

YAML 是一种面向数据的文本序列化格式，常用于配置文件、持续集成流水线、容器编排和云原生系统。本笔记以“能读懂、能编写、能排错”为目标，并结合 `.cnb.yml`、Docker Compose 和 GitHub Actions 等实际场景说明。

> [!NOTE]
>
> YAML 当前广泛采用的规范版本是 **YAML 1.2（Revision 1.2.2）**。不同工具使用的解析器并不完全一致，因此“语法在某个工具里能运行”不代表它在所有 YAML 解析器里都具有相同含义。

## 一、认识 YAML

### YAML 是什么

YAML 的名称通常展开为 **YAML Ain't Markup Language**，强调它主要用于描述数据，而不是像 HTML 那样描述文档结构。

YAML 文件常见扩展名为：

- `.yaml`
- `.yml`

二者在语法上没有区别。具体使用哪个文件名，通常由项目或平台约定。例如腾讯云 CNB 使用 `.cnb.yml`，GitHub Actions 通常使用 `.github/workflows/*.yml` 或 `.yaml`。

### YAML 能表达什么

YAML 主要表达三类数据结构：

| 数据结构 | 常见名称 | YAML 表示方式 |
| --- | --- | --- |
| 标量 | scalar | 字符串、数字、布尔值、空值等单个值 |
| 映射 | mapping | `键: 值`，类似字典、对象或哈希表 |
| 序列 | sequence | 以 `-` 开头的列表，类似数组 |

```yaml
name: Kyle
age: 22
skills:
  - C
  - Java
  - Python
```

这段 YAML 可以理解为：最外层是一个映射，其中 `skills` 对应一个序列。

### YAML 与 JSON 的关系

YAML 和 JSON 都可以描述树形数据。JSON 更严格、适合程序交换；YAML 更便于人手工阅读和编写，并支持注释、多行字符串、锚点等功能。

```json
{
  "server": {
    "host": "127.0.0.1",
    "port": 8080
  }
}
```

对应的 YAML 可以写成：

```yaml
server:
  host: 127.0.0.1
  port: 8080
```

> [!NOTE]
>
> YAML 1.2 将 JSON 视为其语法兼容目标，因此 JSON 风格的对象和数组通常也可以写在 YAML 中。不过在配置文件里，一般优先使用更易读的块风格。

## 二、最基本的语法规则

### 使用缩进表示层级

YAML 不使用大括号表示层级，而是依靠缩进。

```yaml
student:
  name: Kyle
  major: Computer Science
```

`name` 和 `major` 比 `student` 多缩进了一层，因此它们属于 `student`。

同一层级必须左对齐：

```yaml
student:
  name: Kyle
  major: Computer Science
```

下面的写法是错误的：

```yaml
student:
  name: Kyle
    major: Computer Science
```

### 缩进只能使用空格

YAML 的缩进不能使用 Tab。工程中通常统一使用 **2 个空格**，但 YAML 规范并不强制每层必须恰好两个空格；真正的要求是同一层级保持一致。

```yaml
application:
  server:
    port: 8080
```

### 冒号后通常需要空格

映射使用 `键: 值`：

```yaml
name: Kyle
port: 8080
```

不要写成：

```yaml
name:Kyle
```

在 YAML 中，`:` 是否被识别为键值分隔符与其上下文和后续空白有关。为了避免歧义，编写映射时应始终写成 `key: value`。

### 使用井号编写注释

```yaml
server:
  port: 8080 # Web 服务端口
```

`#` 后面的内容是注释。但当 `#` 是字符串内容的一部分时，建议加引号：

```yaml
color: "#2496ed"
password: "abc#123"
```

### 大小写敏感

YAML 的键名和普通字符串区分大小写：

```yaml
name: Kyle
Name: AnotherValue
```

这里的 `name` 与 `Name` 是两个不同的键。

## 三、映射：键值对

### 基本映射

映射由多个 `键: 值` 组成：

```yaml
user:
  name: Kyle
  age: 22
  active: true
```

映射中的键通常使用字符串。为了提高兼容性和可读性，建议键名保持简洁，并避免把复杂对象作为键。

### 空映射与行内映射

空映射：

```yaml
metadata: {}
```

行内映射也称流式映射：

```yaml
user: { name: Kyle, age: 22 }
```

行内写法适合非常短的数据；层级较深时，块风格通常更清晰。

### 不要重复定义同一个键

```yaml
server:
  port: 8080
  port: 9000
```

不同解析器对重复键的处理可能不同：有的报错，有的保留最后一个值，也有的保留第一个值。可靠的配置文件不应依赖这种不确定行为。

### 键名包含特殊字符时加引号

```yaml
"build:mode": release
"#channel": general
```

普通键名建议使用字母、数字、连字符或下划线，减少解析器和工具链之间的差异。

## 四、序列：列表

### 基本序列

列表项使用 `- ` 开头：

```yaml
languages:
  - C
  - C++
  - Python
```

短横线后要保留空格。

### 对象列表

列表中的每一项也可以是映射：

```yaml
students:
  - name: Kyle
    major: Computer Science
  - name: Alice
    major: Mathematics
```

这里 `students` 是一个序列，序列中有两个学生对象。

### 嵌套列表

```yaml
matrix:
  - - 1
    - 2
  - - 3
    - 4
```

它表示二维数组 `[[1, 2], [3, 4]]`。虽然语法正确，但复杂嵌套应配合清晰缩进，避免可读性快速下降。

### 空序列与行内序列

```yaml
empty_list: []
ports: [80, 443, 8080]
```

流式序列适合元素较少、内容较短的情况。

## 五、标量与数据类型

### 字符串

最简单的字符串可以不加引号：

```yaml
name: Kyle
message: Hello YAML
```

以下情况建议加引号：

- 字符串包含 `: ` 或 ` #` 等可能改变解析结果的组合
- 字符串看起来像数字、布尔值、日期或空值
- 需要保留开头或结尾的空格
- 字符串包含转义字符

```yaml
version: "1.0"
enabled_text: "true"
date_text: "2026-07-15"
```

### 单引号与双引号

单引号中的内容大多按字面值处理：

```yaml
windows_path: 'C:\new\test'
```

双引号支持反斜杠转义：

```yaml
message: "第一行\n第二行"
quote: "他说：\"Hello\""
```

单引号字符串中需要表示单引号时，使用两个连续单引号：

```yaml
text: 'It''s YAML'
```

### 整数与浮点数

```yaml
count: 10
negative: -3
pi: 3.14159
scientific: 1.2e3
```

当编号、邮政编码、版本号等内容必须按文本处理时，应加引号：

```yaml
student_id: "001024"
version: "1.20"
```

### 布尔值

YAML 1.2 核心模式中，推荐使用：

```yaml
enabled: true
disabled: false
```

YAML 1.1 的部分解析器还可能把 `yes`、`no`、`on`、`off` 等词识别为布尔值，而 YAML 1.2 通常将它们视为普通字符串。为了跨工具兼容，布尔值统一写成 `true` 和 `false`。

### 空值

```yaml
value1: null
value2: ~
value3:
```

三种写法都可能表示空值。团队协作时建议统一使用最直观的 `null`。

### 类型由解析器和 Schema 决定

YAML 文本中的标量最终被解释为什么类型，取决于解析器采用的 Schema 和工具自身规则。例如日期、时间、前导零数字在不同生态中可能出现差异。

> [!NOTE]
>
> 对“看起来像其他类型、但实际必须是字符串”的值加引号，是最实用的防御性写法。

## 六、多行字符串

### `|`：保留换行

竖线表示 literal block scalar，通常保留文本中的换行：

```yaml
script: |
  echo "第一行"
  echo "第二行"
```

得到的字符串近似为：

```text
echo "第一行"
echo "第二行"
```

它适合 Shell 脚本、证书、配置片段和保留排版的正文。

### `>`：折叠换行

大于号表示 folded block scalar，普通换行通常会被折叠为空格：

```yaml
description: >
  这是一段很长的说明，
  在 YAML 文件中分成多行书写，
  解析后通常会合并成一行。
```

它适合较长的自然语言描述。

### 末尾换行控制

```yaml
keep: |+
  line

strip: |-
  line
```

常见修饰符含义：

| 写法 | 含义 |
| --- | --- |
| `|` 或 `>` | 默认保留一个结尾换行 |
| `|-` 或 `>-` | 删除结尾换行 |
| `|+` 或 `>+` | 保留额外的结尾空行 |

### 显式缩进指示符

某些特殊文本可以指定内容缩进级别：

```yaml
text: |2
    保留在内容中的两个前导空格
```

日常配置通常不需要显式指定，优先让解析器根据内容自动判断。

## 七、锚点、别名与复用

### 锚点和别名

锚点使用 `&名称` 定义节点，别名使用 `*名称` 引用节点：

```yaml
defaults: &default_config
  timeout: 30
  retries: 3

development: *default_config
```

`development` 引用了 `default_config` 所标记的节点。

### 合并键 `<<`

许多常见解析器支持使用 `<<` 合并映射：

```yaml
defaults: &defaults
  timeout: 30
  retries: 3

production:
  <<: *defaults
  timeout: 60
```

`production` 继承默认值，并把 `timeout` 覆盖为 `60`。

> [!NOTE]
>
> `<<` 合并键源自早期 YAML 类型约定，并不是 YAML 1.2 核心规范中的普通通用语法。虽然很多工具支持它，但也有平台禁用或不实现。是否可用应以目标工具文档和实际解析结果为准。

### 不要把锚点当成变量系统

YAML 锚点是在 YAML 文档节点层面进行引用，并不等同于编程语言变量、模板表达式或环境变量。下面这类字符串插值不会由 YAML 自身完成：

```yaml
name: Kyle
message: "Hello ${name}"
```

`${name}` 是否被替换，完全取决于读取该 YAML 的具体应用程序。

## 八、文档边界与高级语法

### `---`：文档开始或分隔符

一个 YAML 流中可以包含多个文档：

```yaml
---
name: first
---
name: second
```

许多单配置文件工具只允许一个文档；Kubernetes 等场景则经常使用 `---` 把多个资源写在同一个文件中。

### `...`：显式文档结束

```yaml
---
name: example
...
```

`...` 通常可以省略，主要用于流式处理或需要明确标记文档结束的场景。

### 显式标签

YAML 支持标签来声明节点类型：

```yaml
value: !!str 123
```

这里要求把 `123` 解释为字符串。显式标签属于高级功能，具体工具不一定允许自定义标签，因此普通配置中更推荐直接写成：

```yaml
value: "123"
```

### 块风格与流式风格可以混用

```yaml
server:
  host: 127.0.0.1
  ports: [8000, 8001]
  labels: { env: dev, owner: Kyle }
```

混用在语法上可行，但应以可读性为准，不要为了减少行数牺牲清晰度。

## 九、读懂 `.cnb.yml`

### 从层级开始读

下面是一个简化的 CNB 流水线示例：

```yaml
main:
  push:
    - name: build-and-test
      docker:
        image: node:22
      stages:
        - name: install
          script: npm ci
        - name: test
          script: npm test
```

可以按数据结构拆解：

- `main` 是最外层映射中的一个键，通常表示匹配 `main` 分支
- `push` 是 `main` 下的键，表示一种触发事件
- `push` 的值是序列，因为下一层以 `-` 开头
- 序列中的元素是一个流水线对象
- `docker` 是映射，包含 `image`
- `stages` 是序列，包含多个阶段对象

对应的树形关系是：

```text
main
└── push
    └── build-and-test
        ├── docker.image = node:22
        └── stages
            ├── install → npm ci
            └── test → npm test
```

### 多行脚本

当一个阶段需要执行多条命令时，可以使用 `|`：

```yaml
main:
  push:
    - stages:
        - name: build
          script: |
            npm ci
            npm run build
            npm test
```

`script` 最终得到一个保留换行的字符串，CNB 再把它交给命令解释器执行。

### YAML 只负责描述，不负责定义平台语义

YAML 能说明 `main`、`push`、`stages` 之间的数据结构，但它不会规定这些字段是什么意思。字段名称、允许的取值、触发规则和运行方式由 CNB 平台定义。

因此排查 `.cnb.yml` 时要区分两类问题：

| 问题类型 | 典型现象 | 应检查什么 |
| --- | --- | --- |
| YAML 语法问题 | 缩进错误、解析失败、意外类型 | YAML 语法与解析结果 |
| CNB 配置问题 | 字段未知、事件不触发、镜像或命令失败 | CNB 配置文档与流水线日志 |

### 一个带环境变量的示例

```yaml
main:
  push:
    - name: build-image
      docker:
        image: node:22
      env:
        NODE_ENV: production
        APP_PORT: "8000"
      stages:
        - name: build
          script: |
            npm ci
            npm run build
```

`APP_PORT` 使用引号，是为了明确把它作为字符串交给应用程序，而不是依赖解析器的数字类型转换。

> [!NOTE]
>
> CNB 的完整字段、事件和运行规则可能随平台升级而变化。编写真实流水线时，应同时查看 CNB 当前官方文档，不能只根据通用 YAML 语法猜测字段。

## 十、常见工程场景

### Docker Compose

```yaml
services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"
    restart: unless-stopped
```

`"8080:80"` 建议加引号，因为它表达的是 Compose 的端口映射字符串，而不是普通数字。

### GitHub Actions

```yaml
name: CI

on:
  push:
    branches:
      - main

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: npm test
```

这里 `jobs` 是映射，`steps` 是序列。`uses` 和 `run` 的含义由 GitHub Actions 定义，而不是由 YAML 规定。

> [!NOTE]
>
> 一些仍采用 YAML 1.1 隐式类型规则的解析器可能把未加引号的 `on` 识别为布尔值。GitHub Actions 自己能够正确处理工作流语法，但当你用其他 YAML 库二次读取工作流文件时，需要关注解析器版本和 Schema。

### Kubernetes

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  APP_ENV: production
  APP_PORT: "8000"
```

Kubernetes 的 `ConfigMap.data` 值应按字符串理解，因此端口也常写成带引号的字符串。

### 普通应用配置

```yaml
application:
  name: demo
  server:
    host: 0.0.0.0
    port: 8000
  features:
    metrics: true
    tracing: false
```

同一个 YAML 文件被不同程序读取时，合法字段和类型要求可能完全不同。YAML 语法正确只是第一步，还要满足目标应用的配置 Schema。

## 十一、常见错误与排查方法

### 使用 Tab 缩进

错误：

```text
server:
→port: 8080
```

应改为空格缩进：

```yaml
server:
  port: 8080
```

编辑器中建议开启“显示空白字符”，这样可以直接看出 Tab 和空格。

### 同级缩进不一致

错误：

```yaml
server:
  host: 127.0.0.1
   port: 8080
```

`host` 和 `port` 属于同一级，必须左对齐。

### 列表短横线位置错误

错误：

```yaml
languages:
  - C
    - Python
```

正确：

```yaml
languages:
  - C
  - Python
```

### 忘记给特殊字符串加引号

```yaml
color: #2496ed
```

这里 `#2496ed` 会被当作注释，`color` 得到空值。应写成：

```yaml
color: "#2496ed"
```

### 把应用语法误认为 YAML 语法

```yaml
image: ${REGISTRY}/app:${TAG}
```

`${REGISTRY}` 和 `${TAG}` 不是 YAML 自带的变量语法。它们是否能展开，由 Docker Compose、CI 平台或你自己的程序决定。

### 只看文本，不看解析后的类型

下面两个值并不一定等价：

```yaml
port_number: 8000
port_text: "8000"
```

排查类型问题时，应查看程序实际读取到的数据类型，而不是只看文件表面长得是否相似。

### 先判断错误发生在哪一层

推荐按照下面的顺序排查：

- 文件能否被 YAML 解析器读取
- 解析后的层级和数据类型是否符合预期
- 字段是否满足目标平台的 Schema
- 环境变量、模板和表达式是否由平台正确展开
- 实际命令、镜像、权限和网络是否正常

这种分层方法可以避免把所有问题都归咎于“YAML 缩进”。

## 十二、验证与工具

### 使用 Python 验证 YAML

安装 PyYAML：

```bash
python -m pip install pyyaml
```

读取并打印解析结果：

```python
from pathlib import Path

import yaml

path = Path("config.yaml")
with path.open("r", encoding="utf-8") as file:
    data = yaml.safe_load(file)

print(data)
print(type(data))
```

使用 `safe_load` 可以避免构造任意 Python 对象，读取不受信任的 YAML 时不应随意使用危险加载方式。

### 使用命令行检查

安装 `yamllint` 后，可以检查常见语法和风格问题：

```bash
python -m pip install yamllint
yamllint .cnb.yml
```

Lint 通过不代表平台配置一定正确，因为它通常只检查 YAML 语法和约定，不理解所有 CNB、Compose 或 GitHub Actions 字段。

### 使用编辑器 Schema

现代编辑器可以根据 JSON Schema 或平台扩展提供：

- 字段补全
- 类型检查
- 缩进和语法诊断
- 未知字段提示
- 鼠标悬停文档

对大型工程配置，Schema 校验通常比单纯的 YAML 语法高亮更有价值。

### 不要在线粘贴敏感配置

在线 YAML 校验器使用方便，但配置文件可能包含令牌、仓库地址、内网域名和部署信息。含敏感数据时，应优先使用本地工具。

## 十三、速查表

### 常用写法

```yaml
# 注释
name: Kyle

# 嵌套映射
server:
  host: 127.0.0.1
  port: 8000

# 序列
languages:
  - C
  - Java

# 对象序列
users:
  - name: Kyle
    active: true

# 行内结构
ports: [80, 443]
labels: { env: dev, owner: Kyle }

# 多行字符串
script: |
  echo hello
  echo YAML

# 空值
value: null

# 文档分隔
---
```

### 编写检查清单

- 只用空格缩进，不用 Tab
- 同一层级严格左对齐
- `:` 和 `-` 后保留必要空格
- 特殊字符串、版本号、编号和日期按需要加引号
- 布尔值优先使用 `true` 与 `false`
- 不重复定义键
- 明确区分 YAML 语法与平台字段语义
- 使用解析器、Lint 和目标平台 Schema 多层验证
- 不把令牌、密码等秘密直接提交到仓库

## 十四、参考资料

- [YAML 官方网站](https://yaml.org/)
- [YAML 1.2.2 规范](https://yaml.org/spec/1.2.2/)
- [腾讯云 CNB 构建语法](https://docs.cnb.cool/zh/build/grammar.html)
- [Docker Compose 文件参考](https://docs.docker.com/reference/compose-file/)
- [GitHub Actions 工作流语法](https://docs.github.com/actions/writing-workflows/workflow-syntax-for-github-actions)

YAML 本身并不复杂，真正容易出错的是“缩进层级、隐式类型和平台语义”三者叠加。先把文件当作数据树阅读，再结合目标平台的 Schema 检查，通常比逐字符猜错更高效。