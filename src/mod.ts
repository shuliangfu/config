/**
 * @module @dreamer/config
 *
 * 配置管理库，提供统一的配置抽象层，支持服务端配置文件管理。
 *
 * 特性：
 * - 多环境配置（dev、test、prod；与进程 `RUNTIME_ENV` dev/build/start 对齐）
 * - 多目录支持（按优先级合并）
 * - 配置文件加载（TypeScript 模块或 JSON）
 * - .env 文件支持（同步合并 `.env`、`.env.{dev|test|prod}`、可选 `.env.{原始环境名}`；`preloadDotEnvSync` 可写入进程环境）
 * - 配置合并（深度合并）
 * - 配置验证（Schema 验证）
 * - 环境变量支持
 * - 配置热重载
 *
 * 环境兼容性：
 * - 服务端：✅ 支持（Deno 和 Bun 运行时）
 * - 客户端：✅ 支持（浏览器环境，通过 `jsr:@dreamer/config/client` 使用）
 *
 * **进程环境再导出**：包根导出 `getEnv`、`hasEnv`、`setEnv`、`deleteEnv`（实现来自
 * `@dreamer/runtime-adapter`），便于只依赖本包读取进程变量。它们**不读取**磁盘上的 `.env`；
 * `.env` / `.env.dev` / `.env.prod` 等分层合并须先调用 {@link preloadDotEnvSync} 或 `ConfigManager.load`
 * 写入进程后，`getEnv` 才能读到合并结果。亦可使用 `ConfigManager` 实例的 `getEnv("KEY")` 与 `env.get`。
 */

import {
  existsSync,
  type FileWatcher,
  getEnv as readProcessEnv,
  getEnvAll,
  hasEnv,
  readTextFile,
  readTextFileSync,
  realPath,
  setEnv,
  stat,
  watchFs,
} from "@dreamer/runtime-adapter";
import type { ServiceContainer } from "@dreamer/service";

export { deleteEnv, getEnv, hasEnv, setEnv } from "@dreamer/runtime-adapter";

/**
 * 配置管理器选项
 */
