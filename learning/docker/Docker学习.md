# Docker学习记录


## 一、腾讯云 CNB 环境

微信登录 → 创建组织 → 创建仓库 → 点击“云原生开发”一键初始化。

---

## 二、Docker 相关命令

### 1. `docker --version`

查看 Docker 版本。

### 2. `docker pull library/hello-world`

拉取镜像。常见镜像引用格式为：

```text
[registry-host[:port]/][namespace/]repository[:tag]
```

例如，`library/hello-world` 对应 Docker Hub 的官方镜像命名空间；`library` 是 Docker Hub 为 Docker Official Images 保留的特殊命名空间，不是普通用户组织。未显式指定时，Docker 通常会补全默认 registry、namespace 和 `latest` 标签。

### 3. `docker images`

查看本地已拉取的镜像。

### 4. `docker run library/hello-world`

基于镜像创建并运行容器。

### 5. `docker ps -a`

`docker ps` 默认仅显示正在运行的容器；加入 `-a` 后，同时显示已停止的容器。`ps` 沿用 Unix 命令名，通常解释为 **process status**（进程状态）。

### 6. `docker run -it ubuntu bash`

运行 Ubuntu 容器并进入 `bash`。

- `-i`：`--interactive`，保持标准输入开启；
- `-t`：`--tty`，为容器分配伪终端（pseudo-TTY）。

二者配合时，容器内的 `bash` 可以像本机终端一样交互，能够正确显示提示符和部分命令格式。

```bash
docker run -it ubuntu bash
```

退出 `bash` 后，容器的主进程结束，容器也会停止。

#### 后台运行容器

```bash
docker run -it -d ubuntu
docker ps
docker ps -a
```

`-d` 即 `--detach`，表示让容器在后台运行。容器能否持续运行取决于其主进程（PID 1）是否仍在运行；实际服务通常应以前台方式启动 Web 服务、数据库或其他长期运行进程。

#### 进入后台运行的容器

```bash
docker exec -it <container-id> bash
```

`exit` 只会退出本次通过 `exec` 启动的 `bash`，不会停止原容器的主进程。

#### 停止容器

```bash
docker stop <container-id>
```

停止后可通过 `docker ps -a` 查看容器状态。若容器在宽限期内未自行退出，Docker 会强制终止它，因此可能看到退出码 `137`。

### 7. `docker rm <container-id> ...`

删除已停止的容器记录。运行中的容器需要先停止，或显式使用强制删除选项。

### 8. `docker rmi <image-id> ...`

删除本地镜像。若仍有容器依赖该镜像，需要先删除相关容器，或确认使用强制删除选项的影响。

---

## 三、制作自己的 Docker 镜像：实践起点

```bash
docker run -it -p 8000:8000 ubuntu bash
```

`-p 8000:8000` 是端口发布（port publishing）：将宿主机的 `8000` 端口映射到容器的 `8000` 端口。只有容器内有程序监听对应端口，并且该程序监听在可访问地址上时，才能通过宿主机端口访问。

进入容器后，可以先更新软件包索引并安装 `curl`：

```bash
apt update
apt install -y curl
```

`curl` 是命令行网络数据传输工具，可用于通过 URL 下载内容、发起 HTTP 请求、上传数据或测试网络接口。
