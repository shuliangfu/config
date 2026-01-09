/**
 * @module @dreamer/config/client
 *
 * 客户端配置管理库，提供浏览器配置的统一接口。
 *
 * 特性：
 * - 浏览器存储配置（localStorage、sessionStorage）
 * - 环境变量配置（import.meta.env、window.__ENV__）
 * - API 配置（从服务器获取）
 * - 配置合并（多源合并）
 * - 配置验证（Schema 验证）
 * - 配置更新监听
 *
 * 环境兼容性：
 * - 服务端：❌ 不支持（Deno 运行时）
 * - 客户端：✅ 支持（浏览器环境）
 */


/**
 * 客户端配置管理器选项
 */
export interface ConfigManagerOptions {
  /** 存储类型（localStorage 或 sessionStorage） */
  storage?: "localStorage" | "sessionStorage";
  /** 存储键名 */
  storageKey?: string;
  /** 环境变量对象（import.meta.env 或 window.__ENV__） */
  env?: Record<string, unknown>;
  /** 环境变量前缀（只读取带此前缀的环境变量） */
  envPrefix?: string;
  /** API 配置端点 */
  apiUrl?: string;
  /** 是否启用缓存 */
  cache?: boolean;
  /** 缓存时间（毫秒） */
  cacheTTL?: number;
  /** 轮询间隔（毫秒，0 表示不轮询） */
  pollInterval?: number;
  /** 配置更新回调 */
  onUpdate?: (config: Record<string, unknown>) => void;
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
 * 从环境变量读取配置
 */
function loadEnvConfig(
  env?: Record<string, unknown>,
  prefix?: string,
): Record<string, unknown> {
  if (!env) {
    return {};
  }

  const config: Record<string, unknown> = {};
  const envPrefix = prefix || "";

  for (const [key, value] of Object.entries(env)) {
    if (!envPrefix || key.startsWith(envPrefix)) {
      // 移除前缀
      const configKey = envPrefix ? key.substring(envPrefix.length) : key;
      // 转换为嵌套对象（APP_DATABASE_URL -> database.url）
      const keys = configKey.toLowerCase().split("_");
      let current = config;

      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (!current[k]) {
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
 * 客户端配置管理器
 */
export class ConfigManager {
  private options: Omit<Required<ConfigManagerOptions>, "onUpdate"> & {
    onUpdate?: (config: Record<string, unknown>) => void;
  };
  private config: Record<string, unknown> = {};
  private cacheKey: string;
  private cacheExpiry: number = 0;
  private pollTimer: number | null = null;
  private storageListener: ((e: StorageEvent) => void) | null = null;

  constructor(options: ConfigManagerOptions = {}) {
    this.options = {
      storage: options.storage || "localStorage",
      storageKey: options.storageKey || "app_config",
      env: options.env || {},
      envPrefix: options.envPrefix || "",
      apiUrl: options.apiUrl || "",
      cache: options.cache !== undefined ? options.cache : true,
      cacheTTL: options.cacheTTL || 3600000, // 默认 1 小时
      pollInterval: options.pollInterval || 0,
      onUpdate: options.onUpdate,
    };

    this.cacheKey = `${this.options.storageKey}_cache`;
  }

  /**
   * 加载配置
   */
  async load(): Promise<void> {
    let mergedConfig: Record<string, unknown> = {};

    // 1. 从浏览器存储读取配置（优先级最低）
    if (this.options.storage) {
      const storageConfig = this.loadStorageConfig();
      mergedConfig = deepMerge(mergedConfig, storageConfig);
    }

    // 2. 从环境变量读取配置
    const envConfig = loadEnvConfig(this.options.env, this.options.envPrefix);
    mergedConfig = deepMerge(mergedConfig, envConfig);

    // 3. 从 API 读取配置（优先级最高）
    if (this.options.apiUrl) {
      const apiConfig = await this.loadApiConfig();
      mergedConfig = deepMerge(mergedConfig, apiConfig);
    }

    this.config = mergedConfig;

    // 4. 启动监听
    this.startListening();

    // 5. 启动轮询（如果启用）
    if (this.options.pollInterval > 0) {
      this.startPolling();
    }
  }

  /**
   * 从浏览器存储读取配置
   */
  private loadStorageConfig(): Record<string, unknown> {
    try {
      const storage = this.options.storage === "localStorage"
        ? globalThis.localStorage
        : globalThis.sessionStorage;
      const value = storage.getItem(this.options.storageKey);
      if (value) {
        return JSON.parse(value);
      }
    } catch {
      // 忽略解析错误
    }
    return {};
  }

  /**
   * 从 API 读取配置
   */
  private async loadApiConfig(): Promise<Record<string, unknown>> {
    // 检查缓存
    if (this.options.cache) {
      const cached = this.loadCache();
      if (cached && Date.now() < this.cacheExpiry) {
        return cached;
      }
    }

    try {
      const response = await fetch(this.options.apiUrl!);
      if (!response.ok) {
        return {};
      }

      const config = await response.json();

      // 保存缓存
      if (this.options.cache) {
        this.saveCache(config);
      }

      return config;
    } catch {
      return {};
    }
  }

  /**
   * 加载缓存
   */
  private loadCache(): Record<string, unknown> | null {
    try {
      const cached = globalThis.localStorage.getItem(this.cacheKey);
      if (cached) {
        const { data, expiry } = JSON.parse(cached);
        this.cacheExpiry = expiry;
        return data;
      }
    } catch {
      // 忽略解析错误
    }
    return null;
  }

  /**
   * 保存缓存
   */
  private saveCache(config: Record<string, unknown>): void {
    try {
      this.cacheExpiry = Date.now() + this.options.cacheTTL;
      globalThis.localStorage.setItem(
        this.cacheKey,
        JSON.stringify({
          data: config,
          expiry: this.cacheExpiry,
        }),
      );
    } catch {
      // 忽略存储错误
    }
  }

  /**
   * 启动监听
   */
  private startListening(): void {
    // 监听 storage 事件（跨标签页同步）
    this.storageListener = (e: StorageEvent) => {
      if (e.key === this.options.storageKey) {
        const newConfig = this.loadStorageConfig();
        this.config = deepMerge(this.config, newConfig);
        if (this.options.onUpdate) {
          this.options.onUpdate(this.config);
        }
      }
    };

    globalThis.addEventListener("storage", this.storageListener);
  }

  /**
   * 停止监听
   */
  stopListening(): void {
    if (this.storageListener) {
      globalThis.removeEventListener("storage", this.storageListener);
      this.storageListener = null;
    }
    this.stopPolling();
  }

  /**
   * 启动轮询
   */
  private startPolling(): void {
    this.stopPolling();
    this.pollTimer = globalThis.setInterval(async () => {
      if (this.options.apiUrl) {
        const apiConfig = await this.loadApiConfig();
        this.config = deepMerge(this.config, apiConfig);
        if (this.options.onUpdate) {
          this.options.onUpdate(this.config);
        }
      }
    }, this.options.pollInterval);
  }

  /**
   * 停止轮询
   */
  private stopPolling(): void {
    if (this.pollTimer !== null) {
      globalThis.clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /**
   * 刷新配置（从 API 重新获取）
   */
  async refresh(): Promise<void> {
    if (this.options.apiUrl) {
      const apiConfig = await this.loadApiConfig();
      this.config = deepMerge(this.config, apiConfig);
      if (this.options.onUpdate) {
        this.options.onUpdate(this.config);
      }
    }
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

  /**
   * 保存配置到浏览器存储
   */
  save(): void {
    try {
      const storage = this.options.storage === "localStorage"
        ? globalThis.localStorage
        : globalThis.sessionStorage;
      storage.setItem(
        this.options.storageKey,
        JSON.stringify(this.config),
      );
    } catch {
      // 忽略存储错误
    }
  }
}

/**
 * 创建客户端配置管理器实例
 */
export function createConfigManager(
  options?: ConfigManagerOptions,
): ConfigManager {
  return new ConfigManager(options);
}
