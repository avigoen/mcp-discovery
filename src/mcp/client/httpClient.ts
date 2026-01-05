import type { McpClient, ToolInfo, ToolCallResult } from "./types.js";
import type { HttpTransportConfig } from "../../config/schema.js";

/**
 * HTTP/SSE-based MCP client implementation.
 * 
 * NOTE: This is a placeholder/stub for future implementation.
 * HTTP transport support will be added when needed.
 */
export class HttpMcpClient implements McpClient {
  readonly serverId: string;
  private readonly config: HttpTransportConfig;
  private _connected = false;

  constructor(serverId: string, config: HttpTransportConfig) {
    this.serverId = serverId;
    this.config = config;
  }

  get connected(): boolean {
    return this._connected;
  }

  async connect(): Promise<void> {
    // TODO: Implement HTTP/SSE connection
    // This would involve:
    // 1. Establishing SSE connection to the server
    // 2. Sending initialize request
    // 3. Waiting for initialized notification
    throw new Error(
      `HTTP transport not yet implemented for server "${this.serverId}". ` +
      `URL: ${this.config.url}. Use stdio transport for now.`
    );
  }

  async listTools(): Promise<ToolInfo[]> {
    if (!this._connected) {
      throw new Error(`Client not connected for server "${this.serverId}"`);
    }
    // TODO: Implement tools/list request over HTTP
    throw new Error("HTTP transport not yet implemented");
  }

  async callTool(toolName: string, args: Record<string, unknown>): Promise<ToolCallResult> {
    if (!this._connected) {
      throw new Error(`Client not connected for server "${this.serverId}"`);
    }
    // TODO: Implement tools/call request over HTTP
    void toolName;
    void args;
    throw new Error("HTTP transport not yet implemented");
  }

  async close(): Promise<void> {
    this._connected = false;
  }
}

