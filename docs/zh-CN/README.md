# @dreamer/config

> [English](../en-US/README.md) | 中文 (Chinese)

> 一个兼容 Deno 和 Bun 的配置管理包，提供统一的配置接口，支持服务端配置文件管理

---

## 🎯 功能

配置管理包，提供统一的配置抽象层，支持服务端配置文件管理（JSON、.env、TypeScript
模块）。

---

## ✨ 特性

| 特性                 | 说明                                                                                               |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| 🌍 **多环境配置**    | 支持开发环境（dev）、测试环境（test）、生产环境（prod）、环境自动检测、环境特定配置文件            |
| 📁 **多目录支持**    | 支持配置多个配置目录、按目录顺序加载配置、优先级控制                                               |
| 📝 **配置文件加载**  | TypeScript 模块导出（推荐，类型安全）、JSON 配置文件（纯数据配置）、.env 文件支持                  |
| ⚡ **同步/异步加载** | 异步 `load()` 支持完整功能，同步 `loadSync()` 支持 JSON 和 .env 文件快速加载                       |
| 🔀 **配置合并**      | 多目录配置合并、默认配置 + 环境配置合并、深度合并、数组替换、环境变量覆盖配置值                    |
| ✅ **配置验证**      | 配置结构验证（Schema 验证）、必填字段检查、类型验证、自定义验证规则、验证错误提示                  |
| 🔐 **环境变量支持**  | 自动读取环境变量、环境变量覆盖配置文件值、支持环境变量映射、支持环境变量前缀过滤                   |
| 🔄 **配置热重载**    | 监听配置文件变化、自动重新加载配置、配置更新事件通知、开发环境自动启用                             |
| 🔗 **服务容器集成**  | 支持 `@dreamer/service` 依赖注入、管理多个 ConfigManager 实例、提供 `createConfigManager` 工厂函数 |

---

## 🎨 设计原则

__所有 @dreamer/_ 包都遵循以下原则_*：

- **主包（@dreamer/xxx）**：用于服务端（兼容 Deno 和 Bun 运行时）
- **客户端子包（@dreamer/xxx/client）**：用于客户端（浏览器环境）

这样可以：

- 明确区分服务端和客户端代码
- 避免在客户端代码中引入服务端依赖
- 提供更好的类型安全和代码提示
- 支持更好的 tree-shaking

---

## 🎯 使用场景

- **应用配置管理**：数据库连接、API 密钥等
- **环境变量管理**：多环境部署配置
- **配置文件管理**：集中管理应用配置

---

## 📦 安装

### Deno

```bash
deno add jsr:@dreamer/config
```

### Bun

```bash
bunx jsr add @dreamer/config
```

---

## 🌍 环境兼容性

| 环境       | 版本要求 | 状态                                                     |
| ---------- | -------- | -------------------------------------------------------- |
| **Deno**   | 2.5+     | ✅ 完全支持                                              |
| **Bun**    | 1.0+     | ✅ 完全支持                                              |
| **服务端** | -        | ✅ 支持（兼容 Deno 和 Bun 运行时，需要文件系统访问权限） |
| **客户端** | -        | ✅ 支持（浏览器环境，通过 `/client` 子路径使用）         |

| 依赖类型     | 包名                          | 说明                                |
| ------------ | ----------------------------- | ----------------------------------- |
| **核心依赖** | -                             | 📦 无外部依赖（纯 TypeScript 实现） |
| **可选依赖** | `jsr:@dreamer/service@^1.0.0` | 📦 用于服务容器集成                 |

---

## 🚀 快速开始

### 基础用法

```typescript
import { ConfigManager, createConfig } from "jsr:@dreamer/config";

// 方式1：使用单个配置目录
// 如果目录中存在 mod.ts，会自动使用 TypeScript 模块（推荐）
// 如果不存在 mod.ts，会使用 config.json
const config = createConfig({
  configDir: "./config", // 配置文件目录
  env: "dev", // 可选：手动指定环境（dev、test、prod）
});

// 方式2：使用多个配置目录（后面的目录覆盖前面的目录）
const config = createConfig({
  configDirs: [
    "./config/base", // 基础配置（优先级最低）
    "./config/modules", // 模块配置（覆盖基础配置）
    "./config/local", // 本地配置（优先级最高，覆盖前面的配置）
  ],
  env: "dev",
});

// 异步加载配置（支持 TypeScript 模块、JSON、.env）
await config.load();

// 获取配置
const dbHost = config.get("database.host");
const dbPort = config.get("database.port");
const apiKey = config.get("api.key");

// 获取嵌套配置
const dbConfig = config.get("database");
// { host: "localhost", port: 5432, name: "mydb" }
```

