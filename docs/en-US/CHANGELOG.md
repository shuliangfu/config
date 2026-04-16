# Changelog

[English](./CHANGELOG.md) | [中文 (Chinese)](../zh-CN/CHANGELOG.md)

All notable changes to @dreamer/config are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.3] - 2026-04-17

### Added

- **Root re-exports**: `deleteEnv`, `getEnv`, `hasEnv`, and `setEnv` are
  re-exported from `@dreamer/runtime-adapter` at the package entry so callers
  can depend on `@dreamer/config` alone for process env access (still no
  automatic `.env` reads from these helpers).
- **Import-time preload**: The package entry runs `preloadDotEnvSync(["."])`
  once when `@dreamer/config` is first loaded, merging layered `.env` files from
  the current working directory into the process (same rules as manual preload).

### Changed

- **`preloadDotEnvSync`** (`applyToProcess` default): Merged values are applied
  when the process has no value for a key or only a blank/whitespace value, so
  empty shell exports (e.g. `DB_PASS=`) do not block values from `.env`.
- **Multi-directory `.env` merge**: When merging several directories, a later
  directory’s empty string for a key no longer overwrites a non-empty value from
  an earlier directory.
- **`PreloadDotEnvOptions`**: Clarified `override` vs default vacant-key
  behavior in comments.

---

## [1.0.2] - 2026-04-16

### Added

- **`preloadDotEnvSync`**: Synchronously merge layered `.env` files from
  multiple directories and optionally apply values to the process environment
  (`setEnv`; default does not override existing keys).
- **`collectDotEnvLayersSync`**: Read `.env`, `.env.{dev|test|prod}`, and
  optional `.env.{lowercased raw env}` for one directory without mutating the
  process.
- **`resolveConfigEnvFileSuffix`**: Map common `DENO_ENV` / `NODE_ENV` values to
  `dev` | `test` | `prod` for the middle `.env` layer (e.g. `development` →
  `.env.dev`).
- **`PreloadDotEnvOptions`** and **`ConfigEnvFileSuffix`** export types for the
  new APIs.

### Changed

- **`ConfigManager.load` / `loadSync` / `loadEnvFiles`**: `.env` loading now
  uses the same three-layer merge as `collectDotEnvLayersSync` (base, mapped
  suffix, raw env file when distinct).
- **Hot reload default**: Enabled when the resolved env file suffix is `dev` (so
  `development` still enables hot reload by default).
- **Constructor**: Also considers `BUN_ENV` when resolving the active
  environment string.
- **`deno.json`**: `nodeModulesDir: "auto"` for local test dependency
  resolution.

---

## [1.0.1] - 2026-02-18

### Changed

- **Docs**: Restructured into `docs/en-US/` and `docs/zh-CN/` (README,
  CHANGELOG, TEST_REPORT, client README). Root README shortened with links to
  docs.
- **License**: Explicitly Apache-2.0 in `deno.json` and documentation.

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
