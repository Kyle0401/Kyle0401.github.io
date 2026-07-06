# Docker学习记录

## 一、腾讯云 CNB 环境

微信登录 → 创建组织 → 创建仓库 → 点击“云原生开发”一键初始化。

---

## 二、Docker 相关命令

### 1. `docker --version`

查看 Docker 版本。

### 2. `docker pull library/hello-world`

拉取镜像。镜像引用的一般形式为：

```text
[registry-host[:port]/][namespace/]repository[:tag]
```

`library/hello-world` 对应 Docker Hub 的官方镜像命名空间。`library` 是 Docker Hub 为官方镜像保留的特殊命名空间，并不是普通用户组织。未指定 registry 时默认使用 Docker Hub（`docker.io`），未指定 namespace 时默认使用 `library`，未指定 tag 时默认使用 `latest`。`latest` 只是默认标签，并不保证它一定是时间上最新的版本。

### 3. `docker images`

查看本地镜像。

### 4. `docker run library/hello-world`

基于镜像创建并运行容器。

### 5. `docker ps -a`

`docker ps` 默认列出**正在运行的容器**；使用 `docker ps -a` 可以同时查看已停止的容器。`ps` 沿用 Unix 命令名，通常解释为 **process status**（进程状态）。

### 6. `docker run -it ubuntu bash`

运行 Ubuntu 容器并进入 `bash`。

> [!NOTE]
>
> Docker 里 `-t` 的长选项是：
>
> ```bash
> --tty
> ```
>
> 其中 **TTY** 原本指 *Teletypewriter*，在现代 Unix/Linux 语境中通常泛指**终端设备**。
>
> 在 Docker 中，`-t` 的作用是：
>
> > 为容器分配一个**伪终端（pseudo-TTY）**。
>
> 例如：
>
> ```bash
> docker run -it ubuntu bash
> ```
>
> 这里：
>
> - `-i`：`--interactive`，保持标准输入开启；
> - `-t`：`--tty`，分配伪终端。
>
> 二者常配合使用，才能让容器中的 `bash` 像本机终端一样可交互使用、正确显示提示符和部分命令的格式。Docker 官方对 `-t, --tty` 的定义就是“Allocate a pseudo-TTY”。

```
➜  /workspace git:(main) docker run -it ubuntu bash
Unable to find image 'ubuntu:latest' locally
latest: Pulling from library/ubuntu
d1f56e4c7f2f: Pull complete
81e2f2053c8f: Pull complete
Digest: sha256:53958ec7b67c2c9355df922dd08dbf0360611f8c3cdb656875e81873db9ffdba
Status: Downloaded newer image for ubuntu:latest
root@8aecb273d78d:/# ls
bin  boot  dev  etc  home  lib  lib64  media  mnt  opt  proc  root  run  sbin  srv  sys  tmp  usr  var
root@8aecb273d78d:/# exit
exit
➜  /workspace git:(main)
```

退出 `bash` 后，容器主进程结束，容器也会停止。

#### 后台运行容器

```
➜  /workspace git:(main) docker run -dit ubuntu bash
7f2ce79b0dc9bf7f5eb703ff2d919db2d435e9808db524cb360aa870b797e3ad
➜  /workspace git:(main) docker ps
CONTAINER ID   IMAGE     COMMAND       CREATED         STATUS         PORTS     NAMES
7f2ce79b0dc9   ubuntu    "/bin/bash"   5 seconds ago   Up 5 seconds             adoring_payne
➜  /workspace git:(main) docker ps -a
CONTAINER ID   IMAGE         COMMAND       CREATED          STATUS                      PORTS     NAMES
7f2ce79b0dc9   ubuntu        "/bin/bash"   13 seconds ago   Up 12 seconds                         adoring_payne
8aecb273d78d   ubuntu        "bash"        7 minutes ago    Exited (0) 4 minutes ago              laughing_cohen
7a04315e84e5   hello-world   "/hello"      26 minutes ago   Exited (0) 26 minutes ago             tender_hodgkin
➜  /workspace git:(main)
```

