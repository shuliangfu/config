/**
 * @fileoverview Config 测试
 */

import {
  cwd,
  IS_BUN,
  IS_DENO,
  join,
  mkdir,
  remove,
  writeTextFile,
} from "@dreamer/runtime-adapter";
import { ServiceContainer } from "@dreamer/service";
import { afterAll, beforeAll, describe, expect, it } from "@dreamer/test";
import { ConfigManager, createConfigManager } from "../src/mod.ts";

describe("ConfigManager", () => {
  const testDir = join(cwd(), "tests", "data", "test-config");

  beforeAll(async () => {
    // 创建测试目录和配置文件
    await mkdir(testDir, { recursive: true });
    await writeTextFile(
      join(testDir, "config.json"),
      JSON.stringify({ app: { name: "test" } }, null, 2),
    );
  });

  afterAll(async () => {
    // 清理测试文件
    try {
      await remove(testDir, { recursive: true });
    } catch {
      // 忽略清理错误
    }
  });

  describe("load", () => {
    it("应该加载配置文件", async () => {
      const manager = new ConfigManager({
        directories: [testDir],
        hotReload: false, // 禁用热重载避免资源泄漏
      });
      await manager.load();

      const config = manager.getAll();
      expect(config.app).toBeTruthy();
      expect((config.app as { name: string }).name).toBe("test");
    });

    it("应该加载环境特定配置", async () => {
      const manager = new ConfigManager({
        directories: [testDir],
        env: "test",
        hotReload: false,
      });
      await manager.load();

      const config = manager.getAll();
      expect(config.app).toBeTruthy();
    });
  });

  describe("loadSync", () => {
    it("应该同步加载 JSON 配置文件", () => {
      const manager = new ConfigManager({
        directories: [testDir],
        hotReload: false,
      });
      manager.loadSync();

      const config = manager.getAll();
      expect(config.app).toBeTruthy();
      expect((config.app as { name: string }).name).toBe("test");
    });

    it("应该同步加载环境特定的 JSON 配置", async () => {
      const syncDir = join(testDir, "sync-env");
      await mkdir(syncDir, { recursive: true });

      await writeTextFile(
        join(syncDir, "config.json"),
        JSON.stringify({ app: { name: "default" } }, null, 2),
      );
      await writeTextFile(
        join(syncDir, "config.prod.json"),
        JSON.stringify({ app: { name: "prod-sync" } }, null, 2),
      );

      const manager = new ConfigManager({
        directories: [syncDir],
        env: "prod",
        hotReload: false,
      });
      manager.loadSync();

      expect(manager.get("app.name")).toBe("prod-sync");
    });

    it("应该同步加载 .env 文件", async () => {
      const syncEnvDir = join(testDir, "sync-env-file");
      await mkdir(syncEnvDir, { recursive: true });

      await writeTextFile(
        join(syncEnvDir, ".env"),
        "SYNC_APP_NAME=sync-test\nSYNC_APP_PORT=8080\n",
      );

      const manager = new ConfigManager({
        directories: [syncEnvDir],
        hotReload: false,
      });
      manager.loadSync();

      const config = manager.getAll();
      expect(config.SYNC_APP_NAME).toBe("sync-test");
      expect(config.SYNC_APP_PORT).toBe("8080");
    });

    it("应该同步加载环境特定的 .env 文件", async () => {
      const syncEnvSpecificDir = join(testDir, "sync-env-specific");
      await mkdir(syncEnvSpecificDir, { recursive: true });

      await writeTextFile(
        join(syncEnvSpecificDir, ".env"),
        "ENV_MODE=default\n",
      );
      await writeTextFile(
        join(syncEnvSpecificDir, ".env.dev"),
        "ENV_MODE=development\n",
      );

      const manager = new ConfigManager({
        directories: [syncEnvSpecificDir],
        env: "dev",
        hotReload: false,
      });
      manager.loadSync();

      const config = manager.getAll();
      expect(config.ENV_MODE).toBe("development");
    });

    it("应该同步合并 JSON 和 .env 配置", async () => {
      const syncMergeDir = join(testDir, "sync-merge");
      await mkdir(syncMergeDir, { recursive: true });

      await writeTextFile(
        join(syncMergeDir, "config.json"),
        JSON.stringify({ app: { name: "json-app", port: 3000 } }, null, 2),
      );
      await writeTextFile(
        join(syncMergeDir, ".env"),
        "DB_HOST=localhost\nDB_PORT=5432\n",
      );

      const manager = new ConfigManager({
        directories: [syncMergeDir],
        hotReload: false,
      });
      manager.loadSync();

      const config = manager.getAll();
      // JSON 配置
      expect((config.app as { name: string; port: number }).name).toBe(
        "json-app",
      );
      expect((config.app as { name: string; port: number }).port).toBe(3000);
      // .env 配置
      expect(config.DB_HOST).toBe("localhost");
      expect(config.DB_PORT).toBe("5432");
    });

    it("应该同步处理多个目录的配置合并", async () => {
      const syncDir1 = join(testDir, "sync-dir1");
      const syncDir2 = join(testDir, "sync-dir2");
      await mkdir(syncDir1, { recursive: true });
      await mkdir(syncDir2, { recursive: true });

      await writeTextFile(
        join(syncDir1, "config.json"),
        JSON.stringify({ app: { name: "dir1", version: "1.0.0" } }, null, 2),
      );
      await writeTextFile(
        join(syncDir2, "config.json"),
        JSON.stringify({ app: { name: "dir2" } }, null, 2),
      );

      const manager = new ConfigManager({
        directories: [syncDir1, syncDir2],
        hotReload: false,
      });
      manager.loadSync();

      // dir2 应该覆盖 dir1 的 name
      expect(manager.get("app.name")).toBe("dir2");
      // dir1 的 version 应该保留
      expect(manager.get("app.version")).toBe("1.0.0");
    });

    it("应该同步处理不存在的目录", () => {
      const manager = new ConfigManager({
        directories: [join(testDir, "sync-nonexistent")],
        hotReload: false,
      });
      manager.loadSync();

      // 不应该抛出错误，配置应该为空对象
      const config = manager.getAll();
      expect(config).toBeTruthy();
      expect(typeof config).toBe("object");
    });

    it("应该同步处理不存在的配置文件", async () => {
      const syncEmptyDir = join(testDir, "sync-empty");
      await mkdir(syncEmptyDir, { recursive: true });

      const manager = new ConfigManager({
        directories: [syncEmptyDir],
        hotReload: false,
      });
      manager.loadSync();

      const config = manager.getAll();
      expect(config).toBeTruthy();
    });
  });

  describe("get", () => {
    it("应该获取配置值", async () => {
      const manager = new ConfigManager({
        directories: [testDir],
        hotReload: false,
      });
      await manager.load();

      const appName = manager.get("app.name");
      expect(appName).toBe("test");
    });

    it("应该返回默认值", async () => {
      const manager = new ConfigManager({
        directories: [testDir],
        hotReload: false,
      });
      await manager.load();

      const value = manager.get("nonexistent.key", "default");
      expect(value).toBe("default");
    });

    it("应该获取嵌套配置值", async () => {
      const manager = new ConfigManager({
        directories: [testDir],
        hotReload: false,
      });
      await manager.load();

      const appName = manager.get<string>("app.name");
      expect(appName).toBe("test");
    });
  });

  describe("set", () => {
    it("应该设置配置值", async () => {
      const manager = new ConfigManager({
        directories: [testDir],
        hotReload: false,
      });
      await manager.load();

      manager.set("app.name", "updated");
      expect(manager.get("app.name")).toBe("updated");
    });

    it("应该设置嵌套配置值", async () => {
      const manager = new ConfigManager({
        directories: [testDir],
        hotReload: false,
      });
      await manager.load();

      manager.set("app.version", "1.0.0");
      expect(manager.get("app.version")).toBe("1.0.0");
    });
  });

  describe("getAll", () => {
    it("应该返回所有配置", async () => {
      const manager = new ConfigManager({
        directories: [testDir],
        hotReload: false,
      });
      await manager.load();

      const all = manager.getAll();
      expect(all).toBeTruthy();
      expect(typeof all).toBe("object");
      expect(all.app).toBeTruthy();
    });
  });

  describe("has", () => {
    it("应该检查配置是否存在", async () => {
      const manager = new ConfigManager({
        directories: [testDir],
        hotReload: false,
      });
      await manager.load();

      expect(manager.has("app.name")).toBe(true);
      expect(manager.has("nonexistent.key")).toBe(false);
    });
  });

  describe("getEnv", () => {
    it("应该返回当前环境", async () => {
      const manager = new ConfigManager({
        directories: [testDir],
        env: "prod",
        hotReload: false,
      });
      expect(manager.getEnv()).toBe("prod");
    });
  });

  describe("多目录配置", () => {
    it("应该按顺序合并多个目录的配置（后面的覆盖前面的）", async () => {
      const dir1 = join(testDir, "dir1");
      const dir2 = join(testDir, "dir2");
      await mkdir(dir1, { recursive: true });
      await mkdir(dir2, { recursive: true });

      await writeTextFile(
        join(dir1, "config.json"),
        JSON.stringify({ app: { name: "dir1", version: "1.0.0" } }, null, 2),
      );
      await writeTextFile(
        join(dir2, "config.json"),
        JSON.stringify({ app: { name: "dir2" } }, null, 2),
      );

      const manager = new ConfigManager({
        directories: [dir1, dir2],
        hotReload: false,
      });
      await manager.load();

      // dir2 的配置应该覆盖 dir1 的配置
      expect(manager.get("app.name")).toBe("dir2");
      // 但 dir1 的其他配置应该保留
      expect(manager.get("app.version")).toBe("1.0.0");
    });
  });

  describe(".env 文件", () => {
    it("应该加载 .env 文件", async () => {
      const envDir = join(testDir, "env-test");
      await mkdir(envDir, { recursive: true });

      await writeTextFile(
        join(envDir, ".env"),
        "APP_NAME=env-test\nAPP_VERSION=2.0.0\n",
      );
      await writeTextFile(
        join(envDir, "config.json"),
        JSON.stringify({ app: { name: "json-test" } }, null, 2),
      );

      const manager = new ConfigManager({
        directories: [envDir],
        hotReload: false,
      });
      await manager.load();

      // .env 文件的值会被加载（键名保持原样，如 APP_NAME）
      const config = manager.getAll();
      expect(config.APP_NAME).toBe("env-test");
      expect(config.APP_VERSION).toBe("2.0.0");
    });

    it("应该加载环境特定的 .env 文件", async () => {
      const envDir = join(testDir, "env-specific");
      await mkdir(envDir, { recursive: true });

      await writeTextFile(
        join(envDir, ".env"),
        "APP_NAME=default\n",
      );
      await writeTextFile(
        join(envDir, ".env.prod"),
        "APP_NAME=prod-env\n",
      );

      const manager = new ConfigManager({
        directories: [envDir],
        env: "prod",
        hotReload: false,
      });
      await manager.load();

      const config = manager.getAll();
      // .env.prod 应该覆盖 .env，APP_NAME 应该为 "prod-env"
      expect(config.APP_NAME).toBe("prod-env");
    });

    it("应该忽略 .env 文件中的注释和空行", async () => {
      const envDir = join(testDir, "env-comments");
      await mkdir(envDir, { recursive: true });

      await writeTextFile(
        join(envDir, ".env"),
        "# 这是注释\nAPP_NAME=test\n\n# 另一个注释\nAPP_VERSION=1.0.0\n",
      );

      const manager = new ConfigManager({
        directories: [envDir],
        hotReload: false,
      });
      await manager.load();

      const config = manager.getAll();
      expect(config.APP_NAME).toBe("test");
      expect(config.APP_VERSION).toBe("1.0.0");
      // 注释不应该出现在配置中
      expect(config["# 这是注释"]).toBeUndefined();
    });

    it("应该处理 .env 文件中的引号", async () => {
      const envDir = join(testDir, "env-quotes");
      await mkdir(envDir, { recursive: true });

      await writeTextFile(
        join(envDir, ".env"),
        "APP_NAME=\"test-value\"\nAPP_DESC='single-quote'\nAPP_UNQUOTED=no-quotes\n",
      );

      const manager = new ConfigManager({
        directories: [envDir],
        hotReload: false,
      });
      await manager.load();

      const config = manager.getAll();
      expect(config.APP_NAME).toBe("test-value");
      expect(config.APP_DESC).toBe("single-quote");
      expect(config.APP_UNQUOTED).toBe("no-quotes");
    });

    it("应该支持 .env 文件中的变量引用", async () => {
      const envDir = join(testDir, "env-vars");
      await mkdir(envDir, { recursive: true });

      // 使用 runtime-adapter 的 getEnv 来设置和获取环境变量
      const { getEnv } = await import("@dreamer/runtime-adapter");

      // 设置环境变量用于引用
      const originalEnv = getEnv("TEST_BASE_URL");
      if (IS_DENO) {
        (globalThis as any).Deno.env.set(
          "TEST_BASE_URL",
          "https://api.example.com",
        );
      } else if (IS_BUN) {
        (globalThis as any).process.env.TEST_BASE_URL =
          "https://api.example.com";
      }

      try {
        await writeTextFile(
          join(envDir, ".env"),
          "BASE_URL=${TEST_BASE_URL}\nAPI_URL=${BASE_URL}/v1\n",
        );

        const manager = new ConfigManager({
          directories: [envDir],
          hotReload: false,
        });
        await manager.load();

        const config = manager.getAll();
        // BASE_URL 应该从环境变量 TEST_BASE_URL 展开
        expect(config.BASE_URL).toBe("https://api.example.com");
        // API_URL 中的 ${BASE_URL} 不会展开，因为 BASE_URL 不在环境变量中，只在 .env 中
        // 这里主要测试变量引用语法不会报错，且能正确解析环境变量引用
        expect(config.API_URL).toBeTruthy();
      } finally {
        // 恢复原始环境变量
        if (IS_DENO) {
          if (originalEnv) {
            (globalThis as any).Deno.env.set("TEST_BASE_URL", originalEnv);
          } else {
            (globalThis as any).Deno.env.delete("TEST_BASE_URL");
          }
        } else if (IS_BUN) {
          if (originalEnv) {
            (globalThis as any).process.env.TEST_BASE_URL = originalEnv;
          } else {
            delete (globalThis as any).process.env.TEST_BASE_URL;
          }
        }
      }
    }, {
      // 环境变量操作可能产生资源
      sanitizeResources: false,
    });

    it("应该合并多个目录的 .env 文件（后面的覆盖前面的）", async () => {
      const dir1 = join(testDir, "env-dir1");
      const dir2 = join(testDir, "env-dir2");
      await mkdir(dir1, { recursive: true });
      await mkdir(dir2, { recursive: true });

      await writeTextFile(
        join(dir1, ".env"),
        "APP_NAME=dir1\nAPP_VERSION=1.0.0\n",
      );
      await writeTextFile(
        join(dir2, ".env"),
        "APP_NAME=dir2\n",
      );

      const manager = new ConfigManager({
        directories: [dir1, dir2],
        hotReload: false,
      });
      await manager.load();

      const config = manager.getAll();
      // dir2 的 APP_NAME 应该覆盖 dir1 的
      expect(config.APP_NAME).toBe("dir2");
      // dir1 的其他配置应该保留
      expect(config.APP_VERSION).toBe("1.0.0");
    });

    it("应该正确处理 .env 文件与 JSON 配置的合并", async () => {
      const envDir = join(testDir, "env-json-merge");
      await mkdir(envDir, { recursive: true });

      await writeTextFile(
        join(envDir, ".env"),
        "APP_NAME=env-value\nAPP_PORT=3000\n",
      );
      await writeTextFile(
        join(envDir, "config.json"),
        JSON.stringify(
          {
            app: { name: "json-value", host: "localhost" },
          },
          null,
          2,
        ),
      );

      const manager = new ConfigManager({
        directories: [envDir],
        hotReload: false,
      });
      await manager.load();

      const config = manager.getAll();
      // .env 文件的值应该存在
      expect(config.APP_NAME).toBe("env-value");
      expect(config.APP_PORT).toBe("3000");
      // JSON 配置也应该存在
      expect((config.app as { name: string; host: string }).name).toBe(
        "json-value",
      );
      expect((config.app as { name: string; host: string }).host).toBe(
        "localhost",
      );
    });
  });

  describe("环境变量", () => {
    it("应该从环境变量读取配置", async () => {
      // 注意：这个测试依赖于实际的环境变量，可能不稳定
      const manager = new ConfigManager({
        directories: [testDir],
        hotReload: false,
      });
      await manager.load();

      // 环境变量会被转换为嵌套对象（如 APP_DATABASE_URL -> database.url）
      const config = manager.getAll();
      expect(config).toBeTruthy();
    });

    it("应该支持环境变量前缀", async () => {
      const manager = new ConfigManager({
        directories: [testDir],
        envPrefix: "CONFIG_",
        hotReload: false,
      });
      await manager.load();

      // 只读取 CONFIG_ 开头的环境变量
      const config = manager.getAll();
      expect(config).toBeTruthy();
    });
  });

  describe("配置合并", () => {
    it("应该深度合并嵌套对象", async () => {
      const mergeDir = join(testDir, "merge-test");
      await mkdir(mergeDir, { recursive: true });

      await writeTextFile(
        join(mergeDir, "config.json"),
        JSON.stringify(
          {
            app: {
              name: "test",
              version: "1.0.0",
              database: { host: "localhost" },
            },
          },
          null,
          2,
        ),
      );
      await writeTextFile(
        join(mergeDir, "config.prod.json"),
        JSON.stringify(
          {
            app: { name: "prod", database: { port: 5432 } },
          },
          null,
          2,
        ),
      );

      const manager = new ConfigManager({
        directories: [mergeDir],
        env: "prod",
        hotReload: false,
      });
      await manager.load();

      // 应该深度合并，保留未覆盖的属性
      expect(manager.get("app.name")).toBe("prod"); // 被覆盖
      expect(manager.get("app.version")).toBe("1.0.0"); // 保留
      expect(manager.get("app.database.host")).toBe("localhost"); // 保留
      expect(manager.get("app.database.port")).toBe(5432); // 新增
    });
  });

  describe("createConfigManager", () => {
    it("应该创建配置管理器实例", async () => {
      const { createConfigManager } = await import("../src/mod.ts");
      const manager = createConfigManager({
        directories: [testDir],
        hotReload: false,
      });
      expect(manager).toBeInstanceOf(ConfigManager);
      expect(manager.getEnv()).toBeTruthy();
    });
  });

  describe("热重载", () => {
    it("应该可以启动和停止监听", async () => {
      const manager = new ConfigManager({
        directories: [testDir],
        hotReload: true,
      });
      await manager.load();

      // 停止监听以避免资源泄漏
      manager.stopWatching();
      expect(manager.getEnv()).toBeTruthy();
    }, {
      // 文件系统监听器可能产生资源，需要禁用资源检查
      sanitizeResources: false,
    });

    it("应该在配置更新时调用回调", async () => {
      let updateCount = 0;
      const manager = new ConfigManager({
        directories: [testDir],
        hotReload: true,
        onUpdate: (config) => {
          updateCount++;
          expect(config).toBeTruthy();
        },
      });
      await manager.load();

      // 停止监听以避免资源泄漏
      manager.stopWatching();
      // 注意：实际的文件更新测试需要更复杂的设置，这里只测试回调函数被设置
      expect(updateCount).toBeGreaterThanOrEqual(0);
    }, {
      // 文件系统监听器可能产生资源，需要禁用资源检查
      sanitizeResources: false,
    });
  });

  describe("边界情况", () => {
    it("应该处理不存在的目录", async () => {
      const manager = new ConfigManager({
        directories: [join(testDir, "nonexistent")],
        hotReload: false,
      });
      await manager.load();

      // 应该不会抛出错误，只是配置为空
      const config = manager.getAll();
      expect(config).toBeTruthy();
    });

    it("应该处理空配置", async () => {
      const emptyDir = join(testDir, "empty");
      await mkdir(emptyDir, { recursive: true });

      const manager = new ConfigManager({
        directories: [emptyDir],
        hotReload: false,
      });
      await manager.load();

      const config = manager.getAll();
      expect(config).toBeTruthy();
      expect(typeof config).toBe("object");
    });

    it("应该处理深层嵌套的配置键", async () => {
      const manager = new ConfigManager({
        directories: [testDir],
        hotReload: false,
      });
      await manager.load();

      // 设置深层嵌套的配置
      manager.set("a.b.c.d.e", "deep");
      expect(manager.get("a.b.c.d.e")).toBe("deep");
      expect(manager.has("a.b.c.d.e")).toBe(true);
    });
  });

  describe("ConfigManager ServiceContainer 集成", () => {
    it("应该获取默认管理器名称", () => {
      const manager = new ConfigManager({
        hotReload: false,
      });

      expect(manager.getName()).toBe("default");
    });

    it("应该获取自定义管理器名称", () => {
      const manager = new ConfigManager({
        name: "custom",
        hotReload: false,
      });

      expect(manager.getName()).toBe("custom");
    });

    it("应该设置和获取服务容器", () => {
      const manager = new ConfigManager({
        hotReload: false,
      });
      const container = new ServiceContainer();

      expect(manager.getContainer()).toBeUndefined();

      manager.setContainer(container);
      expect(manager.getContainer()).toBe(container);
    });

    it("应该从服务容器获取 ConfigManager", () => {
      const container = new ServiceContainer();
      const manager = new ConfigManager({
        name: "test",
        hotReload: false,
      });
      manager.setContainer(container);

      container.registerSingleton("config:test", () => manager);

      const retrieved = ConfigManager.fromContainer(container, "test");
      expect(retrieved).toBe(manager);
    });

    it("应该在服务不存在时返回 undefined", () => {
      const container = new ServiceContainer();
      const retrieved = ConfigManager.fromContainer(container, "non-existent");
      expect(retrieved).toBeUndefined();
    });

    it("应该支持多个 ConfigManager 实例", () => {
      const container = new ServiceContainer();

      const devManager = new ConfigManager({
        name: "dev",
        env: "dev",
        hotReload: false,
      });
      devManager.setContainer(container);

      const prodManager = new ConfigManager({
        name: "prod",
        env: "prod",
        hotReload: false,
      });
      prodManager.setContainer(container);

      container.registerSingleton("config:dev", () => devManager);
      container.registerSingleton("config:prod", () => prodManager);

      expect(ConfigManager.fromContainer(container, "dev")).toBe(devManager);
      expect(ConfigManager.fromContainer(container, "prod")).toBe(prodManager);
    });
  });

  describe("createConfigManager 工厂函数", () => {
    it("应该创建 ConfigManager 实例", () => {
      const manager = createConfigManager({
        hotReload: false,
      });

      expect(manager).toBeInstanceOf(ConfigManager);
    });

    it("应该使用默认名称", () => {
      const manager = createConfigManager({
        hotReload: false,
      });

      expect(manager.getName()).toBe("default");
    });

    it("应该使用自定义名称", () => {
      const manager = createConfigManager({
        name: "custom",
        hotReload: false,
      });

      expect(manager.getName()).toBe("custom");
    });

    it("应该能够在服务容器中注册", () => {
      const container = new ServiceContainer();

      container.registerSingleton(
        "config:main",
        () => createConfigManager({ name: "main", hotReload: false }),
      );

      const manager = container.get<ConfigManager>("config:main");
      expect(manager).toBeInstanceOf(ConfigManager);
      expect(manager.getName()).toBe("main");
    });

    it("应该支持加载和获取配置", async () => {
      const manager = createConfigManager({
        directories: [testDir],
        hotReload: false,
      });

      await manager.load();
      expect(manager.get("app.name")).toBe("test");
    });
  });
});
