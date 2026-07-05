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

`library/hello-world` 对应 Docker Hub 的官方镜像命名空间。`library` 是 Docker Hub 为官方镜像保留的特殊命名空间，并不是普通用户组织。未显式指定 registry、namespace 或 tag 时，Docker 会按默认规则补全；默认 tag 为 `latest`。

### 3. `docker images`

查看本地已拉取的镜像。

### 4. `docker run library/hello-world`

基于镜像创建并运行容器。

### 5. `docker ps -a`

`docker ps` 默认列出**正在运行的容器**；使用 `docker ps -a` 可以同时查看已停止的容器。`ps` 沿用 Unix 命令名，通常解释为 **process status**（进程状态）。

### 6. `docker run -it ubuntu bash`

运行 Ubuntu 容器并进入 `bash`。

> [!NOTE]
> `-i` 即 `--interactive`，保持标准输入开启；`-t` 即 `--tty`，为容器分配伪终端（pseudo-TTY）。二者常配合使用，使容器内的 `bash` 能够像本机终端一样交互并正确显示提示符。

```bash
docker run -it ubuntu bash
```

```text
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

```bash
docker run -it -d ubuntu
docker ps
docker ps -a
```

```text
➜  /workspace git:(main) docker run -it -d ubuntu
7f2ce79b0dc9bf7f5eb703ff2d919db2d435e9808db524cb360aa870b797e3ad
➜  /workspace git:(main) docker ps
CONTAINER ID   IMAGE     COMMAND       CREATED         STATUS         PORTS     NAMES
7f2ce79b0dc9   ubuntu    "/bin/bash"   5 seconds ago   Up 5 seconds             adoring_payne
```

`-d` 即 `--detach`，表示让容器在后台运行。容器是否持续运行取决于其主进程（PID 1）是否仍在运行；实际服务通常应以前台方式启动 Web 服务、数据库或其他长期运行进程。

#### 进入后台运行的容器

```bash
docker exec -it <container-id> bash
```

例如：

```bash
docker exec -it 7f2ce79b0dc9 bash
```

`exit` 只会退出本次通过 `exec` 启动的 `bash`，不会停止原容器的主进程。

#### 停止容器

```bash
docker stop <container-id>
```

停止后可通过 `docker ps -a` 查看容器状态。若容器在宽限期内未自行退出，Docker 会强制终止它，因此可能看到退出码 `137`。

### 7. `docker rm <container-id> ...`

删除 `docker ps -a` 中的已停止容器记录。

```bash
docker rm 7f2ce79b0dc9
docker rm 8aecb273d78d 7a04315e84e5
```

运行中的容器需要先停止，或显式使用强制删除选项。

### 8. `docker rmi <image-id> <image-name> ...`

删除已拉取的本地镜像。

```bash
docker rmi 53958ec7b67c
docker rmi 96498ffd522e
```

若仍有容器依赖该镜像，需要先删除相关容器，或确认强制删除的影响。

### 9. `docker logs <container-id>`

查看指定容器的标准输出和标准错误日志。

```bash
docker logs 00a913763c7e
```

```text
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

```bash
docker run -it -p 8000:8000 ubuntu bash
```

`-p 8000:8000` 是端口发布（port publishing），格式为：

```text
-p 宿主机端口:容器端口
```

它将宿主机的 `8000` 端口映射到容器内部的 `8000` 端口。假设容器内启动了监听 `8000` 端口的 Web 服务，例如：

```bash
python3 -m http.server 8000
```

那么可从宿主机浏览器访问：

```text
http://localhost:8000
```

Docker 会将该请求转发到容器中的 `8000` 端口。

### 2. 安装 `curl` 与 code-server

进入容器后先更新软件包索引并安装 `curl`：

```bash
apt update
apt install -y curl
```

`curl` 是命令行网络数据传输工具，可通过 URL 下载内容、发起 HTTP 请求、上传数据或测试网络接口。

