# @dreamer/config

> A config management library compatible with Deno and Bun, providing a unified
> config interface and server-side config file management.

[![JSR](https://jsr.io/badges/@dreamer/config)](https://jsr.io/@dreamer/config)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](./LICENSE)
[![Tests: 47 passed](https://img.shields.io/badge/Tests-47%20passed-brightgreen)](./docs/en-US/TEST_REPORT.md)

📖 **Docs**: [English](./docs/en-US/README.md) |
[中文 (Chinese)](./docs/zh-CN/README.md)

**Changelog**: [en-US](./docs/en-US/CHANGELOG.md) |
[zh-CN](./docs/zh-CN/CHANGELOG.md)

**Latest (v1.0.1)**: Docs restructured (en-US/zh-CN); license Apache-2.0.

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
