# @dreamer/config/client

一个用于浏览器的配置管理库，提供统一的配置接口，支持浏览器存储配置、环境变量配置和 API 配置。

## 服务端支持

服务端配置支持请查看 [服务端文档](../../README.md)。

## 功能

客户端配置管理库，提供统一的配置抽象层，支持浏览器配置管理（localStorage、环境变量、API）。

## 特性

- **浏览器存储配置**：
  - 从 `localStorage` 读取配置（持久化配置）
  - 从 `sessionStorage` 读取配置（会话配置）
  - 配置存储键名可自定义
  - 自动序列化/反序列化
- **环境变量配置**：
  - 从构建时环境变量读取（`import.meta.env`）
  - 从 `window.__ENV__` 读取（运行时注入）
  - 支持环境变量前缀过滤
  - 支持环境变量映射
- **API 配置**：
  - 从服务器 API 获取配置（通过 `fetch`）
  - 支持配置缓存（避免频繁请求）
  - 支持配置刷新
  - 支持配置轮询（自动更新）
- **配置合并**：
  - 多源配置合并（存储 + 环境变量 + API）
  - 优先级：API 配置 > 环境变量 > 浏览器存储
  - 深度合并（嵌套对象合并）
  - 数组替换（不合并数组，直接替换）
- **配置验证**：
  - 配置结构验证（Schema 验证）
  - 必填字段检查
  - 类型验证（字符串、数字、布尔值等）
  - 自定义验证规则
  - 验证错误提示
- **配置更新监听**：
  - 监听 `localStorage`/`sessionStorage` 变化（`storage` 事件）
  - 配置更新事件通知
  - 支持配置热更新

## 安装

```bash
deno add jsr:@dreamer/config/client
```

## 环境兼容性

- **Deno 版本**：要求 Deno 2.5 或更高版本
- **环境**：✅ 支持（浏览器环境）
- **依赖**：无外部依赖

## 使用示例

### 基础用法（浏览器存储）

```typescript
import { createConfig } from "jsr:@dreamer/config/client";

// 方式1：从 localStorage 读取配置
const config = createConfig({
  storage: "localStorage", // 或 "sessionStorage"
  storageKey: "app_config", // 存储键名
});

// 加载配置
await config.load();

// 获取配置
const apiUrl = config.get("api.url");
const theme = config.get("app.theme");

// 设置配置（会自动保存到 localStorage）
config.set("app.theme", "dark");
config.set("api.url", "https://api.example.com");

// 保存配置到存储
await config.save();
```

### 环境变量配置

```typescript
import { createConfig } from "jsr:@dreamer/config/client";

// 方式2：从构建时环境变量读取
const config = createConfig({
  // 从 import.meta.env 读取（构建时注入）
  env: import.meta.env,
  // 或从 window.__ENV__ 读取（运行时注入）
  // env: globalThis.__ENV__,
  envPrefix: "VITE_", // 只读取 VITE_ 开头的环境变量
});

await config.load();

// 获取配置
const apiUrl = config.get("api.url"); // 从 VITE_API_URL 读取
const appName = config.get("app.name"); // 从 VITE_APP_NAME 读取
```

### API 配置

```typescript
import { createConfig } from "jsr:@dreamer/config/client";

// 方式3：从服务器 API 获取配置
const config = createConfig({
  apiUrl: "/api/config", // 配置 API 端点
  cache: true, // 启用缓存（避免频繁请求）
  cacheTTL: 3600000, // 缓存时间（1 小时）
  // 轮询更新（可选）
  pollInterval: 300000, // 每 5 分钟更新一次
});

// 加载配置（从 API 获取）
await config.load();

// 获取配置
const apiUrl = config.get("api.url");
const features = config.get("features");

// 手动刷新配置
await config.refresh();
```

### 多源配置合并

```typescript
import { createConfig } from "jsr:@dreamer/config/client";

// 方式4：多源配置合并（推荐）
const config = createConfig({
  // 优先级从低到高：
  // 1. localStorage（基础配置）
  storage: "localStorage",
  storageKey: "app_config",

  // 2. 环境变量（覆盖存储配置）
  env: import.meta.env,
  envPrefix: "VITE_",

  // 3. API 配置（最高优先级，覆盖前面的配置）
  apiUrl: "/api/config",
  cache: true,
});

// 加载配置（按优先级合并）
await config.load();

// 最终配置值：
// - 如果 localStorage、环境变量、API 都有 api.url，最终值来自 API
// - 如果只有 localStorage 有 theme，最终值来自 localStorage
// - 如果环境变量和 API 都有 features，最终值来自 API
```

### 配置更新监听

```typescript
import { createConfig } from "jsr:@dreamer/config/client";

const config = createConfig({
  storage: "localStorage",
  storageKey: "app_config",
});

await config.load();

// 监听配置更新（localStorage 变化）
config.on("update", (newConfig) => {
  console.log("配置已更新:", newConfig);
  // 更新 UI
  updateUI(newConfig);
});

// 监听特定配置项变化
config.on("change:app.theme", (newValue, oldValue) => {
  console.log("主题变化:", oldValue, "->", newValue);
  applyTheme(newValue);
});
```

### 完整示例

```typescript
import { createConfig } from "jsr:@dreamer/config/client";

// 创建客户端配置管理器
const config = createConfig({
  // 多源配置合并
  storage: "localStorage",
  storageKey: "app_config",
  env: import.meta.env,
  envPrefix: "VITE_",
  apiUrl: "/api/config",
  cache: true,
  cacheTTL: 3600000,
});

// 加载配置
await config.load();

// 使用配置
const appConfig = {
  name: config.get("app.name"),
  version: config.get("app.version"),
  theme: config.get("app.theme", "light"), // 默认值
  apiUrl: config.get("api.url"),
  features: config.get("features", {}),
};

// 更新配置（会自动保存到 localStorage）
config.set("app.theme", "dark");
await config.save();

// 监听配置变化
config.on("update", (newConfig) => {
  console.log("配置已更新:", newConfig);
});

// 从 API 刷新配置
await config.refresh();
```

### 配置验证

```typescript
import { createConfig, Schema } from "jsr:@dreamer/config/client";

// 定义配置 Schema
const configSchema = {
  app: {
    name: { type: "string", required: true },
    version: { type: "string", pattern: /^\d+\.\d+\.\d+$/ },
  },
  api: {
    url: { type: "string", required: true },
    timeout: { type: "number", min: 1000 },
  },
};

const config = createConfig({
  storage: "localStorage",
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

## 使用场景

- **应用配置管理**：API 端点、功能开关、主题设置
- **用户配置管理**：用户偏好、个人设置
- **动态配置**：从服务器获取最新配置

## 备注

- **统一接口**：与服务端使用相似的 API 接口，降低学习成本
- **类型安全**：完整的 TypeScript 类型支持
- **无外部依赖**：纯 TypeScript 实现
