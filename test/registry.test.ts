import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import { ServerRegistry } from "../src/registry/ServerRegistry.js";
import type { DiscoveryConfig } from "../src/config/schema.js";

describe("ServerRegistry", () => {
  const testConfig: DiscoveryConfig = {
    version: "1.0",
    servers: [
      {
        id: "server1",
        name: "Server One",
        description: "First test server",
        transport: {
          type: "stdio",
          command: "node",
          args: ["./server1.js"],
        },
        enabled: true,
        tags: ["test", "one"],
      },
      {
        id: "server2",
        name: "Server Two",
        description: "Second test server",
        transport: {
          type: "stdio",
          command: "node",
          args: ["./server2.js"],
        },
        enabled: true,
        tags: ["test", "two"],
      },
      {
        id: "disabled",
        name: "Disabled Server",
        description: "This server is disabled",
        transport: {
          type: "stdio",
          command: "node",
          args: ["./disabled.js"],
        },
        enabled: false,
        tags: [],
      },
    ],
    routing: {
      maxResults: 5,
      cacheTtlMs: 60000,
    },
  };

  let registry: ServerRegistry;

  beforeEach(() => {
    registry = new ServerRegistry(testConfig);
  });

  describe("getServerIds", () => {
    it("should return IDs of enabled servers only", () => {
      const ids = registry.getServerIds();
      
      assert.ok(ids.includes("server1"), "Should include server1");
      assert.ok(ids.includes("server2"), "Should include server2");
      assert.ok(!ids.includes("disabled"), "Should not include disabled server");
      assert.strictEqual(ids.length, 2);
    });
  });

  describe("hasServer", () => {
    it("should return true for registered servers", () => {
      assert.strictEqual(registry.hasServer("server1"), true);
      assert.strictEqual(registry.hasServer("server2"), true);
    });

    it("should return false for disabled servers", () => {
      assert.strictEqual(registry.hasServer("disabled"), false);
    });

    it("should return false for unknown servers", () => {
      assert.strictEqual(registry.hasServer("unknown"), false);
    });
  });

  describe("getServerConfig", () => {
    it("should return config for registered servers", () => {
      const config = registry.getServerConfig("server1");
      
      assert.ok(config, "Should return config");
      assert.strictEqual(config.id, "server1");
      assert.strictEqual(config.name, "Server One");
      assert.deepStrictEqual(config.tags, ["test", "one"]);
    });

    it("should return undefined for unknown servers", () => {
      const config = registry.getServerConfig("unknown");
      assert.strictEqual(config, undefined);
    });
  });

  describe("getAllServerConfigs", () => {
    it("should return configs for all enabled servers", () => {
      const configs = registry.getAllServerConfigs();
      
      assert.strictEqual(configs.length, 2);
      
      const ids = configs.map((c) => c.id);
      assert.ok(ids.includes("server1"));
      assert.ok(ids.includes("server2"));
      assert.ok(!ids.includes("disabled"));
    });
  });

  describe("invalidateCache", () => {
    it("should invalidate cache for specific server", () => {
      // Just test that it doesn't throw
      registry.invalidateCache("server1");
    });

    it("should invalidate all caches when no server specified", () => {
      // Just test that it doesn't throw
      registry.invalidateCache();
    });
  });

  describe("getClient", () => {
    it("should throw for unknown server", async () => {
      await assert.rejects(
        async () => registry.getClient("unknown"),
        { message: 'Unknown server: "unknown"' }
      );
    });
  });

  describe("listTools", () => {
    it("should throw for unknown server", async () => {
      await assert.rejects(
        async () => registry.listTools("unknown"),
        { message: 'Unknown server: "unknown"' }
      );
    });
  });

  describe("callTool", () => {
    it("should throw for unknown server", async () => {
      await assert.rejects(
        async () => registry.callTool("unknown", "tool", {}),
        { message: 'Unknown server: "unknown"' }
      );
    });
  });
});