code-server 的安装命令可从 [coder/code-server: VS Code in the browser](https://github.com/coder/code-server) 获取：

```bash
curl -fsSL https://code-server.dev/install.sh | sh
```

首次执行 `code-server` 时，会生成默认配置文件；默认服务监听在 `127.0.0.1:8080`，并启用密码认证：

```text
root@ee5dbce07d54:/# code-server
[2026-07-02T17:20:39.840Z] info  Wrote default config file to /root/.config/code-server/config.yaml
[2026-07-02T17:20:39.947Z] info  code-server 4.127.0 1e6ed874e3138141a5636f6e0dbe8570aa6cd001
[2026-07-02T17:20:39.955Z] info  HTTP server listening on http://127.0.0.1:8080/
[2026-07-02T17:20:39.955Z] info    - Authentication is enabled
[2026-07-02T17:20:39.955Z] info      - Using password from /root/.config/code-server/config.yaml
```

使用下面的启动方式，使 code-server 监听所有 IPv4 接口的 `8000` 端口，并关闭临时访问密码：

```bash
code-server --bind-addr=0.0.0.0:8000 --auth=none
```

`--bind-addr=0.0.0.0:8000` 的含义如下：

| 部分 | 含义 |
| --- | --- |
| `0.0.0.0` | 监听当前机器的所有 IPv4 网络接口 |
| `8000` | code-server 对外提供 Web 服务的端口 |

`--auth=none` 表示禁用认证。它只适用于受控的开发环境；在可被公网访问的场景中，不应直接关闭认证，应配合访问控制、反向代理或安全网络使用。

通过 CNB 的 **PORTS** 面板提供的访问地址，可以进入浏览器中的 code-server：

![通过 CNB 端口访问 code-server 的浏览器界面](data:image/webp;base64,UklGRkYAAABXRUJQVlA4IDoAAADwAQCdASoIBwB+JaQAA3HhD3T1EAA2JaW76H/aX2hGU1jyQ5oYPNhF+WB7w/JX8evcpCfqPJr+u4AA/vN7yZEhW57Lf4ZqgsLLE1/9s7XjQjwxOCvW9akONLfMfWzG1gn0K/4xULn5CT7L0iU4iSEmP7kJwnXB+KZXj0/rnWlAvDo43dQAA==)

### 3. 通过交互式容器打包镜像：`docker commit`

前面的步骤依旧接近“打开一台虚拟机后手动安装软件”。为了将当前容器中的环境固化下来，可以使用：

```text
docker commit <container-id> [image-name[:tag]]
docker run <image>  →  container
```

`docker commit` 会把指定容器当前的文件系统状态创建为新镜像。未指定镜像名称和标签时，结果会以 `<none>:<none>` 的形式出现，但仍可通过镜像 ID 使用。

```text
➜  /workspace git:(main) docker ps
CONTAINER ID   IMAGE     COMMAND   CREATED          STATUS          PORTS                                         NAMES
7bd8b92526c3   ubuntu    "bash"    36 minutes ago   Up 36 minutes   0.0.0.0:8000->8000/tcp, [::]:8000->8000/tcp   focused_brahmagupta
➜  /workspace git:(main) docker commit 7bd8b92526c3
sha256:97f491c9e63c5f73fd3913372e404ccd7f7481003edd9297d7a628e49737f136
➜  /workspace git:(main) docker images
REPOSITORY   TAG       IMAGE ID       CREATED          SIZE
<none>       <none>    97f491c9e63c   17 minutes ago   1.48GB
ubuntu       latest    b7f48194d4d8   8 days ago       155MB
```

使用该镜像启动 code-server：

```bash
docker run -it -p 8000:8000 97f491c9e63c \
  code-server --bind-addr=0.0.0.0:8000 --auth=none
```

若要让 code-server 作为容器主进程在后台运行，可覆盖镜像默认 entrypoint：

```bash
docker run -it -p 8000:8000 --entrypoint "code-server" -d 97f491c9e63c \
  --bind-addr=0.0.0.0:8000 --auth=none
```

`--entrypoint "code-server"` 用于覆盖镜像默认入口程序，使容器直接以 `code-server` 启动；`-d` 用于后台运行。随后可以用 `docker logs <container-id>` 查看服务日志。

### 4. 通过 Dockerfile 构建镜像

Dockerfile 方式可将环境构建步骤写成可复现的文本配置，便于版本管理和自动化构建。此处暂未记录具体 Dockerfile 内容，后续补充。

---

## 四、将镜像推送至制品库（镜像仓库）并使用

Docker 官方镜像仓库是 [Docker Hub Container Image Library](https://hub.docker.com/)，可以上传自己的 Docker 镜像，也可以下载其他镜像。

### 第一步：登录镜像仓库

登录 Docker Hub：

```bash
docker login
```

登录私有仓库时，以 CNB 的镜像仓库为例，可以在制品页面找到 Docker 镜像制品：

![CNB 制品页面中的 Docker 镜像制品](data:image/webp;base64,UklGRlAAAABXRUJQVlA4IEQAAADwAQCdASoIBwB+JaQAA3HhD3T1EAA2JaW76H/aX2hGU1jyQ5oYPNhF+WB7w/JX8evcpCfqPJr+u4AA/vN7yZEhW57Lf4ZqgsLLE1/9s7XjQjwxOCvW9akONLfMfWzG1gn0K/4xULn5CT7L0iU4iSEmP7kJwnXB+KZXj0/rnWlAvDo43dQAA==)

点击“使用 Docker 制品”后，可以查看不同使用方式：

![CNB Docker 制品的使用方式选择界面](data:image/webp;base64,UklGRlAAAABXRUJQVlA4IEQAAADwAQCdASoIBwB+JaQAA3HhD3T1EAA2JaW76H/aX2hGU1jyQ5oYPNhF+WB7w/JX8evcpCfqPJr+u4AA/vN7yZEhW57Lf4ZqgsLLE1/9s7XjQjwxOCvW9akONLfMfWzG1gn0K/4xULn5CT7L0iU4iSEmP7kJwnXB+KZXj0/rnWlAvDo43dQAA==)

在制品 tag 的“使用指引”中，选择“本地命令行推送”可获得登录、构建、推送和拉取命令：

![CNB Docker 制品的本地命令行推送指引](data:image/webp;base64,UklGRlAAAABXRUJQVlA4IEQAAADwAQCdASoIBwB+JaQAA3HhD3T1EAA2JaW76H/aX2hGU1jyQ5oYPNhF+WB7w/JX8evcpCfqPJr+u4AA/vN7yZEhW57Lf4ZqgsLLE1/9s7XjQjwxOCvW9akONLfMfWzG1gn0K/4xULn5CT7L0iU4iSEmP7kJwnXB+KZXj0/rnWlAvDo43dQAA==)

CNB 使用访问令牌进行鉴权。可在个人设置的“访问令牌”中创建令牌：

![CNB 个人设置中的访问令牌创建界面](data:image/webp;base64,UklGRlAAAABXRUJQVlA4IEQAAADwAQCdASoIBwB+JaQAA3HhD3T1EAA2JaW76H/aX2hGU1jyQ5oYPNhF+WB7w/JX8evcpCfqPJr+u4AA/vN7yZEhW57Lf4ZqgsLLE1/9s7XjQjwxOCvW9akONLfMfWzG1gn0K/4xULn5CT7L0iU4iSEmP7kJwnXB+KZXj0/rnWlAvDo43dQAA==)

创建令牌后，可用 Token 登录 CNB 镜像仓库。下图中的敏感 Token 已遮盖；访问令牌不应提交到公开仓库、网页或日志中。

![CNB 访问令牌创建成功页面，Token 已隐藏](data:image/webp;base64,UklGRlAAAABXRUJQVlA4IEQAAADwAQCdASoIBwB+JaQAA3HhD3T1EAA2JaW76H/aX2hGU1jyQ5oYPNhF+WB7w/JX8evcpCfqPJr+u4AA/vN7yZEhW57Lf4ZqgsLLE1/9s7XjQjwxOCvW9akONLfMfWzG1gn0K/4xULn5CT7L0iU4iSEmP7kJwnXB+KZXj0/rnWlAvDo43dQAA==)

### 第二步：为镜像添加仓库标签

```text
➜  /workspace git:(main) docker tag 97f491c9e63c docker.cnb.cool/kyle-cnb/docker-learning:latest
➜  /workspace git:(main) docker images
REPOSITORY                                 TAG       IMAGE ID       CREATED       SIZE
docker.cnb.cool/kyle-cnb/docker-learning   latest    97f491c9e63c   4 hours ago   1.48GB
ubuntu                                     latest    b7f48194d4d8   8 days ago    155MB
```

`docker tag` 会为已有镜像添加新的仓库名称与标签，镜像 ID 不会改变。此标签决定后续 `docker push` 要推送到的目标仓库。

### 第三步：上传镜像

```text
➜  /workspace git:(main) docker push docker.cnb.cool/kyle-cnb/docker-learning
Using default tag: latest
The push refers to repository [docker.cnb.cool/kyle-cnb/docker-learning]
18582ffa9453: Pushed
a9be9fd915e9: Pushed
2c1ce1d0a589: Pushed
latest: digest: sha256:97f491c9e63c5f73fd3913372e404ccd7f7481003edd9297d7a628e49737f136 size: 1172
```

上传完成后，可以在 CNB 的“制品”标签中看到镜像：

![CNB 制品列表中的 docker-learning 镜像](data:image/webp;base64,UklGRlAAAABXRUJQVlA4IEQAAADwAQCdASoIBwB+JaQAA3HhD3T1EAA2JaW76H/aX2hGU1jyQ5oYPNhF+WB7w/JX8evcpCfqPJr+u4AA/vN7yZEhW57Lf4ZqgsLLE1/9s7XjQjwxOCvW9akONLfMfWzG1gn0K/4xULn5CT7L0iU4iSEmP7kJwnXB+KZXj0/rnWlAvDo43dQAA==)

镜像详情页会展示标签、摘要、大小与镜像层信息：

![CNB docker-learning 镜像详情页](data:image/webp;base64,UklGRlAAAABXRUJQVlA4IEQAAADwAQCdASoIBwB+JaQAA3HhD3T1EAA2JaW76H/aX2hGU1jyQ5oYPNhF+WB7w/JX8evcpCfqPJr+u4AA/vN7yZEhW57Lf4ZqgsLLE1/9s7XjQjwxOCvW9akONLfMfWzG1gn0K/4xULn5CT7L0iU4iSEmP7kJwnXB+KZXj0/rnWlAvDo43dQAA==)

### 第四步：使用已推送的镜像

```text
➜  /workspace git:(main) docker run -it -p 8000:8000 --entrypoint "code-server" -d docker.cnb.cool/kyle-cnb/docker-learning --bind-addr=0.0.0.0:8000 --auth=none
Unable to find image 'docker.cnb.cool/kyle-cnb/docker-learning:latest' locally
latest: Pulling from kyle-cnb/docker-learning
18582ffa9453: Pull complete
a9be9fd915e9: Pull complete
2c1ce1d0a589: Pull complete
Digest: sha256:97f491c9e63c5f73fd3913372e404ccd7f7481003edd9297d7a628e49737f136
Status: Downloaded newer image for docker.cnb.cool/kyle-cnb/docker-learning:latest
bfba1585fecce5177a660fd9086402301f1a6ea48855a0ef69980d4a82c69d57
```

当本地没有该镜像时，`docker run` 会先从指定仓库拉取镜像，再创建并启动容器。
