/**
 * @module @dreamer/config
 *
 * 配置管理库，提供统一的配置抽象层，支持服务端配置文件管理。
 *
 * 特性：
 * - 多环境配置（dev、test、prod）
 * - 多目录支持（按优先级合并）
 * - 配置文件加载（TypeScript 模块或 JSON）
 * - .env 文件支持
 * - 配置合并（深度合并）
 * - 配置验证（Schema 验证）
 * - 环境变量支持
 * - 配置热重载
 *
 * 环境兼容性：
 * - 服务端：✅ 支持（Deno 和 Bun 运行时）
 * - 客户端：✅ 支持（浏览器环境，通过 `jsr:@dreamer/config/client` 使用）
 */

import {
  existsSync,
  type FileWatcher,
  getEnv,
  getEnvAll,
  readTextFile,
  readTextFileSync,
  realPath,
  stat,
  watchFs,
} from "@dreamer/runtime-adapter";
import type { ServiceContainer } from "@dreamer/service";

/**
 * 配置管理器选项
 */
export interface ConfigManagerOptions {
  /** 管理器名称（用于服务容器识别） */
  name?: string;
  /** 配置目录（可以是多个，按顺序加载，后面的覆盖前面的） */
  directories?: string[];
  /** 环境（dev、test、prod） */
  env?: string;
  /** 环境变量前缀（只读取带此前缀的环境变量） */
  envPrefix?: string;
  /** 是否启用热重载（默认：开发环境启用） */
  hotReload?: boolean;
  /** 配置更新回调 */
  onUpdate?: ((config: Record<string, unknown>) => void) | undefined;
}

/**
 * 深度合并对象
 */
function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...target };

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (
        typeof sourceValue === "object" &&
        sourceValue !== null &&
        !Array.isArray(sourceValue) &&
        typeof targetValue === "object" &&
        targetValue !== null &&
        !Array.isArray(targetValue)
      ) {
        // 递归合并嵌套对象
        result[key] = deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>,
        );
      } else {
        // 数组和基本类型直接替换
        result[key] = sourceValue;
      }
    }
  }

  return result;
}

/**
 * 解析 .env 文件内容
 */
function parseEnvFile(content: string): Record<string, string> {
  const env: Record<string, string> = {};
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    // 跳过空行和注释
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const equalIndex = trimmed.indexOf("=");
    if (equalIndex === -1) {
      continue;
    }

    const key = trimmed.substring(0, equalIndex).trim();
    let value = trimmed.substring(equalIndex + 1).trim();

    // 移除引号
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // 展开变量引用 ${VAR}
    value = value.replace(/\${([^}]+)}/g, (_, varName) => {
      return getEnv(varName.trim()) || "";
    });

    env[key] = value;
  }

  return env;
}

/**
 * 加载 .env 文件（异步版本）
 */
async function loadEnvFile(filePath: string): Promise<Record<string, string>> {
  try {
    const content = await readTextFile(filePath);
    return parseEnvFile(content);
  } catch {
    return {};
  }
}

/**
 * 加载 .env 文件（同步版本）
 * @param filePath .env 文件路径
 * @returns 解析后的环境变量对象
 */
function loadEnvFileSync(filePath: string): Record<string, string> {
  try {
    const content = readTextFileSync(filePath);
    return parseEnvFile(content);
  } catch {
    return {};
  }
}

/**
 * 加载 JSON 配置文件（异步版本）
 */
