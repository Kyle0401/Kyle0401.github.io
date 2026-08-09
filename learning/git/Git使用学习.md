# Git 使用学习

## 一、Git 基础

### 1、查看当前目录的 Git 状态

#### 用途

`git status` 用于查看工作树状态，包括：

- 暂存区相对 `HEAD` 的变化，也就是下一次普通提交会包含的内容；
- 工作区相对暂存区的变化，也就是尚未暂存的内容；
- 未被 Git 跟踪且未被忽略的文件。

#### 命令

```bash
git status
```

#### 示例输出：当前目录不是 Git 仓库

```text
fatal: not a git repository (or any of the parent directories): .git
```

这表示当前目录及其父目录中都没有找到 `.git`。可以先切换到已有仓库，或者在准备纳入版本控制的目录中执行 `git init`。

> [!IMPORTANT]
> 终端中的红色、绿色只是显示主题，不是 Git 状态的固定定义。判断状态时应看 `Changes to be committed`、`Changes not staged for commit` 和 `Untracked files` 等文字。

### 2、初始化 Git 仓库

#### 用途

`git init` 会在当前目录创建 `.git`，把目录初始化为 Git 仓库。它只创建仓库元数据和一个尚无提交的初始分支，不会自动生成第一次提交。

#### 截图中的命令

```bash
git init
```

截图环境使用 `master` 作为默认初始分支，因此出现了下面的提示：

```text
hint: Using 'master' as the name for the initial branch. This default branch name
hint: is subject to change. To configure the initial branch name to use in all
hint: of your new repositories, which will suppress this warning, call:
hint:
hint:   git config --global init.defaultBranch <name>
hint:
hint: Names commonly chosen instead of 'master' are 'main', 'trunk' and
hint: 'development'. The just-created branch can be renamed via this command:
hint:
hint:   git branch -m <name>
Initialized empty Git repository in <path>/.git/
```

为了不依赖本机配置，可以明确指定初始分支名：

```bash
git init -b main
```

初始化后再次检查状态：

```bash
git status
```

```text
On branch master

No commits yet

Untracked files:
  (use "git add <file>..." to include in what will be committed)
        main
        main.cpp

nothing added to commit but untracked files present (use "git add" to track)
```

这里的 `main` 和 `main.cpp` 都是未跟踪文件。若 `main` 是由编译产生的可执行文件，通常应通过 `.gitignore` 排除，而不是加入版本库。

### 3、将更改加入暂存区

#### 用途

暂存区也叫 index，用来准备下一次提交的内容。`git add <path>` 会把指定路径**当前时刻的内容**写入暂存区；如果随后又修改该文件，需要再次执行 `git add` 才能把新修改纳入下一次提交。

#### 暂存一个文件

```bash
git add main.cpp
git status
```

```text
On branch master

No commits yet

Changes to be committed:
  (use "git rm --cached <file>..." to unstage)
        new file:   main.cpp

Untracked files:
  (use "git add <file>..." to include in what will be committed)
        main
```

`main.cpp` 已进入暂存区，未执行 `git add main`，所以 `main` 仍然未跟踪。已有提交后，撤销暂存通常可使用：

```bash
git restore --staged main.cpp
```

#### 只暂存文件的一部分

命令行可以按变更块（hunk）交互式选择：

```bash
git add -p main.cpp
```

VS Code 也可以对选中的行或范围执行 **Stage Selected Ranges**。截图中可见的局部差异如下；上下文被裁切的部分用省略号表示：

```diff
 void calculate(const std::string& op, const Numbers numbers) {
     if (op == "+") {
-        std::cout << sum(numbers.size) << "\n";
+        std::cout << sum(numbers) << "\n";
     } else if (op == "-") {
-        std::cout << numbers[0] - numbers[1] << "\n";
+        std::cout << numbers.data[0] - numbers.data[1] << "\n";
     }
     ...
 }
```

同一文件的一部分已经暂存，之后又产生未暂存修改时，`git status` 会在两个区域同时列出这个文件：

```text
On branch master

Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
        modified:   main.cpp

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
        modified:   main.cpp

Untracked files:
  (use "git add <file>..." to include in what will be committed)
        main
```

#### 查看尚未暂存的修改

```bash
git diff
```

截图中可见的输出片段：

```diff
diff --git a/main.cpp b/main.cpp
index <old>..<new> 100644
--- a/main.cpp
+++ b/main.cpp
@@ -41,6 +41,10 @@ void calculate(const std::string& op, const Numbers numbers) {
 int main() {
+    // >>> + 1 1
+    // 2
+    // >>> + 1 2 3
+    // 6
     while (true) {
         std::size_t size = 3;
         double data[size];
         ...
```

