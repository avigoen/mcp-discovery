import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DiscoveryConfig } from "../config/schema.js";
import { ServerRegistry } from "../registry/ServerRegistry.js";
import { registerRouterTools } from "./registerRouterTools.js";

/**
 * Options for creating the discovery server
 */
export interface CreateDiscoveryServerOptions {
  /** Configuration for the discovery server */
  config: DiscoveryConfig;
  /** Server name (default: "mcp-discovery") */
  name?: string;
  /** Server version (default: "1.0.0") */
  version?: string;
}

/**
 * Result from creating a discovery server
 */
export interface DiscoveryServerInstance {
  /** The MCP server instance */
  server: McpServer;
  /** The server registry managing upstream connections */
  registry: ServerRegistry;
}

/**
 * Create a new MCP discovery/router server.
 * 
 * This server exposes tools for:
 * - Listing configured upstream MCP servers
 * - Listing tools available on each upstream server
 * - Routing queries to suggest relevant tools
 * - Proxying tool calls to upstream servers
 * 
 * @param options - Configuration options
 * @returns The MCP server and registry instances
 */
export function createDiscoveryServer(
  options: CreateDiscoveryServerOptions
): DiscoveryServerInstance {
  const { config, name = "mcp-discovery", version = "1.0.0" } = options;

  // Create the MCP server
  const server = new McpServer({
    name,
    version,
  });

  // Create the server registry
  const registry = new ServerRegistry(config);

  // Register router tools
  registerRouterTools(server, registry, config.routing.maxResults);

  return { server, registry };
}

