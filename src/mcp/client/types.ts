/**
 * Represents a tool exposed by an upstream MCP server
 */
export interface ToolInfo {
  name: string;
  title?: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

/**
 * Content item in a tool call result
 */
export interface ToolCallContentItem {
  type: "text";
  text: string;
}

/**
 * Result from calling a tool on an upstream MCP server
 */
export interface ToolCallResult {
  content: ToolCallContentItem[];
  isError?: boolean;
}

/**
 * Abstract interface for an MCP client that can connect to upstream servers.
 * Implementations can use stdio, HTTP/SSE, or other transports.
 */
export interface McpClient {
  /** Unique server ID from config */
  readonly serverId: string;

  /** Whether the client is currently connected */
  readonly connected: boolean;

  /** Connect to the upstream MCP server */
  connect(): Promise<void>;

  /** List all tools available on the upstream server */
  listTools(): Promise<ToolInfo[]>;

  /** Call a tool on the upstream server */
  callTool(toolName: string, args: Record<string, unknown>): Promise<ToolCallResult>;

  /** Close the connection and clean up resources */
  close(): Promise<void>;
}

/**
 * Factory function signature for creating MCP clients
 */
export type McpClientFactory = (serverId: string, config: unknown) => McpClient;

