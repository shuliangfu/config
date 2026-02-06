# @dreamer/config

> A config management library compatible with Deno and Bun, providing a unified config interface and server-side config file management

English | [中文 (Chinese)](./README-zh.md)

[![JSR](https://jsr.io/badges/@dreamer/config)](https://jsr.io/@dreamer/config)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE.md)
[![Tests: 47 passed](https://img.shields.io/badge/Tests-47%20passed-brightgreen)](./TEST_REPORT.md)

---

## 🎯 Features

Config management library with a unified config abstraction layer, supporting server-side config files (JSON, .env, TypeScript modules).

---

## ✨ Characteristics

| Feature | Description |
|---------|-------------|
| 🌍 **Multi-environment** | dev, test, prod; auto-detect; environment-specific config files |
| 📁 **Multi-directory** | Multiple config dirs; load in order; priority control |
| 📝 **Config loading** | TypeScript module export (recommended, type-safe); JSON; .env |
| ⚡ **Sync/async load** | Async `load()` full support; sync `loadSync()` for JSON and .env |
| 🔀 **Config merge** | Multi-dir merge; default + env merge; deep merge; array replace; env var override |
| ✅ **Config validation** | Schema validation; required fields; type check; custom rules; error messages |
| 🔐 **Env vars** | Auto-read env vars; env override config; env mapping; prefix filter |
| 🔄 **Hot reload** | Watch config changes; auto reload; update events; auto-enable in dev |
| 🔗 **Service container** | `@dreamer/service` DI; multiple ConfigManager; `createConfigManager` factory |

---

## 🎨 Design Principles

**All @dreamer/* packages follow these principles**:

- **Main package (@dreamer/xxx)**: Server-side (Deno and Bun compatible)
- **Client subpackage (@dreamer/xxx/client)**: Client-side (browser)

This provides:

- Clear separation of server and client code
- Avoid server deps in client code
- Better type safety and hints
- Better tree-shaking

---

## 🎯 Use Cases

- **App config**: Database connection, API keys, etc.
- **Env var management**: Multi-environment deployment
- **Config file management**: Centralized app config

---

## 📦 Installation

### Deno

```bash
deno add jsr:@dreamer/config
```

### Bun

```bash
bunx jsr add @dreamer/config
```

---

## 🌍 Environment Compatibility

| Environment | Version | Status |
|-------------|---------|--------|
| **Deno** | 2.5+ | ✅ Fully supported |
| **Bun** | 1.0+ | ✅ Fully supported |
| **Server** | - | ✅ Supported (Deno/Bun, requires filesystem access) |
| **Client** | - | ✅ Supported (browser via `/client` subpath) |

| Dependency | Package | Description |
|-------------|---------|-------------|
| **Core** | - | 📦 No external deps (pure TypeScript) |
| **Optional** | `jsr:@dreamer/service@^1.0.0-beta.4` | 📦 Service container integration |

---

## 🚀 Quick Start

### Basic Usage

```typescript
import { ConfigManager, createConfig } from "jsr:@dreamer/config";

// Option 1: Single config directory
// Uses TypeScript module (mod.ts) if present (recommended)
// Falls back to config.json if no mod.ts
const config = createConfig({
  configDir: "./config", // Config directory
  env: "dev", // Optional: manual env (dev, test, prod)
});

// Option 2: Multiple config directories (later dirs override earlier)
const config = createConfig({
  configDirs: [
    "./config/base", // Base config (lowest priority)
    "./config/modules", // Module config (overrides base)
    "./config/local", // Local config (highest priority)
  ],
  env: "dev",
});

// Async load (TypeScript module, JSON, .env)
await config.load();

// Get config
const dbHost = config.get("database.host");
const dbPort = config.get("database.port");
const apiKey = config.get("api.key");

// Get nested config
const dbConfig = config.get("database");
// { host: "localhost", port: 5432, name: "mydb" }
```

### Sync Load

For JSON and .env only, use sync load:

```typescript
import { ConfigManager } from "jsr:@dreamer/config";

const config = new ConfigManager({
  directories: ["./config"],
  env: "dev",
  hotReload: false,
});

// Sync load (JSON and .env only, no TypeScript modules)
config.loadSync();

// Use config immediately
const dbHost = config.get("database.host");
console.log(`Database host: ${dbHost}`);
```

> **Note**: `loadSync()` does not support TypeScript module config (`mod.ts`) because dynamic `import()` is async. Use async `load()` for TypeScript modules.

### Config File Structure

**config/mod.ts** (default config):

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

**config/mod.dev.ts** (dev environment config):

```typescript
import baseConfig from "./mod.ts";

export default {
  ...baseConfig,
  app: {
    ...baseConfig.app,
    port: 3001, // Override default port
  },
  database: {
    ...baseConfig.database,
    port: 5433, // Override default port
  },
};
```

### Config Validation

```typescript
import { createConfig, Schema } from "jsr:@dreamer/config";

// Define config schema
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
  schema: configSchema, // Validation schema
});

// Validation runs on load
try {
  await config.load();
} catch (error) {
  // Validation failed
  console.error("Config validation failed:", error);
}
```

### Service Container Integration

```typescript
import { ServiceContainer } from "jsr:@dreamer/service";
import { createConfig } from "jsr:@dreamer/config";

// Create service container
const container = new ServiceContainer();

// Create config manager
const config = createConfig({
  configDirs: [
    "./config/base",
    "./config/modules",
    "./config/local",
  ],
  env: process.env.DENO_ENV || "dev",
  watch: process.env.DENO_ENV === "dev",
});

// Load config
await config.load();

// Register in service container
container.registerSingleton("config", config);

// Use config in other services
container.registerSingleton("databaseService", () => {
  const config = container.get("config");
  return new DatabaseService({
    host: config.get("database.host"),
    port: config.get("database.port"),
  });
});
```

---

## 📚 API Reference

### createConfig

Create config manager.

**Options**:

- `configDir?: string`: Single config directory
- `configDirs?: string[]`: Multiple directories (later overrides earlier)
- `env?: string`: Environment (dev, test, prod)
- `schema?: Schema`: Validation schema
- `watch?: boolean`: Watch config files (default: enabled in dev)

### ConfigManager

Config manager class.

**Methods**:

| Method | Description |
|--------|-------------|
| `get(key, defaultValue?)` | Get config value (dot path, e.g. `"database.host"`) |
| `set(key, value)` | Set config value |
| `has(key)` | Check if key exists |
| `getAll()` | Get all config |
| `getEnv()` | Get current environment |
| `load()` | Async load (TypeScript module, JSON, .env) |
| `loadSync()` | Sync load (JSON and .env only, no TS modules) |
| `stopWatching()` | Stop file watching |
| `getName()` | Get manager name |
| `setContainer(container)` | Set service container |
| `getContainer()` | Get service container |
| `static fromContainer(container, name?)` | Get ConfigManager from container |

### ServiceContainer Integration Example

```typescript
import { ConfigManager, createConfigManager } from "jsr:@dreamer/config";
import { ServiceContainer } from "jsr:@dreamer/service";

// Create service container
const container = new ServiceContainer();

// Register ConfigManager
container.registerSingleton("config:main", () => {
  const manager = createConfigManager({
    name: "main",
    directories: ["./config"],
    hotReload: false,
  });
  manager.setContainer(container);
  return manager;
});

// Get from container
const manager = container.get<ConfigManager>("config:main");
await manager.load();

// Or use static method
const sameManager = ConfigManager.fromContainer(container, "main");
```

---

## 🌐 Client Support

See [client/README.md](./src/client/README.md) for client config support.

---

## 📊 Test Report

[![Tests: 47 passed](https://img.shields.io/badge/Tests-47%20passed-brightgreen)](./TEST_REPORT.md)

| Test Category | Count | Status |
|---------------|-------|--------|
| load | 2 | ✅ Passed |
| loadSync | 8 | ✅ Passed |
| get/set/has/getAll | 7 | ✅ Passed |
| getEnv | 1 | ✅ Passed |
| Multi-directory config | 1 | ✅ Passed |
| .env file | 7 | ✅ Passed |
| Environment variables | 2 | ✅ Passed |
| Config merge | 1 | ✅ Passed |
| Hot reload | 2 | ✅ Passed |
| Edge cases | 3 | ✅ Passed |
| ServiceContainer integration | 6 | ✅ Passed |
| createConfigManager factory | 5 | ✅ Passed |
| **Total** | **47** | ✅ **100%** |

See [TEST_REPORT.md](./TEST_REPORT.md) for details.

---

## 📝 Notes

- **Server/client separation**: `/client` subpath for client code
- **Server**: Config file management (JSON, .env, TypeScript modules), filesystem API
- **Unified API**: Similar API for server and client
- **Type-safe**: Full TypeScript support
- **No external deps**: Pure TypeScript

---

## 🤝 Contributing

Issues and Pull Requests welcome!

---

## 📄 License

MIT License - see [LICENSE.md](./LICENSE.md)

---

<div align="center">

**Made with ❤️ by Dreamer Team**

</div>