export interface ConfigManagerOptions {
  /** 管理器名称（用于服务容器识别） */
  name?: string;
  /** 配置目录（可以是多个，按顺序加载，后面的覆盖前面的） */
  directories?: string[];
  /**
   * 环境名；未传时仅从进程 **`RUNTIME_ENV`** 推断（与 dweb 的 dev/build/start 一致）；未设置则默认为 `dev`。
   * 亦可显式传 `dev` / `test` / `prod` 等，供 `resolveConfigEnvFileSuffix` 选 `.env.*`。
   */
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
      return readProcessEnv(varName.trim()) || "";
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

/** 用于 `.env.{dev|test|prod}` 文件名的三档后缀 */
export type ConfigEnvFileSuffix = "dev" | "test" | "prod";

/**
 * 将进程环境名规范为三档 `.env` 文件名后缀（`.env.dev` / `.env.test` / `.env.prod`）。
 *
 * - 与 @dreamer/dweb 一致：`RUNTIME_ENV=build` | `start` 均映射为 `prod`（加载 `.env.prod`，并可再叠加 `.env.build` / `.env.start`，见 {@link collectDotEnvLayersSync} 的「原始名」层）。
 * - 调用方仍可通过 `options.env` 传入任意原始字符串（例如自行把 `NODE_ENV` 映射后再传入）；本包**不再**自动读取 `NODE_ENV`。
 *
 * @param raw 环境名字符串（通常来自 `options.env` 或进程 `RUNTIME_ENV`，或由调用方自行构造）
 * @returns `dev` | `test` | `prod`
 */
export function resolveConfigEnvFileSuffix(raw: string): ConfigEnvFileSuffix {
  const s = raw.trim().toLowerCase();
  if (
    s === "production" || s === "prod" || s === "build" || s === "start"
  ) {
    return "prod";
  }
  if (s === "test") return "test";
  return "dev";
}

/**
 * 同步合并单个目录下的多份 `.env` 层；后者覆盖前者。
 * 顺序：`.env` → `.env.{dev|test|prod}`（见 {@link resolveConfigEnvFileSuffix}）→ 若原始环境名（小写）与三档后缀不同，再尝试 `.env.{原始}`（如 `.env.development`）。
 *
 * @param directory 配置目录（相对或绝对路径，可省略末尾 `/`）
 * @param envRaw 与 `ConfigManager` 的 `env` 选项语义一致的环境名字符串
 * @returns 扁平键值（均为字符串）
 */
export function collectDotEnvLayersSync(
  directory: string,
  envRaw: string,
): Record<string, string> {
  const dir = directory.replace(/\/+$/, "") || ".";
  let merged: Record<string, string> = {
    ...loadEnvFileSync(`${dir}/.env`),
  };
  const suffix = resolveConfigEnvFileSuffix(envRaw);
  merged = {
    ...merged,
    ...loadEnvFileSync(`${dir}/.env.${suffix}`),
  };
  const exact = envRaw.trim().toLowerCase();
  if (exact && exact !== suffix) {
    merged = {
      ...merged,
      ...loadEnvFileSync(`${dir}/.env.${exact}`),
    };
  }
  return merged;
}

/**
 * 异步合并单个目录下的多份 `.env` 层；语义与 {@link collectDotEnvLayersSync} 一致。
 *
 * @param directory 配置目录
 * @param envRaw 环境名原始字符串
 * @returns 扁平键值
 */
async function collectDotEnvLayersAsync(
  directory: string,
  envRaw: string,
): Promise<Record<string, string>> {
  const dir = directory.replace(/\/+$/, "") || ".";
  let merged: Record<string, string> = {
    ...(await loadEnvFile(`${dir}/.env`)),
  };
  const suffix = resolveConfigEnvFileSuffix(envRaw);
  merged = {
    ...merged,
    ...(await loadEnvFile(`${dir}/.env.${suffix}`)),
  };
  const exact = envRaw.trim().toLowerCase();
  if (exact && exact !== suffix) {
    merged = {
      ...merged,
      ...(await loadEnvFile(`${dir}/.env.${exact}`)),
    };
  }
  return merged;
}

/** {@link preloadDotEnvSync} 的选项 */
export interface PreloadDotEnvOptions {
  /** 环境字符串；不传则仅读取进程 `RUNTIME_ENV`，未设置则 `dev` */
  env?: string;
  /**
   * 为 `true` 时无条件用合并后的 `.env` 值覆盖进程中的同名变量。
   * 为 `false`（默认）时：仅当进程中**未定义**该键，或已有值为**空字符串 / 仅空白**时写入；
   * 避免 shell 里 `export DB_PASS=` 占位导致无法注入 `.env` 中的非空密码。
   */
  override?: boolean;
  /** 为 `true`（默认）时将合并结果写入进程环境，便于在任意模块顶层使用 `getEnv` */
  applyToProcess?: boolean;
}

/**
 * 对目录列表去重并保持首次出现顺序（用于合并 `.env` 时后者覆盖前者）。
 *
 * @param dirs 原始目录列表
 * @returns 去重后的目录列表
 */
function dedupeDirectoriesPreserveOrder(dirs: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const d of dirs) {
    const n = d.replace(/\/+$/, "") || ".";
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

/**
 * 按目录顺序合并各目录下的分层 `.env`（每个目录内仍由 {@link collectDotEnvLayersSync} 处理）。
 * 若后序目录某键为**空字符串**，而已有合并值为**非空**，则保留已有值，避免子目录误放 `DB_PASS=` 冲掉仓库根密码。
 *
 * @param ordered 已去重的目录列表
 * @param envRaw 传给 `collectDotEnvLayersSync` 的环境名
 * @returns 扁平合并结果
 */
function mergeDotEnvDirectoriesPreserveNonEmpty(
  ordered: string[],
  envRaw: string,
): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const dir of ordered) {
    const layer = collectDotEnvLayersSync(dir, envRaw);
    for (const [k, v] of Object.entries(layer)) {
      if (v === "" && merged[k] !== undefined && merged[k] !== "") {
        continue;
      }
      merged[k] = v;
    }
  }
  return merged;
}

/**
 * 异步版 {@link mergeDotEnvDirectoriesPreserveNonEmpty}，供 `ConfigManager.load` 使用。
 *
 * @param ordered 配置目录列表（顺序与构造 `ConfigManager` 时一致）
 * @param envRaw 环境名
 * @returns 扁平合并结果
 */
async function mergeDotEnvDirectoriesPreserveNonEmptyAsync(
  ordered: string[],
  envRaw: string,
): Promise<Record<string, string>> {
  const merged: Record<string, string> = {};
  for (const dir of ordered) {
    const layer = await collectDotEnvLayersAsync(dir, envRaw);
    for (const [k, v] of Object.entries(layer)) {
      if (v === "" && merged[k] !== undefined && merged[k] !== "") {
        continue;
      }
      merged[k] = v;
    }
  }
  return merged;
}

/**
 * 同步从多个目录加载 `.env` 分层文件，并可选择写入进程环境（`setEnv`）。
 * 典型用途：在动态 `import` 各应用 `config/main.ts` **之前**调用，使模块顶层 `getEnv("DB_HOST")` 等能读到仓库根或各配置目录下的变量。
 *
 * @param directories 按顺序加载；同键后者覆盖前者（后层**空字符串**不覆盖前层非空，见 {@link mergeDotEnvDirectoriesPreserveNonEmpty}）
 * @param options 见 {@link PreloadDotEnvOptions}
 * @returns 合并后的扁平环境表（拷贝）
 */