`-d` 即 `--detach`，表示让容器在后台运行。容器是否持续运行取决于其主进程（PID 1）是否仍在运行；实际服务通常应以前台方式启动 Web 服务、数据库或其他长期运行进程。

#### 进入后台运行的容器

可以通过 `docker exec -it 7f2ce79b0dc9 bash` 进入容器；`7f2ce79b0dc9` 是刚才后台运行的 Ubuntu 容器 ID。

```
➜  /workspace git:(main) docker exec -it 7f2ce79b0dc9 bash
root@7f2ce79b0dc9:/# exit
exit
➜  /workspace git:(main) docker ps
CONTAINER ID   IMAGE     COMMAND       CREATED         STATUS         PORTS     NAMES
7f2ce79b0dc9   ubuntu    "/bin/bash"   4 minutes ago   Up 4 minutes             adoring_payne
```

`exit` 只会退出本次通过 `exec` 启动的 `bash`，不会停止原容器的主进程。

#### 停止容器

使用 `docker stop 7f2ce79b0dc9`，即 `docker stop` 加容器 ID。

```
➜  /workspace git:(main) docker stop 7f2ce79b0dc9

7f2ce79b0dc9
➜  /workspace git:(main)
➜  /workspace git:(main) docker ps
CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES
➜  /workspace git:(main) docker ps -a
CONTAINER ID   IMAGE         COMMAND       CREATED          STATUS                        PORTS     NAMES
7f2ce79b0dc9   ubuntu        "/bin/bash"   7 minutes ago    Exited (137) 16 seconds ago             adoring_payne
8aecb273d78d   ubuntu        "bash"        14 minutes ago   Exited (0) 11 minutes ago               laughing_cohen
7a04315e84e5   hello-world   "/hello"      34 minutes ago   Exited (0) 34 minutes ago               tender_hodgkin
```

### 7. `docker rm <container-id> ...`

删除已停止的容器，而不只是隐藏 `docker ps -a` 中的记录。运行中的容器需要先停止，或在明确了解影响后使用 `docker rm -f`。

```
➜  /workspace git:(main) docker rm 7f2ce79b0dc9
7f2ce79b0dc9
➜  /workspace git:(main) docker ps -a
CONTAINER ID   IMAGE         COMMAND    CREATED          STATUS                      PORTS     NAMES
8aecb273d78d   ubuntu        "bash"     15 minutes ago   Exited (0) 12 minutes ago             laughing_cohen
7a04315e84e5   hello-world   "/hello"   34 minutes ago   Exited (0) 34 minutes ago             tender_hodgkin
➜  /workspace git:(main) docker rm 8aecb273d78d 7a04315e84e5
8aecb273d78d
7a04315e84e5
➜  /workspace git:(main) docker ps -a
CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES
```

### 8. `docker rmi <image-id> <image-name> ...`

删除本地镜像。若仍有容器依赖该镜像，需要先删除相关容器，或确认强制删除的影响。

```
➜  /workspace git:(main) docker images
REPOSITORY    TAG       IMAGE ID       CREATED        SIZE
ubuntu        latest    53958ec7b67c   3 weeks ago    155MB
hello-world   latest    96498ffd522e   3 months ago   16.3kB
➜  /workspace git:(main) docker rmi 53958ec7b67c
Untagged: ubuntu:latest
Deleted: sha256:53958ec7b67c2c9355df922dd08dbf0360611f8c3cdb656875e81873db9ffdba
➜  /workspace git:(main) docker images
REPOSITORY    TAG       IMAGE ID       CREATED        SIZE
hello-world   latest    96498ffd522e   3 months ago   16.3kB
➜  /workspace git:(main) docker rmi 96498ffd522e
Untagged: hello-world:latest
Deleted: sha256:96498ffd522e70807ab6384a5c0485a79b9c7c08ca79ba08623edcad1054e62d
➜  /workspace git:(main) docker images
REPOSITORY   TAG       IMAGE ID   CREATED   SIZE
```

### 9. `docker logs <container-id>`

查看指定容器写入标准输出（stdout）和标准错误（stderr）的日志。例如：