async function loadJsonConfig(
  filePath: string,
): Promise<Record<string, unknown> | null> {
  try {
    const content = await readTextFile(filePath);
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * 加载 JSON 配置文件（同步版本）
 * @param filePath JSON 配置文件路径
 * @returns 解析后的配置对象，失败返回 null
 */
function loadJsonConfigSync(
  filePath: string,
): Record<string, unknown> | null {
  try {
    const content = readTextFileSync(filePath);
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * 加载 TypeScript 模块配置
 */
async function loadModuleConfig(
  filePath: string,
): Promise<Record<string, unknown> | null> {
  try {
    // 动态导入模块
    const resolvedPath = await realPath(filePath);
    const module = await import(`file://${resolvedPath}`);
    // 优先使用 default 导出，否则使用命名导出
    return module.default || module;
  } catch {
    return null;
  }
}

/**
 * 检查文件是否存在
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * 从环境变量读取配置
 */
function loadEnvConfig(
  prefix?: string,
): Record<string, unknown> {
  const config: Record<string, unknown> = {};
  const envPrefix = prefix || "";

  for (const [key, value] of Object.entries(getEnvAll())) {
    if (!envPrefix || key.startsWith(envPrefix)) {
      // 移除前缀
      const configKey = envPrefix ? key.substring(envPrefix.length) : key;
      // 转换为嵌套对象（APP_DATABASE_URL -> database.url）
      const keys = configKey.toLowerCase().split("_");
      let current = config;

      for (const k of keys.slice(0, -1)) {
        // 如果当前值不是对象，创建一个新对象
        if (
          !current[k] || typeof current[k] !== "object" ||
          Array.isArray(current[k])
        ) {
          current[k] = {};
        }
        current = current[k] as Record<string, unknown>;
      }

      current[keys[keys.length - 1]] = value;
    }
  }

  return config;
}

/**
 * 配置管理器（服务端）
 */
export class ConfigManager {
  /** 配置选项 */
  private options: Omit<Required<ConfigManagerOptions>, "onUpdate" | "name"> & {
    onUpdate?: (config: Record<string, unknown>) => void;
    env: string;
  };
  /** 配置数据 */
  private config: Record<string, unknown> = {};
  /** 文件监听器列表 */
  private watchers: FileWatcher[] = [];
  /** 服务容器实例 */
  private container?: ServiceContainer;
  /** 管理器名称 */
  private readonly managerName: string;

  /**
   * 创建 ConfigManager 实例
   * @param options 配置选项
   */
  constructor(options: ConfigManagerOptions = {}) {
    const env = options.env || getEnv("DENO_ENV") ||
      getEnv("NODE_ENV") || "dev";
    this.options = {
      directories: options.directories || ["./config"],
      env,
      envPrefix: options.envPrefix || "",
      hotReload: options.hotReload !== undefined
        ? options.hotReload
        : env === "dev",
      onUpdate: options.onUpdate,
    };
    this.managerName = options.name || "default";
  }

  /**
   * 获取管理器名称
   * @returns 管理器名称
   */
  getName(): string {
    return this.managerName;
  }

  /**
   * 设置服务容器
   * @param container 服务容器实例
   */
  setContainer(container: ServiceContainer): void {
    this.container = container;
  }

  /**
   * 获取服务容器
   * @returns 服务容器实例，如果未设置则返回 undefined
   */
  getContainer(): ServiceContainer | undefined {
    return this.container;
  }

  /**
   * 从服务容器创建 ConfigManager 实例
   * @param container 服务容器实例
   * @param name 管理器名称（默认 "default"）
   * @returns 关联了服务容器的 ConfigManager 实例
   */
  static fromContainer(
    container: ServiceContainer,
    name = "default",
  ): ConfigManager | undefined {
    const serviceName = `config:${name}`;
    return container.tryGet<ConfigManager>(serviceName);
  }

  /**
   * 获取当前环境
   */
  getEnv(): string {
    return this.options.env;
  }

  /**
   * 加载配置
   */
  async load(): Promise<void> {
    let mergedConfig: Record<string, unknown> = {};

    // 1. 按目录顺序加载配置（后面的覆盖前面的）
    for (const dir of this.options.directories) {
      const dirConfig = await this.loadDirectoryConfig(dir);
      mergedConfig = deepMerge(mergedConfig, dirConfig);
    }

    // 2. 加载 .env 文件
    const envConfig = await this.loadEnvFiles();
    mergedConfig = deepMerge(mergedConfig, envConfig);

    // 3. 环境变量覆盖（最高优先级）
    const envVars = loadEnvConfig(this.options.envPrefix);
    mergedConfig = deepMerge(mergedConfig, envVars);

    this.config = mergedConfig;

    // 4. 启用热重载
    if (this.options.hotReload) {
      this.startWatching();
    }
  }

  /**
   * 同步加载配置
   *
   * 注意：同步版本仅支持 JSON 配置文件和 .env 文件，不支持 TypeScript 模块配置。
   * 如果需要加载 TypeScript 模块配置（mod.ts），请使用异步的 `load()` 方法。
   *
   * 加载优先级（从低到高）：
   * 1. 默认 JSON 配置（config.json）
   * 2. 环境特定 JSON 配置（config.{env}.json）
   * 3. 默认 .env 文件
   * 4. 环境特定 .env 文件（.env.{env}）
   * 5. 环境变量（最高优先级）
   *
   * @example
   * ```typescript
   * const config = new ConfigManager({ directories: ["./config"] });
   * config.loadSync();
   * console.log(config.get("database.host"));
   * ```
   */
  loadSync(): void {
    let mergedConfig: Record<string, unknown> = {};

    // 1. 按目录顺序加载 JSON 配置（后面的覆盖前面的）
    for (const dir of this.options.directories) {
      // 加载默认 JSON 配置
      const defaultJsonPath = `${dir}/config.json`;
      if (existsSync(defaultJsonPath)) {
        const defaultConfig = loadJsonConfigSync(defaultJsonPath);
        if (defaultConfig) {
          mergedConfig = deepMerge(mergedConfig, defaultConfig);
        }
      }

      // 加载环境特定 JSON 配置
      const envJsonPath = `${dir}/config.${this.options.env}.json`;
      if (existsSync(envJsonPath)) {
        const envConfig = loadJsonConfigSync(envJsonPath);
        if (envConfig) {
          mergedConfig = deepMerge(mergedConfig, envConfig);
        }
      }
    }

    // 2. 加载 .env 文件
    for (const dir of this.options.directories) {
      // 加载默认 .env
      const defaultEnvPath = `${dir}/.env`;
      const defaultEnv = loadEnvFileSync(defaultEnvPath);
      mergedConfig = deepMerge(mergedConfig, defaultEnv);

      // 加载环境特定 .env
      const envPath = `${dir}/.env.${this.options.env}`;
      const envFileConfig = loadEnvFileSync(envPath);
      mergedConfig = deepMerge(mergedConfig, envFileConfig);
    }

    // 3. 环境变量覆盖（最高优先级）
    const envVars = loadEnvConfig(this.options.envPrefix);
    mergedConfig = deepMerge(mergedConfig, envVars);

    this.config = mergedConfig;

    // 4. 启用热重载
    if (this.options.hotReload) {
      this.startWatching();
    }
  }

  /**
   * 加载目录配置（异步版本，支持 TypeScript 模块）
   */
  private async loadDirectoryConfig(
    directory: string,
  ): Promise<Record<string, unknown>> {
    let config: Record<string, unknown> = {};

    // 检查是否存在 mod.ts（TypeScript 模块）
    const modPath = `${directory}/mod.ts`;
    if (await fileExists(modPath)) {
      const moduleConfig = await loadModuleConfig(modPath);
      if (moduleConfig) {
        config = deepMerge(config, moduleConfig);
      }
    } else {
      // 加载默认 JSON 配置
      const defaultJsonPath = `${directory}/config.json`;
      const defaultConfig = await loadJsonConfig(defaultJsonPath);
      if (defaultConfig) {
        config = deepMerge(config, defaultConfig);
      }
    }

    // 加载环境特定配置
    const envModPath = `${directory}/mod.${this.options.env}.ts`;
    if (await fileExists(envModPath)) {
      const envModuleConfig = await loadModuleConfig(envModPath);
      if (envModuleConfig) {
        config = deepMerge(config, envModuleConfig);
      }
    } else {
      const envJsonPath = `${directory}/config.${this.options.env}.json`;
      const envConfig = await loadJsonConfig(envJsonPath);
      if (envConfig) {
        config = deepMerge(config, envConfig);
      }
    }

    return config;
  }

  /**
   * 加载 .env 文件
   */
  private async loadEnvFiles(): Promise<Record<string, unknown>> {
    const env: Record<string, unknown> = {};

    // 加载默认 .env
    for (const dir of this.options.directories) {
      const defaultEnvPath = `${dir}/.env`;
      const defaultEnv = await loadEnvFile(defaultEnvPath);
      Object.assign(env, defaultEnv);
    }

    // 加载环境特定 .env
    for (const dir of this.options.directories) {
      const envPath = `${dir}/.env.${this.options.env}`;
      const envFile = await loadEnvFile(envPath);
      Object.assign(env, envFile);
    }

    return env;
  }

  /**
   * 启动文件监听
   */
  private startWatching(): void {
    for (const dir of this.options.directories) {
      try {
        const watcher = watchFs(dir);
        this.watchers.push(watcher);

        // 异步处理文件变化
        (async () => {
          for await (const event of watcher) {
            if (event.kind === "modify" || event.kind === "create") {
              // 延迟重新加载，避免频繁触发
              setTimeout(async () => {
                await this.load();
                if (this.options.onUpdate) {
                  this.options.onUpdate(this.config);
                }
              }, 100);
            }
          }
        })();
      } catch {
        // 忽略监听错误
      }
    }
  }

  /**
   * 停止监听
   */
  stopWatching(): void {
    for (const watcher of this.watchers) {
      watcher.close();
    }
    this.watchers = [];
  }

  /**
   * 获取配置值
   */
  get<T = unknown>(key: string, defaultValue?: T): T {
    const keys = key.split(".");
    let value: unknown = this.config;

    for (const k of keys) {
      if (
        typeof value === "object" &&
        value !== null &&
        k in (value as Record<string, unknown>)
      ) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return defaultValue as T;
      }
    }

    return (value as T) ?? (defaultValue as T);
  }

  /**
   * 设置配置值
   */
  set(key: string, value: unknown): void {
    const keys = key.split(".");
    let current = this.config;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!current[k] || typeof current[k] !== "object") {
        current[k] = {};
      }
      current = current[k] as Record<string, unknown>;
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * 获取所有配置
   */
  getAll(): Record<string, unknown> {
    return { ...this.config };
  }

  /**
   * 检查配置是否存在
   */
  has(key: string): boolean {
    const keys = key.split(".");
    let value: unknown = this.config;

    for (const k of keys) {
      if (
        typeof value === "object" &&
        value !== null &&
        k in (value as Record<string, unknown>)
      ) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return false;
      }
    }

    return true;
  }
}

/**
 * 创建配置管理器实例
 */
export function createConfigManager(
  options?: ConfigManagerOptions,
): ConfigManager {
  return new ConfigManager(options);
}
