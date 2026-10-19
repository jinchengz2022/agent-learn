# Mac + Docker Desktop 部署 Milvus v2.6.23 完整指南

> 环境：Mac（M 芯片）、Docker Desktop
> 架构：Milvus Standalone + etcd（quay.io 镜像）+ MinIO（bitnami 镜像）
> 说明：新版 Docker Desktop 图形界面 Run 弹窗**无法填写启动命令、无法指定网络**，因此 etcd、minio、milvus 全部使用终端 `docker run` 启动。

---

## 一、镜像清单与链接（pull 命令）

本部署共需要 3 个镜像，建议**先用 pull 单独拉取全部镜像**，全部成功后，再逐个启动容器，避免 `docker run` 时拉镜像超时。

### 1. Milvus Standalone 主镜像
```bash
docker pull milvusdb/milvus:v2.6.23
```
- Docker Hub 页面：https://hub.docker.com/r/milvusdb/milvus
- 镜像仓库源：`milvusdb/milvus:v2.6.23`

### 2. etcd（元数据存储，quay.io 官方镜像）
```bash
docker pull quay.io/coreos/etcd:v3.5.25
```
- Quay.io 页面：https://quay.io/repository/coreos/etcd
- 镜像仓库源：`quay.io/coreos/etcd:v3.5.25`

> ⚠️ 注意：etcd 使用的是 **quay.io** 仓库，不是 Docker Hub，国内的 Docker 镜像加速器对 quay.io 无效。如果拉取超时，可使用代理或换用 Docker Hub 上的 `bitnami/etcd` 镜像。

### 3. MinIO（对象存储，bitnami 镜像）
```bash
docker pull bitnami/minio:latest
```
- Docker Hub 页面：https://hub.docker.com/r/bitnami/minio
- 镜像仓库源：`bitnami/minio:latest`

> ⚠️ 注意：bitnami/minio **不能**追加 `server /data` 启动命令，启动行为完全由环境变量控制，会自动创建配置的 bucket。

### 验证镜像已全部拉取成功
```bash
docker images | grep -E "milvus|etcd|minio"
```
应能看到三行镜像及其版本号。

---

## 二、前置准备（必须先完成）

### 1. 调整 Docker Desktop 资源
打开 Docker Desktop → Settings → Resources
- Memory：**至少 4GB，M 芯片推荐 6GB**（内存不足 Milvus 会 exit 134 崩溃）

### 2. 设置内核参数 vm.max_map_count（Milvus 硬性依赖）
> ⚠️ Mac 的 Docker Desktop **不能**在 daemon.json 写入 vm.max_map_count，会卡死 Docker 引擎。必须通过 screen 进入虚拟机设置，且**每次重启 Docker Desktop 都要重新执行**。

```bash
screen ~/Library/Containers/com.docker.docker/Data/vms/0/tty
# 进入 screen 后执行：
sysctl -w vm.max_map_count=262144
# 退出 screen：按 Ctrl+A，松开，再按 d
```

### 3. 创建自定义网络（三个容器必须同一网络才能互相解析）
```bash
docker network create milvus
```

### 4. 创建本地数据持久化目录
```bash
mkdir -p ~/milvus/etcd ~/milvus/minio ~/milvus/milvus-data
```

---

## 三、步骤 1：启动 etcd

### 启动命令
```bash
# 如有旧同名容器先清理
docker rm -f milvus-etcd

docker run -d \
  --name milvus-etcd \
  --network milvus \
  -p 2379:2379 \
  -e ETCD_AUTO_COMPACTION_MODE=revision \
  -e ETCD_AUTO_COMPACTION_RETENTION=1000 \
  -e ETCD_QUOTA_BACKEND_BYTES=4294967296 \
  -v $HOME/milvus/etcd:/etcd \
  quay.io/coreos/etcd:v3.5.25 \
  etcd -advertise-client-urls=http://milvus-etcd:2379 -listen-client-urls http://0.0.0.0:2379 --data-dir /etcd
```

> 关键点：
> - `--network milvus`：加入自定义网络
> - `advertise-client-urls` 写容器名 `milvus-etcd:2379`，**不能写 127.0.0.1**（Milvus 容器才能访问）
> - 末尾的 `etcd -advertise...` 是覆盖默认启动命令

