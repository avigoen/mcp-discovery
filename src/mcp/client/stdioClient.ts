import { spawn, type ChildProcess } from "node:child_process";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { McpClient, ToolInfo, ToolCallResult } from "./types.js";
import type { StdioTransportConfig } from "../../config/schema.js";

/**
 * Stdio-based MCP client implementation.
 * Spawns a subprocess and communicates via stdin/stdout.
 */
export class StdioMcpClient implements McpClient {
  readonly serverId: string;
  private readonly config: StdioTransportConfig;
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private process: ChildProcess | null = null;
  private _connected = false;

  constructor(serverId: string, config: StdioTransportConfig) {
    this.serverId = serverId;
    this.config = config;
  }

  get connected(): boolean {
    return this._connected;
  }

  async connect(): Promise<void> {
    if (this._connected) {
      return;
    }

    const { command, args, env, cwd } = this.config;

    // Create the MCP client
    this.client = new Client(
      {
        name: "mcp-discovery",
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    );

    // Spawn the subprocess
    this.process = spawn(command, args, {
      cwd: cwd ?? process.cwd(),
      env: { ...process.env, ...env },
      stdio: ["pipe", "pipe", "pipe"],
    });

    // Handle process errors
    this.process.on("error", (err) => {
      console.error(`[${this.serverId}] Process error:`, err.message);
      this._connected = false;
    });

    this.process.on("exit", (code, signal) => {
      if (code !== 0 && code !== null) {
        console.error(`[${this.serverId}] Process exited with code ${code}`);
      } else if (signal) {
        console.error(`[${this.serverId}] Process killed with signal ${signal}`);
      }
      this._connected = false;
    });

    // Log stderr for debugging
    this.process.stderr?.on("data", (data: Buffer) => {
      console.error(`[${this.serverId}] stderr:`, data.toString().trim());
    });

    // Create transport using the process streams
    // Filter out undefined env values for type safety
    const mergedEnv: Record<string, string> = {};
    for (const [key, value] of Object.entries({ ...process.env, ...env })) {
      if (value !== undefined) {
        mergedEnv[key] = value;
      }
    }

    this.transport = new StdioClientTransport({
      command,
      args,
      env: mergedEnv,
      cwd: cwd ?? process.cwd(),
    });

    // Connect the client
    try {
      await this.client.connect(this.transport);
      this._connected = true;
    } catch (err) {
      await this.close();
      throw new Error(
        `Failed to connect to server "${this.serverId}": ${(err as Error).message}`
      );
    }
  }

  async listTools(): Promise<ToolInfo[]> {
    if (!this._connected || !this.client) {
      throw new Error(`Client not connected for server "${this.serverId}"`);
    }

    const response = await this.client.listTools();
    
    return response.tools.map((tool) => ({
      name: tool.name,
      title: (tool as { title?: string }).title,
      description: tool.description,
      inputSchema: tool.inputSchema as Record<string, unknown> | undefined,
    }));
  }

  async callTool(toolName: string, args: Record<string, unknown>): Promise<ToolCallResult> {
    if (!this._connected || !this.client) {
      throw new Error(`Client not connected for server "${this.serverId}"`);
    }

    const response = await this.client.callTool({
      name: toolName,
      arguments: args,
    });

    return {
      content: response.content as ToolCallResult["content"],
      isError: response.isError === true,
    };
  }

  async close(): Promise<void> {
    this._connected = false;

    if (this.transport) {
      try {
        await this.transport.close();
      } catch {
        // Ignore close errors
      }
      this.transport = null;
    }

    if (this.process && !this.process.killed) {
      this.process.kill("SIGTERM");
      // Give it a moment to clean up, then force kill
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill("SIGKILL");
        }
      }, 1000);
    }
    this.process = null;
    this.client = null;
  }
}

