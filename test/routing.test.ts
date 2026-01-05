import { describe, it } from "node:test";
import assert from "node:assert";
import { rankToolsForQuery } from "../src/routing/rankToolsForQuery.js";
import type { ToolInfo } from "../src/mcp/client/types.js";
import type { ServerConfig } from "../src/config/schema.js";

describe("Query Routing", () => {
  // Sample test data
  const weatherServerConfig: ServerConfig = {
    id: "weather",
    name: "Weather Server",
    description: "Get weather forecasts and alerts",
    transport: { type: "stdio", command: "node", args: [] },
    enabled: true,
    tags: ["weather", "forecast", "nws"],
  };

  const calculatorServerConfig: ServerConfig = {
    id: "calculator",
    name: "Calculator Server",
    description: "Perform mathematical calculations",
    transport: { type: "stdio", command: "node", args: [] },
    enabled: true,
    tags: ["math", "calculator"],
  };

  const weatherTools: ToolInfo[] = [
    {
      name: "get-forecast",
      title: "Get Forecast",
      description: "Get weather forecast for a location",
    },
    {
      name: "get-alerts",
      title: "Get Alerts",
      description: "Get weather alerts for a state",
    },
  ];

  const calculatorTools: ToolInfo[] = [
    {
      name: "add",
      title: "Add Numbers",
      description: "Add two numbers together",
    },
    {
      name: "multiply",
      title: "Multiply Numbers",
      description: "Multiply two numbers",
    },
  ];

  const serverTools = new Map<string, ToolInfo[]>([
    ["weather", weatherTools],
    ["calculator", calculatorTools],
  ]);

  const serverConfigs = new Map<string, ServerConfig>([
    ["weather", weatherServerConfig],
    ["calculator", calculatorServerConfig],
  ]);

  describe("rankToolsForQuery", () => {
    it("should rank weather tools higher for weather query", () => {
      const results = rankToolsForQuery(
        "What is the weather forecast?",
        serverTools,
        serverConfigs,
        10
      );

      assert.ok(results.length > 0, "Should return results");
      
      // Weather tools should be at the top
      const topResult = results[0];
      assert.strictEqual(topResult.serverId, "weather");
      assert.ok(
        topResult.toolName === "get-forecast" || topResult.toolName === "get-alerts",
        "Top result should be a weather tool"
      );
    });

    it("should rank calculator tools higher for math query", () => {
      const results = rankToolsForQuery(
        "add two numbers",
        serverTools,
        serverConfigs,
        10
      );

      assert.ok(results.length > 0, "Should return results");
      
      // Calculator add tool should be highly ranked
      const addResult = results.find(
        (r) => r.serverId === "calculator" && r.toolName === "add"
      );
      assert.ok(addResult, "Should find add tool");
      assert.ok(addResult.score > 0, "Add tool should have positive score");
    });

    it("should return empty array for empty query", () => {
      const results = rankToolsForQuery("", serverTools, serverConfigs, 10);
      assert.strictEqual(results.length, 0);
    });

    it("should respect maxResults parameter", () => {
      const results = rankToolsForQuery(
        "weather forecast calculation",
        serverTools,
        serverConfigs,
        2
      );

      assert.ok(results.length <= 2, "Should respect maxResults limit");
    });

    it("should return results sorted by score descending", () => {
      const results = rankToolsForQuery(
        "get forecast",
        serverTools,
        serverConfigs,
        10
      );

      for (let i = 1; i < results.length; i++) {
        assert.ok(
          results[i - 1].score >= results[i].score,
          "Results should be sorted by score descending"
        );
      }
    });

    it("should include reason in results", () => {
      const results = rankToolsForQuery(
        "weather alerts",
        serverTools,
        serverConfigs,
        5
      );

      assert.ok(results.length > 0);
      for (const result of results) {
        assert.ok(
          typeof result.reason === "string" && result.reason.length > 0,
          "Each result should have a reason"
        );
      }
    });

    it("should handle query with no matches gracefully", () => {
      const results = rankToolsForQuery(
        "xyzzy foobar qwerty",
        serverTools,
        serverConfigs,
        10
      );

      // Should either return empty or very low-scored partial matches
      for (const result of results) {
        // If any results, scores should be low for gibberish
        assert.ok(result.score <= 1, "Gibberish query should have low scores");
      }
    });
  });
});