### 同步加载配置

如果只使用 JSON 和 .env 文件，可以使用同步加载方式：

```typescript
import { ConfigManager } from "jsr:@dreamer/config";

const config = new ConfigManager({
  directories: ["./config"],
  env: "dev",
  hotReload: false,
});

// 同步加载配置（仅支持 JSON 和 .env 文件，不支持 TypeScript 模块）
config.loadSync();

// 立即使用配置
const dbHost = config.get("database.host");
console.log(`数据库地址: ${dbHost}`);
```

> **注意**：`loadSync()` 不支持 TypeScript
> 模块配置（`mod.ts`），因为动态导入（`import()`）是异步操作。如果需要使用
> TypeScript 模块配置，请使用异步的 `load()` 方法。

### 配置文件结构

**config/mod.ts**（默认配置）：

```typescript
export default {
  app: {
    name: "My App",
    version: "1.0.0",
    port: 3000,
  },
  database: {
    host: "localhost",
    port: 5432,
    name: "mydb",
  },
  api: {
    key: "default-key",
    timeout: 5000,
  },
};
```

**config/mod.dev.ts**（开发环境配置）：

```typescript
import baseConfig from "./mod.ts";

export default {
  ...baseConfig,
  app: {
    ...baseConfig.app,
    port: 3001, // 覆盖默认端口
  },
  database: {
    ...baseConfig.database,
    port: 5433, // 覆盖默认端口
  },
};
```

### 配置验证

```typescript
import { createConfig, Schema } from "jsr:@dreamer/config";

// 定义配置 Schema
const configSchema = {
  app: {
    name: { type: "string", required: true },
    port: { type: "number", min: 1, max: 65535 },
    version: { type: "string", pattern: /^\d+\.\d+\.\d+$/ },
  },
  database: {
    host: { type: "string", required: true },
    port: { type: "number", required: true },
    name: { type: "string", required: true },
  },
};

const config = createConfig({
  configDir: "./config",
  schema: configSchema, // 配置验证 Schema
});

// 加载配置时会自动验证
try {
  await config.load();
} catch (error) {
  // 配置验证失败
  console.error("配置验证失败:", error);
}
```

### 与服务容器集成

```typescript
import { ServiceContainer } from "jsr:@dreamer/service";
import { createConfig } from "jsr:@dreamer/config";

// 创建服务容器
const container = new ServiceContainer();

// 创建配置管理器
const config = createConfig({
  configDirs: [
    "./config/base",
    "./config/modules",
    "./config/local",
  ],
  env: process.env.DENO_ENV || "dev",
  watch: process.env.DENO_ENV === "dev",
});

// 加载配置
await config.load();

// 注册到服务容器
container.registerSingleton("config", config);

// 在其他服务中使用配置
container.registerSingleton("databaseService", () => {
  const config = container.get("config");
  return new DatabaseService({
    host: config.get("database.host"),
    port: config.get("database.port"),
  });
});
```

---

## 📚 API 文档

### createConfig

创建配置管理器。

**选项**：

- `configDir?: string`: 单个配置目录
- `configDirs?: string[]`: 多个配置目录（后面的覆盖前面的）
- `env?: string`: 环境名称（dev、test、prod）
- `schema?: Schema`: 配置验证 Schema
- `watch?: boolean`: 是否监听配置文件变化（默认：开发环境启用）

### ConfigManager

配置管理器类。

**方法**：

| 方法                                     | 说明                                                    |
| ---------------------------------------- | ------------------------------------------------------- |
| `get(key, defaultValue?)`                | 获取配置值（支持点号路径，如 `"database.host"`）        |
| `set(key, value)`                        | 设置配置值                                              |
| `has(key)`                               | 检查配置键是否存在                                      |
| `getAll()`                               | 获取所有配置                                            |
| `getEnv()`                               | 获取当前环境                                            |
| `load()`                                 | 异步加载配置文件（支持 TypeScript 模块、JSON、.env）    |
| `loadSync()`                             | 同步加载配置文件（仅支持 JSON 和 .env，不支持 TS 模块） |
| `stopWatching()`                         | 停止文件监听                                            |
| `getName()`                              | 获取管理器名称                                          |
| `setContainer(container)`                | 设置服务容器                                            |
| `getContainer()`                         | 获取服务容器                                            |
| `static fromContainer(container, name?)` | 从服务容器获取 ConfigManager 实例                       |

