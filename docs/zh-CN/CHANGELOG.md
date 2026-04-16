# 变更日志

[English](../en-US/CHANGELOG.md) | 中文 (Chinese)

本文件记录 @dreamer/config 的重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [1.0.3] - 2026-04-17

### 新增

- **包根再导出**：在包入口再导出 `deleteEnv`、`getEnv`、`hasEnv`、`setEnv`（来自
  `@dreamer/runtime-adapter`），便于只依赖本包访问进程环境（这些 API
  仍**不会**自动读磁盘 `.env`）。
- **首次 import 预热**：加载 `@dreamer/config` 入口时执行一次
  `preloadDotEnvSync(["."])`，按与手动调用相同的规则将 cwd 下分层 `.env`
  合并进进程。

### 变更

- **`preloadDotEnvSync`**（默认
  `applyToProcess`）：进程中该键未定义或仅空白时，仍用合并结果写入，避免 shell
  里空导出占位导致无法注入 `.env` 非空值。
- **多目录 `.env`
  合并**：后序目录中某键为空字符串时，不再覆盖先序目录已合并出的非空值。
- **`PreloadDotEnvOptions`**：注释中明确 `override` 与默认「仅填补空位」的差异。

---

## [1.0.2] - 2026-04-16

### 新增

- **`preloadDotEnvSync`**：多目录同步合并分层
  `.env`，并可选将结果写入进程环境（`setEnv`；默认不覆盖已有键）。
- **`collectDotEnvLayersSync`**：单目录读取 `.env`、`.env.{dev|test|prod}`
  及可选的 `.env.{原始环境名小写}`，不修改进程环境。
- **`resolveConfigEnvFileSuffix`**：将常见 `DENO_ENV` / `NODE_ENV` 映射为 `dev`
  | `test` | `prod`，用于中间层文件名（如 `development` → `.env.dev`）。
- 导出 **`PreloadDotEnvOptions`**、**`ConfigEnvFileSuffix`** 等类型。

### 变更

- **`ConfigManager` 的 `load` / `loadSync` / 内部 `loadEnvFiles`**：`.env`
  合并规则与 `collectDotEnvLayersSync` 一致（基础、三档后缀、原始环境文件）。
- **热重载默认值**：当解析后的环境文件后缀为 `dev`
  时默认开启热重载（`development` 等仍视为开发态）。
- **构造函数**：解析当前环境字符串时同时参考 `BUN_ENV`。
- **`deno.json`**：增加 `nodeModulesDir: "auto"` 便于本地跑测试依赖。

---

## [1.0.1] - 2026-02-18

### 变更

- **文档**：拆分为 `docs/en-US/` 与
  `docs/zh-CN/`（README、CHANGELOG、TEST_REPORT、 client README）；根目录 README
  精简并链至文档。
- **许可证**：在 `deno.json` 及文档中明确为 Apache-2.0。

---

## [1.0.0] - 2026-02-06

### 新增

- **稳定版**：首个稳定版本，API 稳定

- **多环境配置**：
  - dev、test、prod 环境
  - 环境自动检测
  - 环境特定配置文件

- **多目录支持**：
  - 多个配置目录
  - 按顺序加载，优先级控制
  - 后加载目录覆盖先加载

- **配置文件加载**：
  - TypeScript 模块导出（推荐，类型安全）
  - JSON 配置文件
  - .env 文件支持

- **同步/异步加载**：
  - 异步 `load()`：完整支持（TypeScript、JSON、.env）
  - 同步 `loadSync()`：仅 JSON 和 .env

- **配置合并**：
  - 多目录合并
  - 默认 + 环境配置合并
  - 深度合并、数组替换、环境变量覆盖

- **配置验证**：
  - Schema 验证、必填字段、类型检查、自定义规则、错误提示

- **环境变量支持**：
  - 自动读取、覆盖配置、映射与前缀过滤

- **热重载**：
  - 监听文件变化、自动重载、更新事件、开发环境自动启用

- **服务容器集成**：
  - `@dreamer/service` 依赖注入、多 ConfigManager、`createConfigManager` 工厂

- **客户端子路径**：
  - `/client` 子路径供浏览器使用

### 兼容性

- Deno 2.5.0+
- Bun 1.0.0+
- 服务端：需文件系统访问
- 客户端：浏览器通过 `/client` 子路径
