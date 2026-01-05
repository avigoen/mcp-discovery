import type { McpClient, ToolInfo } from "../mcp/client/types.js";
import { StdioMcpClient } from "../mcp/client/stdioClient.js";
import { HttpMcpClient } from "../mcp/client/httpClient.js";
import type {
  DiscoveryConfig,
  ServerConfig,
  StdioTransportConfig,
  HttpTransportConfig,
} from "../config/schema.js";

/**
 * Cached tools entry with TTL
 */
interface CachedTools {
  tools: ToolInfo[];
  fetchedAt: number;
}

/**
 * Information about a registered server
 */
export interface RegisteredServer {
  config: ServerConfig;
  client: McpClient | null;
  cachedTools: CachedTools | null;
}

/**
 * ServerRegistry manages connections to upstream MCP servers.
 * 
 * Features:
 * - Lazy connection: clients are created on-demand when first accessed
 * - Tool caching: listTools() results are cached with a configurable TTL
 * - Graceful shutdown: all connections can be closed at once
 */
export class ServerRegistry {
  private readonly servers: Map<string, RegisteredServer> = new Map();
  private readonly cacheTtlMs: number;

  constructor(config: DiscoveryConfig) {
    this.cacheTtlMs = config.routing.cacheTtlMs;

    // Register all enabled servers
    for (const serverConfig of config.servers) {
      if (serverConfig.enabled) {
        this.servers.set(serverConfig.id, {
          config: serverConfig,
          client: null,
          cachedTools: null,
        });
      }
    }
  }

  /**
   * Get list of all registered server IDs
   */
  getServerIds(): string[] {
    return Array.from(this.servers.keys());
  }

  /**
   * Get server configuration by ID
   */
  getServerConfig(serverId: string): ServerConfig | undefined {
    return this.servers.get(serverId)?.config;
  }

  /**
   * Get all server configurations
   */
  getAllServerConfigs(): ServerConfig[] {
    return Array.from(this.servers.values()).map((s) => s.config);
  }

  /**
   * Check if a server is registered
   */
  hasServer(serverId: string): boolean {
    return this.servers.has(serverId);
  }

  /**
   * Get or create a client for the given server.
   * Connects lazily on first access.
   */
  async getClient(serverId: string): Promise<McpClient> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Unknown server: "${serverId}"`);
    }

    // Return existing connected client
    if (server.client?.connected) {
      return server.client;
    }

    // Create new client based on transport type
    const { transport } = server.config;
    let client: McpClient;

    switch (transport.type) {
      case "stdio":
        client = new StdioMcpClient(serverId, transport as StdioTransportConfig);
        break;
      case "http":
        client = new HttpMcpClient(serverId, transport as HttpTransportConfig);
        break;
      default:
        throw new Error(`Unknown transport type for server "${serverId}"`);
    }

    // Connect and store
    await client.connect();
    server.client = client;

    return client;
  }

  /**
   * List tools for a server, using cache if available and not expired.
   */
  async listTools(serverId: string): Promise<ToolInfo[]> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Unknown server: "${serverId}"`);
    }

    // Check cache
    const now = Date.now();
    if (
      server.cachedTools &&
      now - server.cachedTools.fetchedAt < this.cacheTtlMs
    ) {
      return server.cachedTools.tools;
    }

    // Fetch fresh tools
    const client = await this.getClient(serverId);
    const tools = await client.listTools();

    // Update cache
    server.cachedTools = {
      tools,
      fetchedAt: now,
    };

    return tools;
  }

  /**
   * List tools for all servers (in parallel)
   */
  async listAllTools(): Promise<Map<string, ToolInfo[]>> {
    const results = new Map<string, ToolInfo[]>();
    const serverIds = this.getServerIds();

    const toolsPromises = serverIds.map(async (serverId) => {
      try {
        const tools = await this.listTools(serverId);
        return { serverId, tools, error: null };
      } catch (err) {
        console.error(`Failed to list tools for server "${serverId}":`, (err as Error).message);
        return { serverId, tools: [], error: err as Error };
      }
    });

    const toolResults = await Promise.all(toolsPromises);
    for (const { serverId, tools } of toolResults) {
      results.set(serverId, tools);
    }

    return results;
  }

  /**
   * Call a tool on a specific server
   */
  async callTool(
    serverId: string,
    toolName: string,
    args: Record<string, unknown>
  ) {
    const client = await this.getClient(serverId);
    return client.callTool(toolName, args);
  }

  /**
   * Close all connections
   */
  async closeAll(): Promise<void> {
    const closePromises: Promise<void>[] = [];

    for (const server of this.servers.values()) {
      if (server.client) {
        closePromises.push(
          server.client.close().catch((err) => {
            console.error(
              `Error closing client for server "${server.config.id}":`,
              (err as Error).message
            );
          })
        );
        server.client = null;
      }
    }

    await Promise.all(closePromises);
  }

  /**
   * Invalidate tool cache for a specific server (or all servers if no ID provided)
   */
  invalidateCache(serverId?: string): void {
    if (serverId) {
      const server = this.servers.get(serverId);
      if (server) {
        server.cachedTools = null;
      }
    } else {
      for (const server of this.servers.values()) {
        server.cachedTools = null;
      }
    }
  }
}