### 验证
```bash
docker logs milvus-etcd
```
看到正常启动日志、无报错即可。

---

## 四、步骤 2：启动 MinIO（bitnami/minio）

### 启动命令
```bash
# 如有旧同名容器先清理
docker rm -f milvus-minio

docker run -d \
  --name milvus-minio \
  --network milvus \
  -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  -e MINIO_DEFAULT_BUCKETS=milvus-bucket \
  -v $HOME/milvus/minio:/data \
  bitnami/minio:latest
```

> ⚠️ 关键点：bitnami/minio **不能**传 `server /data --console-address ":9001"` 命令，否则会报 `exec: server: not found`。只靠环境变量控制，`MINIO_DEFAULT_BUCKETS=milvus-bucket` 会自动创建 Milvus 需要的 bucket。

### 验证
```bash
docker logs milvus-minio
```
访问控制台：http://127.0.0.1:9001，账号密码：`minioadmin / minioadmin`，确认 `milvus-bucket` 已存在。

---

## 五、步骤 3：启动 Milvus Standalone

### 启动命令
```bash
# 如有旧同名容器先清理
docker rm -f milvus-standalone

docker run -d \
  --name milvus-standalone \
  --network milvus \
  -p 19530:19530 \
  -p 9091:9091 \
  -e ETCD_ENDPOINTS=milvus-etcd:2379 \
  -e MINIO_ADDRESS=milvus-minio:9000 \
  -e MINIO_BUCKET_NAME=milvus-bucket \
  -v $HOME/milvus/milvus-data:/var/lib/milvus \
  milvusdb/milvus:v2.6.23 \
  milvus run standalone
```

> ⚠️ 关键点：
> - 末尾的 `milvus run standalone` 是核心启动指令，**缺失时 tini 会打印帮助后直接退出、容器秒关**
> - 环境变量与前面两个容器对应：`ETCD_ENDPOINTS=milvus-etcd:2379`、`MINIO_ADDRESS=milvus-minio:9000`、`MINIO_BUCKET_NAME=milvus-bucket`

### 验证
```bash
docker logs -f milvus-standalone
```
等待日志输出 `health check passed`，代表 Milvus 就绪，端口 **19530** 可连接。

---

## 六、连接 Milvus 示例（pymilvus）

```python
from pymilvus import connections, utility

connections.connect(host="127.0.0.1", port="19530")
print(utility.get_server_version())
```

---

## 七、常用排查与清理命令

### 查看所有容器状态
```bash
docker ps -a
```

### 清理单个容器
```bash
docker rm -f milvus-etcd
docker rm -f milvus-minio
docker rm -f milvus-standalone
```

### 整套全部清理
```bash
docker rm -f milvus-etcd milvus-minio milvus-standalone
docker network rm milvus
```

### 容器内部连通性测试（排查 Milvus 连不上 etcd/minio）
```bash
docker exec -it milvus-standalone bash
curl milvus-etcd:2379/version
curl milvus-minio:9000/minio/health/live
```

---

## 八、踩坑汇总（本部署遇到的全部问题）

| 问题 | 现象 | 解决办法 |
|------|------|----------|
| 新版 Docker Desktop 图形 Run 弹窗无法启动 Milvus | 无 Command 输入框、无法指定网络 | 全部改用终端 `docker run` |
| 路径写 `~/` 无法识别 | 图形面板报 invalid characters | 终端用 `$HOME/...`，图形面板用绝对路径 |
| bitnami/minio 报 `server: not found` | 镜像无 server 命令 | 不追加启动命令，只用环境变量 |
| Milvus 容器秒关、日志只有 tini 帮助 | 缺 `milvus run standalone` | 末尾必须带上启动指令 |
| 三个容器互相连不上 | Milvus 报 etcd/minio 不可达 | 必须同一自定义网络，用容器名做域名，不写 127.0.0.1 |
| 在 daemon.json 加 vm.max_map_count 卡死 Docker | Docker 引擎无法启动 | 用 screen 进虚拟机设置 sysctl |
| M 芯片内存不足 Milvus exit 134 | 容器被异常终止 | Docker Desktop 内存调到 6GB 以上 |
