# Changelog

All notable changes to @dreamer/config are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-02-06

### Added

- **Stable release**: First stable version with stable API

- **Multi-environment config**:
  - dev, test, prod environments
  - Auto environment detection
  - Environment-specific config files

- **Multi-directory support**:
  - Multiple config directories
  - Load in order with priority control
  - Later dirs override earlier

- **Config file loading**:
  - TypeScript module export (recommended, type-safe)
  - JSON config files
  - .env file support

- **Sync/async load**:
  - Async `load()` - full support (TypeScript, JSON, .env)
  - Sync `loadSync()` - JSON and .env only

- **Config merge**:
  - Multi-directory merge
  - Default + environment config merge
  - Deep merge, array replace
  - Environment variable override

- **Config validation**:
  - Schema validation
  - Required fields, type check
  - Custom validation rules
  - Validation error messages

- **Environment variable support**:
  - Auto-read env vars
  - Env override config values
  - Env mapping and prefix filter

- **Hot reload**:
  - Watch config file changes
  - Auto reload on change
  - Config update events
  - Auto-enable in dev

- **Service container integration**:
  - `@dreamer/service` dependency injection
  - Multiple ConfigManager instances
  - `createConfigManager` factory function

- **Client subpath**:
  - `/client` subpath for browser usage

### Compatibility

- Deno 2.5.0+
- Bun 1.0.0+
- Server: requires filesystem access
- Client: browser via `/client` subpath