> **与 @dreamer/dweb 集成：`load()` 与 `config/main.ts` 谁先执行？**\
> 上表所述无误——`load()` **会**异步加载配置目录下的 TypeScript / JSON / `.env`
> 并参与合并。\
> 但在 **dweb** 的 `initializeConfigManager` 中，**会先**动态 `import`
> `common/config/main.ts` 与各应用的 `config/main.ts`，**然后**才
> `await configManager.load()`。因此：
>
> - **`main.ts` 模块顶层代码**在 `load()` **之前**运行；若 `.env`
>   里的键**尚未**进入**进程环境**，顶层里用 `getEnv`
>   也读不到「仅存在于磁盘、等待 `load()` 才进 ConfigManager 内存」的值。
> - **v1.0.2+**：`loadSync()` / `load()` 会按 **`.env` →
>   `.env.{dev|test|prod}`**（由 `development`/`production` 等规范化）→
>   **`.env.{原始环境名小写}`**（如 `.env.development`）分层合并；并导出
>   **`preloadDotEnvSync`**，在 import `main.ts` **之前**把上述文件同步读入并
>   **`setEnv` 写入进程**（默认不覆盖已存在的键）。**@dreamer/dweb** 已在
>   `initializeConfigManager` 开头对仓库根 `"."` 与各配置目录调用
>   `preloadDotEnvSync`，使顶层 `getEnv` 与合并规则一致。
> - `load()` 合并进 ConfigManager 的 `.env` 键仍为**顶层扁平键**（如
>   `DB_HOST`）；`load()` **之后**也可用 `getConfig(container)` 等读取。

### 同步 API：`.env` 分层与 `preloadDotEnvSync`

| 导出                         | 说明                                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------------------- |
| `resolveConfigEnvFileSuffix` | 将 `development`/`production`/`prod` 等规范为 `dev` \| `test` \| `prod`，用于 `.env.dev` 等文件名 |
| `collectDotEnvLayersSync`    | 同步读取单个目录下的 `.env` 三层合并结果（不写入进程）                                            |
| `preloadDotEnvSync`          | 多目录同步合并后可选写入进程；选项含 `env`、`override`、`applyToProcess`                          |

### ServiceContainer 集成示例

```typescript
import { ConfigManager, createConfigManager } from "jsr:@dreamer/config";
import { ServiceContainer } from "jsr:@dreamer/service";

// 创建服务容器
const container = new ServiceContainer();

// 注册 ConfigManager 到服务容器
container.registerSingleton("config:main", () => {
  const manager = createConfigManager({
    name: "main",
    directories: ["./config"],
    hotReload: false,
  });
  manager.setContainer(container);
  return manager;
});

// 从服务容器获取
const manager = container.get<ConfigManager>("config:main");
await manager.load();

// 或者使用静态方法
const sameManager = ConfigManager.fromContainer(container, "main");
```

---

## 🌐 客户端支持

客户端配置支持请查看 [client/README.md](./client/README.md)。

---

## 📊 测试报告（摘要）

[![Tests: 52 passed](https://img.shields.io/badge/Tests-52%20passed-brightgreen)](./TEST_REPORT.md)

在包根执行 `deno test -A tests/mod.test.ts`：**52** 条通过、**0** 失败、通过率
**100%**（其中 **50** 条为 `tests/mod.test.ts` 内业务 `it()`，**2** 条为
`@dreamer/test` / 根 `describe` 注册的收尾步骤，与 `deno test`
汇总一致）。覆盖异步/同步加载、`.env` 分层与
`preloadDotEnvSync`、`get`/`set`、环境变量前缀、深度合并、热重载及
`ServiceContainer` 集成。

**完整分节、用例表与 API 覆盖摘要**见 [TEST_REPORT.md](./TEST_REPORT.md)。

---

## 📋 变更日志

完整历史见 [CHANGELOG.md](./CHANGELOG.md)。

**最新 (v1.0.2)**：`.env` / `.env.{dev|test|prod}` / `.env.{原始环境}`
分层合并；`preloadDotEnvSync`；dweb 启动前预热进程环境。

---

## 📝 备注

- **服务端和客户端分离**：通过 `/client` 子路径明确区分服务端和客户端代码
- **服务端**：专注于配置文件管理（JSON、.env、TypeScript 模块），使用文件系统
  API
- **统一接口**：服务端和客户端使用相似的 API 接口，降低学习成本
- **类型安全**：完整的 TypeScript 类型支持
- **无外部依赖**：纯 TypeScript 实现

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可证

Apache License 2.0 - 详见 [LICENSE](../../LICENSE)

---

<div align="center">

**Made with ❤️ by Dreamer Team**

</div>
