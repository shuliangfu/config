# @dreamer/config Test Report

[English](./TEST_REPORT.md) | [中文 (Chinese)](../zh-CN/TEST_REPORT.md)

## 📊 Test overview

| Item                | Value                                               |
| ------------------- | --------------------------------------------------- |
| **Package version** | `@dreamer/config@1.0.2`                             |
| **Command**         | From package root: `deno test -A tests/mod.test.ts` |
| **Environment**     | Deno 2.5+ (`nodeModulesDir: auto` in `deno.json`)   |
| **Test framework**  | `@dreamer/test`                                     |

---

## 🎯 Test results

### Overall statistics

| Metric             | Value                                          |
| ------------------ | ---------------------------------------------- |
| **Total tests**    | 52                                             |
| **Passed**         | 52                                             |
| **Failed**         | 0                                              |
| **Pass rate**      | 100%                                           |
| **Execution time** | On the order of tens of ms (machine-dependent) |

### Test file statistics

| Test file     | Tests | Passed | Failed | Status    |
| ------------- | ----- | ------ | ------ | --------- |
| `mod.test.ts` | 52    | 52     | 0      | ✅ Passed |

---

## 📋 Feature test details

### 1. load — 2 tests

| Scenario                                | Status |
| --------------------------------------- | ------ |
| Should load config file                 | ✅     |
| Should load environment-specific config | ✅     |

### 2. loadSync — 8 tests

| Scenario                                           | Status |
| -------------------------------------------------- | ------ |
| Should sync load JSON config file                  | ✅     |
| Should sync load environment-specific JSON config  | ✅     |
| Should sync load .env file                         | ✅     |
| Should sync load environment-specific .env file    | ✅     |
| Should sync merge JSON and .env config             | ✅     |
| Should sync merge config from multiple directories | ✅     |
| Should sync handle non-existent directory          | ✅     |
| Should sync handle non-existent config file        | ✅     |

### 3. get — 3 tests

| Scenario                       | Status |
| ------------------------------ | ------ |
| Should get config value        | ✅     |
| Should return default value    | ✅     |
| Should get nested config value | ✅     |

### 4. set — 2 tests

| Scenario                       | Status |
| ------------------------------ | ------ |
| Should set config value        | ✅     |
| Should set nested config value | ✅     |

### 5. getAll — 1 test

| Scenario                 | Status |
| ------------------------ | ------ |
| Should return all config | ✅     |

### 6. has — 1 test

| Scenario                      | Status |
| ----------------------------- | ------ |
| Should check if config exists | ✅     |

### 7. getEnv — 1 test

| Scenario                          | Status |
| --------------------------------- | ------ |
| Should return current environment | ✅     |

### 8. Multi-directory config — 1 test

| Scenario                                               | Status |
| ------------------------------------------------------ | ------ |
| Should merge config from multiple directories in order | ✅     |

### 9. .env file — 8 tests

| Scenario                                                       | Status |
| -------------------------------------------------------------- | ------ |
| Should load .env file                                          | ✅     |
| Should load environment-specific .env file                     | ✅     |
| When env is `development`, should load `.env.dev` (suffix map) | ✅     |
| Should ignore comments and empty lines in .env                 | ✅     |
| Should handle quotes in .env file                              | ✅     |
| Should support variable references in .env                     | ✅     |
| Should merge .env files from multiple directories              | ✅     |
| Should correctly merge .env with JSON config                   | ✅     |

### 10. Environment variables — 2 tests

| Scenario                                      | Status |
| --------------------------------------------- | ------ |
| Should read config from environment variables | ✅     |
| Should support environment variable prefix    | ✅     |

### 11. Config merge — 1 test

| Scenario                         | Status |
| -------------------------------- | ------ |
| Should deep merge nested objects | ✅     |

### 12. createConfigManager — 1 test

| Scenario                             | Status |
| ------------------------------------ | ------ |
| Should create ConfigManager instance | ✅     |

### 13. Hot reload — 2 tests

| Scenario                                | Status |
| --------------------------------------- | ------ |
| Should start and stop watching          | ✅     |
| Should invoke callback on config update | ✅     |

### 14. Edge cases — 3 tests

| Scenario                                | Status |
| --------------------------------------- | ------ |
| Should handle non-existent directory    | ✅     |
| Should handle empty config              | ✅     |
| Should handle deeply nested config keys | ✅     |

### 15. ServiceContainer integration — 6 tests

| Scenario                                            | Status |
| --------------------------------------------------- | ------ |
| Should get default manager name                     | ✅     |
| Should get custom manager name                      | ✅     |
| Should set and get service container                | ✅     |
| Should get ConfigManager from service container     | ✅     |
| Should return undefined when service does not exist | ✅     |
| Should support multiple ConfigManager instances     | ✅     |

### 16. createConfigManager factory — 5 tests

| Scenario                             | Status |
| ------------------------------------ | ------ |
| Should create ConfigManager instance | ✅     |
| Should use default name              | ✅     |
| Should use custom name               | ✅     |
| Should register in service container | ✅     |
| Should support load and get config   | ✅     |

### 17. Sync env API (layering & preload) — 3 tests

| Scenario                                                                          | Status |
| --------------------------------------------------------------------------------- | ------ |
| `resolveConfigEnvFileSuffix` should normalize common values                       | ✅     |
| `collectDotEnvLayersSync` should overlay `.env` / `.env.dev` / `.env.development` | ✅     |
| `preloadDotEnvSync` should write unset keys when `applyToProcess`                 | ✅     |

---

**Aligning with `deno test` totals:** The tables above list **50** business
`it()` cases. The runner reports **52 passed** because the framework also
registers teardown steps (e.g. `ConfigManager (afterAll)`, `@dreamer/test`
cleanup), which matches a normal `deno test -A tests/mod.test.ts` run.

---

## 📈 API coverage (summary)

| Capability                                                                   | Status |
| ---------------------------------------------------------------------------- | ------ |
| `ConfigManager.load` / `loadSync`                                            | ✅     |
| `get` / `set` / `getAll` / `has` / `getEnv`                                  | ✅     |
| Multi-dir merge, deep merge, env prefix                                      | ✅     |
| Layered `.env` (`.env`, `.env.{dev                                           | test   |
| `preloadDotEnvSync`, `resolveConfigEnvFileSuffix`, `collectDotEnvLayersSync` | ✅     |
| Hot reload, `ServiceContainer` integration, factory                          | ✅     |

---

## 📝 Conclusion

All **`deno test` totals (52)** for `@dreamer/config` pass — **50** business
`it()` cases are listed in the sections above, plus **2** framework teardown
steps. Coverage includes async/sync loading, layered `.env`, optional process
preload, get/set/merge, hot reload, and `@dreamer/service` integration.
Assertions and edge cases are defined in `tests/mod.test.ts`.

---

<div align="center">

**Pass rate: 100%** ✅

_52 tests | All passed_

</div>
