import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ServerRegistry } from "../registry/ServerRegistry.js";
import { rankToolsForQuery } from "../routing/rankToolsForQuery.js";
import type { ServerConfig } from "../config/schema.js";

/**
 * Register all router/discovery tools on the MCP server.
 */
export function registerRouterTools(
  server: McpServer,
  registry: ServerRegistry,
  maxRouteResults: number = 5
): void {
  // Tool: list-servers
  server.registerTool(
    "list-servers",
    {
      title: "List Servers",
      description: "List all configured upstream MCP servers",
      inputSchema: {},
    },
    async () => {
      const configs = registry.getAllServerConfigs();

      const serverList = configs.map((config) => ({
        id: config.id,
        name: config.name,
        description: config.description ?? "",
        transport: config.transport.type,
        tags: config.tags,
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(serverList, null, 2),
          },
        ],
      };
    }
  );

  // Tool: list-tools
  server.registerTool(
    "list-tools",
    {
      title: "List Tools",
      description: "List all tools available on a specific upstream MCP server",
      inputSchema: {
        serverId: z.string().describe("ID of the server to list tools from"),
      },
    },
    async ({ serverId }) => {
      if (!registry.hasServer(serverId)) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Unknown server "${serverId}". Use list-servers to see available servers.`,
            },
          ],
          isError: true,
        };
      }

      try {
        const tools = await registry.listTools(serverId);
        const toolList = tools.map((tool) => ({
          name: tool.name,
          title: tool.title,
          description: tool.description,
          inputSchema: tool.inputSchema,
        }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(toolList, null, 2),
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text",
              text: `Error listing tools for server "${serverId}": ${(err as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool: route-query
  server.registerTool(
    "route-query",
    {
      title: "Route Query",
      description:
        "Given a natural language query, suggest which server(s) and tool(s) are most relevant",
      inputSchema: {
        query: z.string().describe("Natural language description of what you want to do"),
        maxResults: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Maximum number of results to return (default: 5)"),
      },
    },
    async ({ query, maxResults }) => {
      const limit = maxResults ?? maxRouteResults;

      try {
        // Gather all tools from all servers
        const allTools = await registry.listAllTools();

        // Build server configs map
        const serverConfigs = new Map<string, ServerConfig>();
        for (const serverId of registry.getServerIds()) {
          const config = registry.getServerConfig(serverId);
          if (config) {
            serverConfigs.set(serverId, config);
          }
        }

        // Rank tools
        const ranked = rankToolsForQuery(query, allTools, serverConfigs, limit);

        if (ranked.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `No relevant tools found for query: "${query}"`,
              },
            ],
          };
        }

        const resultText = [
          `Top ${ranked.length} tool(s) for query: "${query}"`,
          "",
          ...ranked.map(
            (r, i) =>
              `${i + 1}. ${r.serverName} / ${r.toolName} (score: ${r.score})\n` +
              `   ${r.toolDescription ?? "No description"}\n` +
              `   Reason: ${r.reason}`
          ),
        ].join("\n");

        return {
          content: [
            {
              type: "text",
              text: resultText,
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text",
              text: `Error routing query: ${(err as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool: call-tool
  server.registerTool(
    "call-tool",
    {
      title: "Call Tool",
      description: "Call a tool on a specific upstream MCP server",
      inputSchema: {
        serverId: z.string().describe("ID of the server containing the tool"),
        toolName: z.string().describe("Name of the tool to call"),
        arguments: z
          .record(z.unknown())
          .optional()
          .describe("Arguments to pass to the tool"),
      },
    },
    async ({ serverId, toolName, arguments: args }) => {
      if (!registry.hasServer(serverId)) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Unknown server "${serverId}". Use list-servers to see available servers.`,
            },
          ],
          isError: true,
        };
      }

      try {
        const result = await registry.callTool(
          serverId,
          toolName,
          (args as Record<string, unknown>) ?? {}
        );

        return {
          content: result.content as Array<{ type: "text"; text: string }>,
          isError: result.isError,
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text",
              text: `Error calling tool "${toolName}" on server "${serverId}": ${(err as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}

