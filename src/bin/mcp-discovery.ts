#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "../config/loadConfig.js";
import { createDiscoveryServer } from "../server/createDiscoveryServer.js";

/**
 * Parse command line arguments
 */
function parseArgs(): { configPath?: string; help: boolean } {
  const args = process.argv.slice(2);
  let configPath: string | undefined;
  let help = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") {
      help = true;
    } else if (arg === "--config" || arg === "-c") {
      configPath = args[++i];
    } else if (arg.startsWith("--config=")) {
      configPath = arg.slice("--config=".length);
    }
  }

  return { configPath, help };
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
mcp-discovery - MCP discovery/router server

Usage: mcp-discovery [options]

Options:
  -c, --config <path>  Path to config file (default: mcp-discovery.config.json)
  -h, --help           Show this help message

The discovery server exposes these tools:
  - list-servers: List all configured upstream MCP servers
  - list-tools:   List tools available on a specific server
  - route-query:  Suggest relevant tools for a natural language query
  - call-tool:    Call a tool on an upstream server

Config file format:
{
  "version": "1.0",
  "servers": [
    {
      "id": "my-server",
      "name": "My Server",
      "description": "Description of the server",
      "transport": {
        "type": "stdio",
        "command": "node",
        "args": ["./server.js"]
      },
      "enabled": true,
      "tags": ["category"]
    }
  ],
  "routing": {
    "maxResults": 5,
    "cacheTtlMs": 60000
  }
}
`);
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const { configPath, help } = parseArgs();

  if (help) {
    printHelp();
    process.exit(0);
  }

  // Load configuration
  let config;
  try {
    config = await loadConfig(configPath);
  } catch (err) {
    console.error("Failed to load config:", (err as Error).message);
    process.exit(1);
  }

  console.error(`[mcp-discovery] Loaded config with ${config.servers.length} server(s)`);

  // Create discovery server
  const { server, registry } = createDiscoveryServer({ config });

  // Set up graceful shutdown
  const shutdown = async () => {
    console.error("[mcp-discovery] Shutting down...");
    await registry.closeAll();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Connect via stdio transport
  const transport = new StdioServerTransport();

  try {
    await server.connect(transport);
    console.error("[mcp-discovery] Server running on stdio");
  } catch (err) {
    console.error("Failed to start server:", (err as Error).message);
    await registry.closeAll();
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