`git diff` 默认比较**工作区与暂存区**，显示还能继续 `git add` 的修改。它默认不会展示未跟踪文件的内容。

#### 查看已经暂存的修改

正确命令是 `--staged`，有两个连字符：

```bash
git diff --staged
```

`--staged` 与 `--cached` 等价。截图中可见的已暂存差异如下：

```diff
diff --git a/main.cpp b/main.cpp
index <old>..<new> 100644
--- a/main.cpp
+++ b/main.cpp
@@ -1,30 +1,40 @@
 #include <iostream>
+#include <sstream>
+#include <string>

-void input(std::string& op, double* numbers, std::size_t size) {
+struct Numbers {
+    double* data;
+    std::size_t size;
+};
+
+void input(std::string& op, Numbers numbers) {
-    std::cout << "Operation: ";
+    std::cout << ">>> ";
-    std::cin >> op;
+    std::string line;
+    std::getline(std::cin, line);
+    std::stringstream ss(line);
+    ss >> op;

-    for (std::size_t i = 0; i < size; ++i) {
-        std::cout << "numbers[" << i << "]: ";
-        std::cin >> numbers[i];
-    }
+    for (std::size_t i = 0; i < numbers.size && ss >> numbers.data[i]; ++i) {
+        ...
+    }
 }
```

`git diff --staged` 比较**暂存区与 `HEAD`**，也就是普通 `git commit` 将要记录的变化。首次提交前还没有 `HEAD`，此时它会展示全部已暂存内容。

### 4、提交暂存区中的内容

#### 用途

`git commit` 使用暂存区当前快照创建新提交。`-m` 是 `--message` 的短写，用于直接提供提交说明。

#### 命令

```bash
git commit -m "加入了简单的输入输出和加减法功能"
```

#### 示例输出

```text
[master (root-commit) <commit>] 加入了简单的输入输出和加减法功能
 1 file changed, 35 insertions(+)
 create mode 100644 main.cpp
```

提交后再次检查：

```bash
git status
```

```text
On branch master

Untracked files:
  (use "git add <file>..." to include in what will be committed)
        main

nothing added to commit but untracked files present (use "git add" to track)
```

这次提交只记录了已暂存的 `main.cpp`，未跟踪的 `main` 没有被提交。

> [!NOTE]
> Git 可以提交文本或二进制文件。源码、配置、文档通常应纳入版本控制；构建产物、缓存和临时文件通常应通过 `.gitignore` 排除。锁文件、生成代码或二进制资源是否提交，应遵循项目规范，而不是简单按“文本/非文本”划分。

### 5、查看提交历史

#### 用途

不带参数的 `git log` 显示从当前 `HEAD` 可达的提交历史。输出通常包含提交标识、作者、日期和提交说明。

#### 命令

```bash
git log
```

#### 示例输出

截图中的作者、邮箱和提交标识已匿名化：

```text
commit <commit-5> (HEAD -> master)
Author: Example User <user@example.com>
Date:   Thu Jan 8 15:03:33 2026 +0800

    使用 `std::vector` 替换 `Vector`

commit <commit-4>
Author: Example User <user@example.com>
Date:   Thu Jan 8 14:48:07 2026 +0800

    为 `Vector` 加入了移动构造

commit <commit-3>
Author: Example User <user@example.com>
Date:   Thu Jan 8 14:38:26 2026 +0800

    为 `Vector` 加入了拷贝构造和赋值的定义

commit <commit-2>
Author: Example User <user@example.com>
Date:   Thu Jan 8 14:17:12 2026 +0800

    为 `Vector` 引入了扩容

commit <commit-1>
Author: Example User <user@example.com>
Date:   Wed Jan 7 15:12:14 2026 +0800

    ...
```

需要紧凑地查看分支图时，可以使用：

```bash
git log --oneline --graph --decorate --all
```

`--all` 会让日志遍历所有引用，而不仅限于当前 `HEAD` 可达的历史。

### 6、查看某个历史提交

#### 截图中的命令

```bash
git checkout <commit>
```

#### 示例输出