```
➜  /workspace git:(main) docker logs 00a913763c7e
[2026-07-05T19:05:08.527Z] info  code-server 4.127.0 1e6ed874e3138141a5636f6e0dbe8570aa6cd001
[2026-07-05T19:05:08.528Z] info  Using user-data-dir /root/.local/share/code-server
[2026-07-05T19:05:08.535Z] info  Using config file /root/.config/code-server/config.yaml
[2026-07-05T19:05:08.535Z] info  HTTP server listening on http://0.0.0.0:8000/
[2026-07-05T19:05:08.535Z] info    - Authentication is disabled
[2026-07-05T19:05:08.535Z] info    - Not serving HTTPS
[2026-07-05T19:05:08.535Z] info  Session server listening on /root/.local/share/code-server/code-server-ipc.sock
```

---

## 三、制作自己的 Docker 镜像

### 1. 创建带端口映射的 Ubuntu 容器

```
➜  /workspace git:(main) docker run -it -p 8000:8000 ubuntu bash
Unable to find image 'ubuntu:latest' locally
latest: Pulling from library/ubuntu
2c1ce1d0a589: Download complete
a9be9fd915e9: Download complete
Digest: sha256:b7f48194d4d8b763a478a621cdc81c27be222ba2206ca3ca6bc42b49685f3d9e
Status: Downloaded newer image for ubuntu:latest
```

`-p` 用于发布容器端口，使宿主机能够访问容器内的网络服务。

> [!NOTE]
>
> `-p 8000:8000` 是 **端口映射（port publishing）**，格式为：
>
> ```
> -p 宿主机端口:容器端口
> ```
>
> 因此：
>
> ```
> -p 8000:8000
> ```
>
> 表示把：
>
> - 你电脑上的 `8000` 端口
> - 映射到 Docker 容器内部的 `8000` 端口
>
> 假设容器里启动了一个监听 `8000` 端口的 Web 服务，例如：
>
> ```
> python3 -m http.server 8000
> ```
>
> 那么你可以在宿主机浏览器访问：
>
> ```
> http://localhost:8000
> ```
>
> 请求会被 Docker 转发到容器里的 `8000` 端口。
>
> 如果没有写宿主机 IP，`-p 8000:8000` 默认绑定宿主机的所有网络接口，外部网络可能也能访问该端口。仅需本机访问时可写成 `-p 127.0.0.1:8000:8000`；在 CNB 这类受控云开发环境中，则根据平台的端口访问控制决定绑定方式。

### 2. 安装 `curl` 与 code-server

接下来执行两个命令：

```bash
apt-get update
apt-get install -y curl ca-certificates
```

使用 `curl` 进行后续 code-server 安装。`curl` 是一个**命令行网络数据传输工具**，通常用于通过 URL 下载内容、上传数据或测试网络请求。

接下来安装 code-server，对应命令可从官方文档或 GitHub 仓库获取：

