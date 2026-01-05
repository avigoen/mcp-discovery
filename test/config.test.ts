import { describe, it } from "node:test";
import assert from "node:assert";
import { DiscoveryConfigSchema, ServerConfigSchema } from "../src/config/schema.js";

describe("Config Schema Validation", () => {
  describe("ServerConfigSchema", () => {
    it("should accept valid stdio server config", () => {
      const config = {
        id: "test-server",
        name: "Test Server",
        description: "A test server",
        transport: {
          type: "stdio",
          command: "node",
          args: ["./server.js"],
        },
        enabled: true,
        tags: ["test"],
      };

      const result = ServerConfigSchema.safeParse(config);
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.id, "test-server");
        assert.strictEqual(result.data.transport.type, "stdio");
      }
    });

    it("should apply defaults for optional fields", () => {
      const config = {
        id: "minimal",
        name: "Minimal Server",
        transport: {
          type: "stdio",
          command: "node",
        },
      };

      const result = ServerConfigSchema.safeParse(config);
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.enabled, true);
        assert.deepStrictEqual(result.data.tags, []);
        // Check args for stdio transport
        if (result.data.transport.type === "stdio") {
          assert.deepStrictEqual(result.data.transport.args, []);
        }
      }
    });

    it("should reject config with missing required fields", () => {
      const config = {
        id: "missing-fields",
        // missing name and transport
      };

      const result = ServerConfigSchema.safeParse(config);
      assert.strictEqual(result.success, false);
    });

    it("should reject config with invalid transport type", () => {
      const config = {
        id: "invalid-transport",
        name: "Invalid",
        transport: {
          type: "websocket", // not supported
          url: "ws://localhost:3000",
        },
      };

      const result = ServerConfigSchema.safeParse(config);
      assert.strictEqual(result.success, false);
    });
  });

  describe("DiscoveryConfigSchema", () => {
    it("should accept valid full config", () => {
      const config = {
        version: "1.0",
        servers: [
          {
            id: "server1",
            name: "Server 1",
            transport: {
              type: "stdio",
              command: "node",
              args: ["./s1.js"],
            },
          },
          {
            id: "server2",
            name: "Server 2",
            transport: {
              type: "stdio",
              command: "python",
              args: ["-m", "server"],
            },
          },
        ],
        routing: {
          maxResults: 10,
          cacheTtlMs: 30000,
        },
      };

      const result = DiscoveryConfigSchema.safeParse(config);
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.servers.length, 2);
        assert.strictEqual(result.data.routing.maxResults, 10);
      }
    });

    it("should apply routing defaults", () => {
      const config = {
        version: "1.0",
        servers: [],
      };

      const result = DiscoveryConfigSchema.safeParse(config);
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.routing.maxResults, 5);
        assert.strictEqual(result.data.routing.cacheTtlMs, 60000);
      }
    });

    it("should reject invalid version", () => {
      const config = {
        version: "2.0", // only 1.0 is supported
        servers: [],
      };

      const result = DiscoveryConfigSchema.safeParse(config);
      assert.strictEqual(result.success, false);
    });
  });
});