```text
Note: switching to '<commit>'.

You are in 'detached HEAD' state. You can look around, make experimental
changes and commit them, and you can discard any commits you make in this
state without impacting any branches by switching back to a branch.

If you want to create a new branch to retain commits you create, you may
do so (now or later) by using -c with the switch command. Example:

  git switch -c <new-branch-name>

Or undo this operation with:

  git switch -

Turn off this advice by setting config variable advice.detachedHead to false

HEAD is now at <commit> 为 `Vector` 加入了移动构造
```

这里不是让 `master` 分支“回到旧版本”，而是让 `HEAD` 直接指向该提交，进入 **detached HEAD**。分支指针仍停留在原位置。

临时查看某个提交时，现代写法更明确：

```bash
git switch --detach <commit>
```

查看完毕后返回上一次检出的位置（本例为原分支）：

```bash
git switch -
```

如果在 detached HEAD 中产生了需要保留的提交，应在离开前创建分支：

```bash
git switch -c <new-branch-name>
```

> [!WARNING]
> `git switch --detach` 适合查看快照或做可丢弃实验。撤销已经发布的历史通常应考虑 `git revert`；移动本地分支历史涉及 `git reset`，语义不同，不应与“查看旧版本”混为一谈。

### 7、查看和切换分支

#### 查看本地分支

```bash
git branch
```

截图显示当时处于 detached HEAD：

```text
* (HEAD detached at <commit>)
  master
```

`git branch` 不带参数只列出本地分支，`*` 标记当前所在位置；它本身不会切换分支。查看远程跟踪分支可使用 `git branch -r`，同时查看本地和远程跟踪分支可使用 `git branch -a`。

#### 截图中的切换命令

```bash
git checkout master
```

```text
M       vector.h
Previous HEAD position was <commit> 为 `Vector` 加入了移动构造
Switched to branch 'master'
```

第一行表示 `vector.h` 在切换时仍有本地修改。Git 在切换会覆盖本地修改时通常会拒绝操作，但不能因此忽略工作区状态；切换前应先检查 `git status`。

现代 Git 建议使用职责更清晰的命令：

```bash
git switch master
```

创建并切换到新分支：

```bash
git switch -c feature/example
```

### 8、临时保存工作进度：`git stash`

#### 用途

`git stash`（等价于 `git stash push`）会记录当前工作区和暂存区的本地修改，并把相应的已跟踪文件恢复到 `HEAD` 状态。它适合临时清理工作区，以便切换任务、拉取更新或验证其他状态。

#### 截图中的命令

```bash
git stash
```

```text
Saved working directory and index state WIP on master: <commit> 引入了 `capacity` 和 `push_back`
```

> [!IMPORTANT]
> 执行 `git stash` **不要求先 `git add`**。默认情况下，已跟踪文件的已暂存和未暂存修改都会被保存；未跟踪文件和被忽略文件默认不会被保存。

查看已有的贮藏记录：

```bash
git stash list
```

恢复最新记录，并在成功后将其从 stash 列表删除：

```bash
git stash pop
```

如果应用时发生冲突，Git 会保留该 stash，需要手动解决冲突后再决定何时删除。若希望应用修改但保留 stash 记录，使用：

```bash
git stash apply
```

尝试同时恢复原来的暂存状态，可以增加 `--index`：

```bash
git stash pop --index
```

同时保存未跟踪的新文件：

```bash
git stash push --include-untracked
```

短写形式为：

```bash
git stash push -u
```

若还需要包含被 `.gitignore` 忽略的文件：

```bash
git stash push --all
```

`--all` 的短写是 `-a`。使用它时要注意，缓存和大型构建产物也可能被纳入 stash。

## 二、参考资料

### 9、官方 Git 文档

- [`git status`](https://git-scm.com/docs/git-status)：查看工作树状态。
- [`git init`](https://git-scm.com/docs/git-init)：初始化 Git 仓库。
- [`git add`](https://git-scm.com/docs/git-add)：将文件内容加入暂存区。
- [`git diff`](https://git-scm.com/docs/git-diff)：比较工作区、暂存区和提交。
- [`git commit`](https://git-scm.com/docs/git-commit)：创建提交。
- [`git log`](https://git-scm.com/docs/git-log)：查看提交历史。
- [`git switch`](https://git-scm.com/docs/git-switch)：切换分支或进入 detached HEAD。
- [`git checkout`](https://git-scm.com/docs/git-checkout)：检出分支、提交或路径；本笔记主要用于解释截图中的旧式命令。
- [`git branch`](https://git-scm.com/docs/git-branch)：列出和管理分支。
- [`git stash`](https://git-scm.com/docs/git-stash)：临时保存工作进度。
