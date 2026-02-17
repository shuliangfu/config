# @dreamer/config Test Report

[English](./TEST_REPORT.md) | [中文 (Chinese)](../zh-CN/TEST_REPORT.md)

## 📊 Test Overview

| Item                          | Value                     |
| ----------------------------- | ------------------------- |
| **Config library version**    | `@dreamer/config@1.0.0`   |
| **Service container version** | `@dreamer/service@^1.0.0` |
| **Test framework**            | `@dreamer/test`           |
| **Test environment**          | Deno 2.5+, Bun 1.0+       |

---

## 🎯 Test Results

### Overall Statistics

| Metric             | Value |
| ------------------ | ----- |
| **Total tests**    | 47    |
| **Passed**         | 47    |
| **Failed**         | 0     |
| **Pass rate**      | 100%  |
| **Execution time** | ~0.8s |

### Test File Statistics

| Test File     | Tests | Passed | Failed | Status    |
| ------------- | ----- | ------ | ------ | --------- |
| `mod.test.ts` | 47    | 47     | 0      | ✅ Passed |

---

## 📋 Feature Test Details

### 1. load (mod.test.ts) - 2 tests

| Test Scenario                           | Status |
| --------------------------------------- | ------ |
| Should load config file                 | ✅     |
| Should load environment-specific config | ✅     |

### 2. loadSync (mod.test.ts) - 8 tests

| Test Scenario                                      | Status |
| -------------------------------------------------- | ------ |
| Should sync load JSON config file                  | ✅     |
| Should sync load environment-specific JSON config  | ✅     |
| Should sync load .env file                         | ✅     |
| Should sync load environment-specific .env file    | ✅     |
| Should sync merge JSON and .env config             | ✅     |
| Should sync merge config from multiple directories | ✅     |
| Should sync handle non-existent directory          | ✅     |
| Should sync handle non-existent config file        | ✅     |

### 3. get (mod.test.ts) - 3 tests

| Test Scenario                  | Status |
| ------------------------------ | ------ |
| Should get config value        | ✅     |
| Should return default value    | ✅     |
| Should get nested config value | ✅     |

### 4. set (mod.test.ts) - 2 tests

| Test Scenario                  | Status |
| ------------------------------ | ------ |
| Should set config value        | ✅     |
| Should set nested config value | ✅     |

### 5. getAll (mod.test.ts) - 1 test

| Test Scenario            | Status |
| ------------------------ | ------ |
| Should return all config | ✅     |

### 6. has (mod.test.ts) - 1 test

| Test Scenario                 | Status |
| ----------------------------- | ------ |
| Should check if config exists | ✅     |

### 7. getEnv (mod.test.ts) - 1 test

| Test Scenario                     | Status |
| --------------------------------- | ------ |
| Should return current environment | ✅     |

### 8. Multi-directory Config (mod.test.ts) - 1 test

| Test Scenario                                          | Status |
| ------------------------------------------------------ | ------ |
| Should merge config from multiple directories in order | ✅     |

### 9. .env File (mod.test.ts) - 7 tests

| Test Scenario                                     | Status |
| ------------------------------------------------- | ------ |
| Should load .env file                             | ✅     |
| Should load environment-specific .env file        | ✅     |
| Should ignore comments and empty lines in .env    | ✅     |
| Should handle quotes in .env file                 | ✅     |
| Should support variable references in .env        | ✅     |
| Should merge .env files from multiple directories | ✅     |
| Should correctly merge .env with JSON config      | ✅     |

### 10. Environment Variables (mod.test.ts) - 2 tests

| Test Scenario                                 | Status |
| --------------------------------------------- | ------ |
| Should read config from environment variables | ✅     |
| Should support environment variable prefix    | ✅     |

### 11. Config Merge (mod.test.ts) - 1 test

| Test Scenario                    | Status |
| -------------------------------- | ------ |
| Should deep merge nested objects | ✅     |

### 12. createConfigManager (mod.test.ts) - 1 test

| Test Scenario                        | Status |
| ------------------------------------ | ------ |
| Should create ConfigManager instance | ✅     |

### 13. Hot Reload (mod.test.ts) - 2 tests

| Test Scenario                           | Status |
| --------------------------------------- | ------ |
| Should start and stop watching          | ✅     |
| Should invoke callback on config update | ✅     |

### 14. Edge Cases (mod.test.ts) - 3 tests

| Test Scenario                           | Status |
| --------------------------------------- | ------ |
| Should handle non-existent directory    | ✅     |
| Should handle empty config              | ✅     |
| Should handle deeply nested config keys | ✅     |

### 15. ConfigManager ServiceContainer Integration (mod.test.ts) - 6 tests

| Test Scenario                                       | Status |
| --------------------------------------------------- | ------ |
| Should get default manager name                     | ✅     |
| Should get custom manager name                      | ✅     |
| Should set and get service container                | ✅     |
| Should get ConfigManager from service container     | ✅     |
| Should return undefined when service does not exist | ✅     |
| Should support multiple ConfigManager instances     | ✅     |

### 16. createConfigManager Factory (mod.test.ts) - 5 tests

| Test Scenario                        | Status |
| ------------------------------------ | ------ |
| Should create ConfigManager instance | ✅     |
| Should use default name              | ✅     |
| Should use custom name               | ✅     |
| Should register in service container | ✅     |
| Should support load and get config   | ✅     |

---

## 📈 Coverage Analysis

### API Method Coverage

| Class/Interface       | Method           | Status |
| --------------------- | ---------------- | ------ |
| `ConfigManager`       | `load`           | ✅     |
| `ConfigManager`       | `loadSync`       | ✅     |
| `ConfigManager`       | `get`            | ✅     |
| `ConfigManager`       | `set`            | ✅     |
| `ConfigManager`       | `getAll`         | ✅     |
| `ConfigManager`       | `has`            | ✅     |
| `ConfigManager`       | `getEnv`         | ✅     |
| `ConfigManager`       | `stopWatching`   | ✅     |
| `ConfigManager`       | `getName`        | ✅     |
| `ConfigManager`       | `setContainer`   | ✅     |
| `ConfigManager`       | `getContainer`   | ✅     |
| `ConfigManager`       | `fromContainer`  | ✅     |
| `createConfigManager` | Factory function | ✅     |

### Edge Case Coverage

| Scenario                      | Status |
| ----------------------------- | ------ |
| Non-existent directory        | ✅     |
| Empty config                  | ✅     |
| Deeply nested config keys     | ✅     |
| .env comments and empty lines | ✅     |
| .env quote handling           | ✅     |
| .env variable references      | ✅     |
| Service container not set     | ✅     |
| Service does not exist        | ✅     |

---

## ✨ Strengths

1. **Multi-format support**: JSON, TypeScript modules, and .env files
2. **Sync/async load**: Both `load()` async and `loadSync()` sync
3. **Multi-environment**: dev, test, prod auto-switching
4. **Deep merge**: Auto deep merge of nested config
5. **Hot reload**: Auto reload on config file changes
6. **Service container integration**: Dependency injection, multiple config
   instances
7. **Cross-runtime**: Deno and Bun compatible

---

## 📝 Conclusion

All 47 tests for @dreamer/config pass. Coverage includes config loading
(sync/async), get, set, merge, hot reload, and service container integration.
The library supports multiple config formats and multi-environment config with
flexible management.

---

<div align="center">

**Pass rate: 100%** ✅

_47 tests | All passed_

</div>
