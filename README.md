# @dreamer/config

> A config management library compatible with Deno and Bun, providing a unified
> config interface and server-side config file management.

[![JSR](https://jsr.io/badges/@dreamer/config)](https://jsr.io/@dreamer/config)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](./LICENSE)
[![Tests: 54 passed](https://img.shields.io/badge/Tests-54%20passed-brightgreen)](./docs/en-US/TEST_REPORT.md)

📖 **Docs**: [English](./docs/en-US/README.md) |
[中文 (Chinese)](./docs/zh-CN/README.md)

**Changelog**: [en-US](./docs/en-US/CHANGELOG.md) |
[zh-CN](./docs/zh-CN/CHANGELOG.md)

**Latest (v1.0.4)** — **Changed**: Default profile uses **`RUNTIME_ENV`** only
(fallback `dev`); no auto-read of `DENO_ENV` / `NODE_ENV` / `BUN_ENV`;
`build`/`start` map to `.env.prod` tier with optional `.env.build`/`.env.start`.
See [CHANGELOG](./docs/en-US/CHANGELOG.md).

### Test report summary

`deno test -A tests/mod.test.ts`：**54** passed, **0**
failed（含框架收尾步骤；业务用例 **52** 条见
[TEST_REPORT（中文）](./docs/zh-CN/TEST_REPORT.md) /
[English](./docs/en-US/TEST_REPORT.md) 中的分节与说明）。覆盖
`load`/`loadSync`、分层 `.env`、`preloadDotEnvSync`、读写合并、热重载与
`ServiceContainer` 集成。

---

## Features

- **Multi-environment**: dev, test, prod; auto-detect; environment-specific
  config files
- **Multi-directory**: Multiple config dirs; load in order; priority control
- **Config loading**: TypeScript module (recommended), JSON, .env
- **Sync/async**: Async `load()` full support; sync `loadSync()` for JSON and
  .env
- **Merge**: Multi-dir merge; deep merge; array replace; env var override
- **Validation**: Schema validation; required fields; type check; custom rules
- **Hot reload**: Watch config changes; auto reload; update events
- **Service container**: `@dreamer/service` DI; `createConfigManager` factory

## Installation

```bash
deno add jsr:@dreamer/config
# client
deno add jsr:@dreamer/config/client
```

## Quick start

```typescript
import { createConfig } from "jsr:@dreamer/config";

const config = createConfig({
  configDir: "./config",
  env: "dev",
});
await config.load();
const dbHost = config.get("database.host");
```

- **Client**: [en-US](./docs/en-US/client/README.md) ·
  [zh-CN](./docs/zh-CN/client/README.md)
- **Test report**: [en-US](./docs/en-US/TEST_REPORT.md) ·
  [zh-CN](./docs/zh-CN/TEST_REPORT.md)

See [docs/en-US/README.md](./docs/en-US/README.md) or
[docs/zh-CN/README.md](./docs/zh-CN/README.md) for full documentation.

---

## License

Apache-2.0 - see [LICENSE](./LICENSE)
