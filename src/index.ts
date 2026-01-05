/**
 * mcp-discovery - MCP discovery/router server
 * 
 * This module provides a programmatic API for creating and using
 * the MCP discovery server. For CLI usage, run `mcp-discovery`.
 * 
 * @example
 * ```typescript
 * import { loadConfig, createDiscoveryServer } from "mcp-discovery";
 * 
 * const config = await loadConfig("./my-config.json");
 * const { server, registry } = createDiscoveryServer({ config });
 * 
 * // Connect to a transport
 * await server.connect(transport);
 * 
 * // Or use registry directly for programmatic access
 * const tools = await registry.listTools("my-server-id");
 * ```
 */

// Config
export {
  loadConfig,
  DEFAULT_CONFIG_FILENAME,
  DiscoveryConfigSchema,
  ServerConfigSchema,
  TransportConfigSchema,
  StdioTransportConfigSchema,
  HttpTransportConfigSchema,
  type DiscoveryConfig,
  type ServerConfig,
  type TransportConfig,
  type StdioTransportConfig,
  type HttpTransportConfig,
} from "./config/index.js";

// MCP Client
export type {
  McpClient,
  McpClientFactory,
  ToolInfo,
  ToolCallResult,
} from "./mcp/client/index.js";

export { StdioMcpClient, HttpMcpClient } from "./mcp/client/index.js";

// Registry
export { ServerRegistry, type RegisteredServer } from "./registry/index.js";

// Routing
export { rankToolsForQuery, type RankedTool } from "./routing/index.js";

// Server
export {
  createDiscoveryServer,
  registerRouterTools,
  type CreateDiscoveryServerOptions,
  type DiscoveryServerInstance,
} from "./server/index.js";