export function preloadDotEnvSync(
  directories: string[],
  options: PreloadDotEnvOptions = {},
): Record<string, string> {
  const envRaw =
    (options.env !== undefined && String(options.env).trim() !== "")
      ? String(options.env).trim()
      : readProcessEnv("RUNTIME_ENV") || "dev";

  const ordered = dedupeDirectoriesPreserveOrder(directories);
  const merged = mergeDotEnvDirectoriesPreserveNonEmpty(ordered, envRaw);

  const applyToProcess = options.applyToProcess !== false;
  if (applyToProcess) {
    const override = options.override === true;
    for (const [k, v] of Object.entries(merged)) {
      const current = readProcessEnv(k);
      const isVacant = current === undefined || current.trim() === "";
      if (override || isVacant) {
        setEnv(k, v);
      }
    }
  }

  return { ...merged };
}

/**
 * 在读取 DB_* 等常量之前，用**本仓库解析到的** `@dreamer/config` 同步合并分层 `.env` 并写入进程。
 */
preloadDotEnvSync(["."]);

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
  /** 热重载防抖定时器，stopWatching 时需清除以防内存泄漏 */
  private reloadDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  /** 服务容器实例 */
  private container?: ServiceContainer;
  /** 管理器名称 */
  private readonly managerName: string;

  /**
   * 进程环境只读门面（`get` / `has` 委托给 `@dreamer/runtime-adapter`），与无参 {@link ConfigManager.getEnv} 区分。
   * 典型用法：`manager.env.get("DB_HOST")`。
   */
  private readonly _processEnvApi = {
    /**
     * 读取进程环境变量（与 {@link ConfigManager.getEnv} 传入 `key` 时语义相同）。
     * @param key 环境变量键名
     */
    get: (key: string): string | undefined => readProcessEnv(key),
    /**
     * 判断进程环境是否已定义该键（含值为空字符串的情况）。
     * @param key 环境变量键名
     */
    has: (key: string): boolean => hasEnv(key),
  };

  /**
   * 创建 ConfigManager 实例
   * @param options 配置选项
   */
  constructor(options: ConfigManagerOptions = {}) {
    const env = options.env || readProcessEnv("RUNTIME_ENV") || "dev";
    this.options = {
      directories: options.directories || ["./config"],
      env,
      envPrefix: options.envPrefix || "",
      hotReload: options.hotReload !== undefined
        ? options.hotReload
        : resolveConfigEnvFileSuffix(env) === "dev",
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
   * 只读访问进程环境变量（`env.get` / `env.has`），便于与「配置环境名」API 集中在同一实例上。
   */
  get env(): {
    get(key: string): string | undefined;
    has(key: string): boolean;
  } {
    return this._processEnvApi;
  }

  /**
   * 无参数：返回当前**配置环境名**（构造时的 `options.env`，如 dev/test/prod 原始字符串）。
   * 有参数：从**进程环境**读取键值（委托 `@dreamer/runtime-adapter` 的 `getEnv`）。
   * @param key 可选；传入时为进程环境变量键名
   */
  getEnv(): string;
  getEnv(key: string): string | undefined;
  getEnv(key?: string): string | undefined {
    if (key === undefined) {
      return this.options.env;
    }
    return readProcessEnv(key);
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
   * 3. 默认 `.env` 文件
   * 4. `.env.{dev|test|prod}`（由 {@link resolveConfigEnvFileSuffix} 解析，如 `.env.dev`、`.env.prod`）
   * 5. 若原始 `env` 小写与三档后缀不同，再加载 `.env.{原始}`（如 `.env.development`）
   * 6. 进程环境变量（最高优先级）
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

    // 2. 加载 .env 分层文件（多目录合并规则与 {@link preloadDotEnvSync} 一致）
    const dotFlat = mergeDotEnvDirectoriesPreserveNonEmpty(
      this.options.directories,
      this.options.env,
    );
    mergedConfig = deepMerge(mergedConfig, dotFlat);

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
    const flat = await mergeDotEnvDirectoriesPreserveNonEmptyAsync(
      this.options.directories,
      this.options.env,
    );
    return { ...flat };
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
              // 防抖：清除之前的定时器，避免重复加载
              if (this.reloadDebounceTimer !== null) {
                clearTimeout(this.reloadDebounceTimer);
              }
              this.reloadDebounceTimer = setTimeout(async () => {
                this.reloadDebounceTimer = null;
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
    // 清除待执行的热重载定时器，防止内存泄漏
    if (this.reloadDebounceTimer !== null) {
      clearTimeout(this.reloadDebounceTimer);
      this.reloadDebounceTimer = null;
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
}

/**
 * 创建配置管理器实例
 */
export function createConfigManager(
  options?: ConfigManagerOptions,
): ConfigManager {
  return new ConfigManager(options);
}