[coder/code-server: VS Code in the browser](https://github.com/coder/code-server)

可先用 `--dry-run` 查看安装脚本将执行的操作，再正式安装：

```bash
curl -fsSL https://code-server.dev/install.sh | sh -s -- --dry-run
curl -fsSL https://code-server.dev/install.sh | sh
```

然后再做以下操作：

```bash
root@ee5dbce07d54:/# code-server
[2026-07-02T17:20:39.840Z] info  Wrote default config file to /root/.config/code-server/config.yaml
[2026-07-02T17:20:39.947Z] info  code-server 4.127.0 1e6ed874e3138141a5636f6e0dbe8570aa6cd001
[2026-07-02T17:20:39.948Z] info  Using user-data-dir /root/.local/share/code-server
[2026-07-02T17:20:39.955Z] info  Using config file /root/.config/code-server/config.yaml
[2026-07-02T17:20:39.955Z] info  HTTP server listening on http://127.0.0.1:8080/
[2026-07-02T17:20:39.955Z] info    - Authentication is enabled
[2026-07-02T17:20:39.955Z] info      - Using password from /root/.config/code-server/config.yaml
[2026-07-02T17:20:39.955Z] info    - Not serving HTTPS
[2026-07-02T17:20:39.955Z] info  Session server listening on /root/.local/share/code-server/code-server-ipc.sock

^Croot@ee5dbce07d54:/#
root@ee5dbce07d54:/# code-server --bind-addr=0.0.0.0:8000 --auth=none
[2026-07-02T17:23:00.066Z] info  code-server 4.127.0 1e6ed874e3138141a5636f6e0dbe8570aa6cd001
[2026-07-02T17:23:00.067Z] info  Using user-data-dir /root/.local/share/code-server
[2026-07-02T17:23:00.075Z] info  Using config file /root/.config/code-server/config.yaml
[2026-07-02T17:23:00.075Z] info  HTTP server listening on http://0.0.0.0:8000/
[2026-07-02T17:23:00.075Z] info    - Authentication is disabled
[2026-07-02T17:23:00.075Z] info    - Not serving HTTPS
[2026-07-02T17:23:00.075Z] info  Session server listening on /root/.local/share/code-server/code-server-ipc.sock
[17:41:50]
```

`--bind-addr` 用于指定监听地址与端口，以便从容器外部访问。

其中：

```
--bind-addr=0.0.0.0:8000
```

是让 `code-server` **监听网络地址 `0.0.0.0` 的 8000 端口**。

| 部分      | 含义                                 |
| --------- | ------------------------------------ |
| `0.0.0.0` | 监听当前机器的**所有 IPv4 网络接口** |
| `8000`    | code-server 对外提供 Web 服务的端口  |

也就是说，code-server 不仅能通过本机访问，还会接收来自网卡、局域网或 Docker 网络的请求。

`--auth=none` 表示禁用认证。

> [!NOTE]
> **安全提示：**不应把关闭认证的 code-server 直接暴露到公网，否则他人可能通过内置终端控制运行环境。这里只适用于 CNB 已提供访问控制的临时开发环境；其他场景应保留认证，并配合 HTTPS、反向代理或受限网络。

之后可通过 CNB 的 **PORTS** 面板提供的地址访问浏览器中的 code-server。该地址可能随工作区变化，因此不在笔记中保存临时 URL。

![通过 CNB 端口访问 code-server 的浏览器界面](assets/image-20260703022125604.png)

以上步骤仍然接近“打开一台虚拟机后手动安装软件”，不利于重复执行和版本管理。下面将环境固化为镜像。

一共有两种方法：

### 3. 通过交互式容器打包镜像：`docker commit`

```text
docker commit <container-id> [image-name[:tag]]
docker run <image> → container
```

`docker commit` 会把容器当前的文件系统状态创建为新镜像；它适合学习和临时快照，但难以复现、审查与自动化。正式项目应优先使用 Dockerfile。

```
➜  /workspace git:(main) docker ps
CONTAINER ID   IMAGE     COMMAND   CREATED          STATUS          PORTS                                         NAMES
7bd8b92526c3   ubuntu    "bash"    36 minutes ago   Up 36 minutes   0.0.0.0:8000->8000/tcp, [::]:8000->8000/tcp   focused_brahmagupta
➜  /workspace git:(main) docker commit 7bd8b92526c3
sha256:97f491c9e63c5f73fd3913372e404ccd7f7481003edd9297d7a628e49737f136
➜  /workspace git:(main) docker images
REPOSITORY   TAG       IMAGE ID       CREATED          SIZE
<none>       <none>    97f491c9e63c   17 minutes ago   1.48GB
ubuntu       latest    b7f48194d4d8   8 days ago       155MB
➜  /workspace git:(main) docker run -it -p 8000:8000 97f491c9e63c code-server --bind-addr=0.0.0.0:8000 --auth=none
[2026-07-05T16:31:13.386Z] info  code-server 4.127.0 1e6ed874e3138141a5636f6e0dbe8570aa6cd001
[2026-07-05T16:31:13.386Z] info  Using user-data-dir /root/.local/share/code-server
[2026-07-05T16:31:13.394Z] info  Using config file /root/.config/code-server/config.yaml
[2026-07-05T16:31:13.394Z] info  HTTP server listening on http://0.0.0.0:8000/
[2026-07-05T16:31:13.394Z] info    - Authentication is disabled
[2026-07-05T16:31:13.394Z] info    - Not serving HTTPS
[2026-07-05T16:31:13.394Z] info  Session server listening on /root/.local/share/code-server/code-server-ipc.sock
[16:31:18]
```

前台运行时，退出终端会结束 code-server。若要让它作为容器主进程在后台运行，可以执行：

```
➜  /workspace git:(main) docker run -d -p 8000:8000 --entrypoint code-server 97f491c9e63c --bind-addr=0.0.0.0:8000 --auth=none
00a913763c7e5f5d80297bc6949d5d3d0840c57abb3575d3ff34e6838d13e029
➜  /workspace git:(main) docker ps
CONTAINER ID   IMAGE          COMMAND                   CREATED          STATUS          PORTS                                         NAMES
00a913763c7e   97f491c9e63c   "code-server --bind-…"   27 seconds ago   Up 26 seconds   0.0.0.0:8000->8000/tcp, [::]:8000->8000/tcp   vigilant_cannon
➜  /workspace git:(main) docker logs 00a913763c7e
[2026-07-05T19:05:08.527Z] info  code-server 4.127.0 1e6ed874e3138141a5636f6e0dbe8570aa6cd001
[2026-07-05T19:05:08.528Z] info  Using user-data-dir /root/.local/share/code-server
[2026-07-05T19:05:08.535Z] info  Using config file /root/.config/code-server/config.yaml
[2026-07-05T19:05:08.535Z] info  HTTP server listening on http://0.0.0.0:8000/
[2026-07-05T19:05:08.535Z] info    - Authentication is disabled
[2026-07-05T19:05:08.535Z] info    - Not serving HTTPS
[2026-07-05T19:05:08.535Z] info  Session server listening on /root/.local/share/code-server/code-server-ipc.sock
```

`--entrypoint code-server` 用于覆盖镜像默认入口程序，使容器直接以 code-server 启动；`-d` 用于后台运行。这里无需 `-it`，因为服务不需要交互式终端。

### 4. 通过 Dockerfile 构建镜像

首先在代码仓库中创建 `Dockerfile`：

![在代码仓库中创建 Dockerfile](assets/image-20260706234000076.png)

把前面的手动操作转换成 Dockerfile 指令：

```dockerfile
FROM ubuntu:latest # 使用 ubuntu:latest 镜像作为基础镜像

RUN apt update && apt install -y curl

RUN curl -fsSL https://code-server.dev/install.sh | sh
```

这样就能得到一个最简单的 Dockerfile。然后执行 `docker build`：

```bash
docker build -t docker.cnb.cool/kyle-cnb/docker-learning:v1.0.0 .
```

其中 `-t` 用于设置镜像名称和版本标签，末尾的 `.` 表示使用当前目录作为构建上下文。

后续若要预装 code-server 扩展，只需继续迭代 Dockerfile 并更新镜像版本。例如：

```dockerfile
RUN code-server --install-extension golang.go
```

![在 VS Code 扩展详情中查看 Go 扩展 Identifier](assets/image-20260707020711503.png)

扩展命令使用详情页 **Identifier** 字段中的唯一标识，这里是 `golang.go`。

**将 Dockerfile 保存到 CNB 代码仓库**

```bash
git add Dockerfile
git commit -m "feat: add Dockerfile"
git push --set-upstream origin main
```

`git push --set-upstream origin main` 会把本地 `main` 推送到名为 `origin` 的远程仓库，并建立本地 `main` 与 `origin/main` 的跟踪关系。`origin` 只是 Git 常用的默认远程名称，实际可以指向 CNB、GitHub、GitLab 或其他 Git 服务，并不特指 GitHub。

建立跟踪关系后，后续通常只需执行 `git push`。如果 Git 已配置：

```bash
git config --global push.autoSetupRemote true
```

那么首次执行普通 `git push` 时，也可能自动建立上游分支。可用下面的命令检查该配置：

```bash
git config --get push.autoSetupRemote
```

---

## 四、将镜像推送至制品库（镜像仓库）并使用

Docker 官方镜像仓库是 [Docker Hub Container Image Library](https://hub.docker.com/)，可以上传自己的 Docker 镜像，也可以下载其他镜像。

### 第一步：登录镜像仓库

登录 Docker Hub：

```bash
docker login
```

登录私有仓库时，以 CNB 的镜像仓库为例，可以在制品页面找到 Docker 镜像制品：

![CNB 制品页面中的 Docker 镜像制品](assets/image-20260706031930791.png)

在制品 tag 的“使用指引”中，选择“本地命令行推送”可获得登录、构建、推送和拉取命令：

![CNB Docker 制品的本地命令行推送指引](assets/image-20260706032048008.png)

CNB 使用访问令牌进行鉴权。可在个人设置的“访问令牌”中创建令牌：

![CNB 个人设置中的访问令牌创建界面](assets/image-20260706032302171.png)

创建令牌后，可将 Token 通过标准输入传给 Docker，避免它出现在命令历史中：

```bash
read -rsp "CNB Token: " CNB_TOKEN; echo
printf '%s' "$CNB_TOKEN" | docker login docker.cnb.cool \
  --username <cnb-username> --password-stdin
unset CNB_TOKEN
```

![CNB 访问令牌创建成功页面](assets/image-20260706032406427-redacted.png)

公开笔记和截图中不要保留真实 Token。Docker 可能把登录凭据写入用户目录下的配置文件；在非 Docker Desktop 环境中应配置 credential helper，使用完也可执行 `docker logout docker.cnb.cool`。

### 第二步：为镜像添加仓库标签

```text
➜  /workspace git:(main) docker tag 97f491c9e63c docker.cnb.cool/kyle-cnb/docker-learning:latest
➜  /workspace git:(main) docker images
REPOSITORY                                 TAG       IMAGE ID       CREATED       SIZE
docker.cnb.cool/kyle-cnb/docker-learning   latest    97f491c9e63c   4 hours ago   1.48GB
ubuntu                                     latest    b7f48194d4d8   8 days ago    155MB
```

`docker tag` 不会重命名或复制镜像，而是为同一个镜像 ID 新增一个指向目标仓库的引用。若在 [`docker build` 时](#section-20)已经使用完整仓库名和版本标签（例如 `:v1.0.0`），则不需要再次执行 `docker tag`。

### 第三步：上传镜像

```text
➜  /workspace git:(main) docker push docker.cnb.cool/kyle-cnb/docker-learning:latest
The push refers to repository [docker.cnb.cool/kyle-cnb/docker-learning]
18582ffa9453: Pushed
a9be9fd915e9: Pushed
2c1ce1d0a589: Pushed
latest: digest: sha256:97f491c9e63c5f73fd3913372e404ccd7f7481003edd9297d7a628e49737f136 size: 1172
```

建议显式写出标签，避免误以为 `latest` 自动代表最新版本。Dockerfile 构建出的版本也可以单独推送：

```bash
docker push docker.cnb.cool/kyle-cnb/docker-learning:v1.0.0
```

上传完成后，可以在 CNB 的“制品”标签中看到镜像：

![CNB 制品列表中的 docker-learning 镜像](assets/image-20260706033226226.png)

镜像详情页会展示标签、摘要、大小与镜像层信息：

![CNB docker-learning 镜像详情页](assets/image-20260706033939536.png)

### 第四步：使用镜像

```bash
docker run -d --name code-server -p 8000:8000 \
  --entrypoint code-server \
  docker.cnb.cool/kyle-cnb/docker-learning:v1.0.0 \
  --bind-addr=0.0.0.0:8000 --auth=none
```

如果本地没有该镜像，`docker run` 会先从指定仓库拉取镜像，再创建并启动容器。这个简单 Dockerfile 没有定义默认启动命令，因此仍需通过 `--entrypoint code-server` 显式指定入口。若要使用前面通过 `docker commit` 生成的镜像，可把标签改为 `latest`。
