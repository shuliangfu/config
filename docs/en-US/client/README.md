# @dreamer/config/client

> Config management library for the browser: unified config interface, browser
> storage, env vars, and API config.

[![JSR](https://jsr.io/badges/@dreamer/config/client)](https://jsr.io/@dreamer/config/client)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](../../../LICENSE)

---

## Server support

For server-side config, see [server docs](../README.md).

## Features

Client config library with a unified abstraction: browser storage
(localStorage/sessionStorage), env vars (import.meta.env, window.**ENV**), and
API config (fetch).

- **Browser storage**: localStorage/sessionStorage, custom key,
  serialize/deserialize
- **Env vars**: import.meta.env, window.**ENV**, prefix filter, mapping
- **API config**: fetch from server, cache, refresh, polling
- **Merge**: storage + env + API with priority (API > env > storage), deep
  merge, array replace
- **Validation**: Schema, required fields, types, custom rules, error messages
- **Update events**: storage event, config update notifications, hot update

## Installation

```bash
deno add jsr:@dreamer/config/client
```

## Quick start

### Browser storage

```typescript
import { createConfig } from "jsr:@dreamer/config/client";

const config = createConfig({
  storage: "localStorage",
  storageKey: "app_config",
});

await config.load();
const apiUrl = config.get("api.url");
config.set("app.theme", "dark");
await config.save();
```

### Env vars

```typescript
const config = createConfig({
  env: import.meta.env,
  envPrefix: "VITE_",
});
await config.load();
```

### API config

```typescript
const config = createConfig({
  apiUrl: "/api/config",
  cache: true,
  cacheTTL: 3600000,
});
await config.load();
await config.refresh();
```

### Multi-source merge

```typescript
const config = createConfig({
  storage: "localStorage",
  storageKey: "app_config",
  env: import.meta.env,
  envPrefix: "VITE_",
  apiUrl: "/api/config",
  cache: true,
});
await config.load();
```

### Validation

```typescript
import { createConfig, Schema } from "jsr:@dreamer/config/client";

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
const config = createConfig({ storage: "localStorage", schema: configSchema });
await config.load();
```

---

## License

Apache License 2.0 - see [LICENSE](../../../LICENSE)
