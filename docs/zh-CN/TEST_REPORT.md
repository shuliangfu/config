# @dreamer/config 测试报告

[English](../en-US/TEST_REPORT.md) | 中文 (Chinese)

## 📊 测试概览

| 项目           | 值                      |
| -------------- | ----------------------- |
| **配置库版本** | `@dreamer/config@1.0.0` |
| **测试环境**   | Deno 2.5+、Bun 1.0+     |

---

## 🎯 测试结果

### 总体统计

| 指标         | 值    |
| ------------ | ----- |
| **总测试数** | 47    |
| **通过**     | 47    |
| **失败**     | 0     |
| **通过率**   | 100%  |
| **执行时间** | ~0.8s |

### 测试文件统计

| 测试文件      | 测试数 | 通过 | 失败 | 状态    |
| ------------- | ------ | ---- | ---- | ------- |
| `mod.test.ts` | 47     | 47   | 0    | ✅ 通过 |

---

## 📋 功能测试详情

### 1. load - 2 个测试

| 场景                                    | 状态 |
| --------------------------------------- | ---- |
| Should load config file                 | ✅   |
| Should load environment-specific config | ✅   |

### 2. loadSync - 8 个测试

| 场景                                               | 状态 |
| -------------------------------------------------- | ---- |
| Should sync load JSON config file                  | ✅   |
| Should sync load environment-specific JSON config  | ✅   |
| Should sync load .env file                         | ✅   |
| Should sync load environment-specific .env file    | ✅   |
| Should sync merge JSON and .env config             | ✅   |
| Should sync merge config from multiple directories | ✅   |
| Should sync handle non-existent directory          | ✅   |
| Should sync handle non-existent config file        | ✅   |

### 3. get - 3 个测试

| 场景                           | 状态 |
| ------------------------------ | ---- |
| Should get config value        | ✅   |
| Should return default value    | ✅   |
| Should get nested config value | ✅   |

### 4. set - 2 个测试

| 场景                           | 状态 |
| ------------------------------ | ---- |
| Should set config value        | ✅   |
| Should set nested config value | ✅   |

### 5. getAll - 1 个测试

| 场景                     | 状态 |
| ------------------------ | ---- |
| Should return all config | ✅   |

### 6. has - 1 个测试

| 场景                          | 状态 |
| ----------------------------- | ---- |
| Should check if config exists | ✅   |

### 7. getEnv - 1 个测试

| 场景                              | 状态 |
| --------------------------------- | ---- |
| Should return current environment | ✅   |

### 8. 多目录配置 - 1 个测试

| 场景                                                   | 状态 |
| ------------------------------------------------------ | ---- |
| Should merge config from multiple directories in order | ✅   |

### 9. .env 文件 - 7 个测试

| 场景                                              | 状态 |
| ------------------------------------------------- | ---- |
| Should load .env file                             | ✅   |
| Should load environment-specific .env file        | ✅   |
| Should ignore comments and empty lines in .env    | ✅   |
| Should handle quotes in .env file                 | ✅   |
| Should support variable references in .env        | ✅   |
| Should merge .env files from multiple directories | ✅   |
| Should correctly merge .env with JSON config      | ✅   |

### 10. 环境变量 - 2 个测试

| 场景                                          | 状态 |
| --------------------------------------------- | ---- |
| Should read config from environment variables | ✅   |
| Should support environment variable prefix    | ✅   |

### 11. 配置合并 - 1 个测试

| 场景                             | 状态 |
| -------------------------------- | ---- |
| Should deep merge nested objects | ✅   |

### 12. createConfigManager - 1 个测试

| 场景                                 | 状态 |
| ------------------------------------ | ---- |
| Should create ConfigManager instance | ✅   |

### 13. 热重载 - 2 个测试

| 场景                                    | 状态 |
| --------------------------------------- | ---- |
| Should start and stop watching          | ✅   |
| Should invoke callback on config update | ✅   |

### 14. 边界情况 - 3 个测试

| 场景                                    | 状态 |
| --------------------------------------- | ---- |
| Should handle non-existent directory    | ✅   |
| Should handle empty config              | ✅   |
| Should handle deeply nested config keys | ✅   |

### 15. ServiceContainer 集成 - 6 个测试

| 场景                                                | 状态 |
| --------------------------------------------------- | ---- |
| Should get default manager name                     | ✅   |
| Should get custom manager name                      | ✅   |
| Should set and get service container                | ✅   |
| Should get ConfigManager from service container     | ✅   |
| Should return undefined when service does not exist | ✅   |
| Should support multiple ConfigManager instances     | ✅   |

### 16. createConfigManager 工厂 - 5 个测试

| 场景                                 | 状态 |
| ------------------------------------ | ---- |
| Should create ConfigManager instance | ✅   |
| Should use default name              | ✅   |
| Should use custom name               | ✅   |
| Should register in service container | ✅   |
| Should support load and get config   | ✅   |

---

## 📝 结论

@dreamer/config 共 47
个测试全部通过。覆盖配置加载（同步/异步）、get/set、合并、热重载及服务容器集成，支持多格式与多环境配置。

---

<div align="center">

**通过率：100%** ✅

_47 个测试 | 全部通过_

</div>
