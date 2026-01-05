# mcp-discovery

A discovery/router MCP server that connects to multiple upstream MCP servers, lists their tools, and routes queries to the most relevant tools.

## Features

- **Server Registry**: Configure multiple upstream MCP servers in a single config file
- **Tool Discovery**: List all tools available across all configured servers
- **Query Routing**: Given a natural language query, suggest the most relevant server and tool
- **Tool Proxy**: Call tools on upstream servers through a unified interface
- **Lazy Connections**: Upstream servers are only connected when needed
- **Tool Caching**: Tool lists are cached with configurable TTL

## Installation

```bash
npm install
npm run build
```

## Usage

### CLI

```bash
# Run with default config file (mcp-discovery.config.json)
npm start

# Run with a custom config file
node ./build/bin/mcp-discovery.js --config ./my-config.json

# Show help
node ./build/bin/mcp-discovery.js --help
```

### As a Library

```typescript
import { loadConfig, createDiscoveryServer } from "mcp-discovery";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Load configuration
const config = await loadConfig("./my-config.json");

// Create the discovery server
const { server, registry } = createDiscoveryServer({ config });

// Connect via stdio (or any other transport)
const transport = new StdioServerTransport();
await server.connect(transport);

// Or use registry directly for programmatic access
const tools = await registry.listTools("my-server-id");
const result = await registry.callTool("my-server-id", "tool-name", { arg: "value" });
```

## Configuration

Create a `mcp-discovery.config.json` file in your project root:

```json
{
  "version": "1.0",
  "servers": [
    {
      "id": "weather",
      "name": "Weather Server",
      "description": "Get weather forecasts and alerts via NWS API",
      "transport": {
        "type": "stdio",
        "command": "node",
        "args": ["./build/examples/weather-server.js"]
      },
      "enabled": true,
      "tags": ["weather", "forecast", "alerts"]
    }
  ],
  "routing": {
    "maxResults": 5,
    "cacheTtlMs": 60000
  }
}
```

### Server Configuration

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier for the server |
| `name` | string | Yes | Human-readable name |
| `description` | string | No | Description of what the server provides |
| `transport` | object | Yes | Transport configuration (see below) |
| `enabled` | boolean | No | Whether the server is enabled (default: true) |
| `tags` | string[] | No | Tags for categorization/routing |

### Transport Configuration

#### Stdio Transport (recommended)

```json
{
  "type": "stdio",
  "command": "node",
  "args": ["./server.js"],
  "env": { "DEBUG": "true" },
  "cwd": "./servers"
}
```

#### HTTP Transport (planned)

```json
{
  "type": "http",
  "url": "http://localhost:3000/mcp",
  "headers": { "Authorization": "Bearer token" }
}
```

> Note: HTTP transport is not yet implemented. Use stdio for now.

### Routing Configuration

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `maxResults` | number | 5 | Maximum tools to return in route-query |
| `cacheTtlMs` | number | 60000 | TTL for tool cache in milliseconds |

## Exposed Tools

The discovery server exposes these tools:

### `list-servers`

List all configured upstream MCP servers.

**Input**: None

**Output**: JSON array of server info (id, name, description, transport type, tags)

### `list-tools`

List all tools available on a specific upstream server.

**Input**:
- `serverId` (string): ID of the server to list tools from

**Output**: JSON array of tool info (name, title, description, inputSchema)

### `route-query`

Suggest relevant tools for a natural language query.

**Input**:
- `query` (string): Natural language description of what you want to do
- `maxResults` (number, optional): Maximum number of results (default: 5)

**Output**: Ranked list of tool suggestions with scores and reasons

### `call-tool`

Call a tool on an upstream server.

**Input**:
- `serverId` (string): ID of the server containing the tool
- `toolName` (string): Name of the tool to call
- `arguments` (object, optional): Arguments to pass to the tool

**Output**: The result from the upstream tool

## Project Structure

```
src/
├── bin/
│   └── mcp-discovery.ts    # CLI entrypoint
├── config/
│   ├── schema.ts           # Zod schemas for config validation
│   ├── loadConfig.ts       # Config file loading
│   └── index.ts            # Config module exports
├── mcp/
│   └── client/
│       ├── types.ts        # McpClient interface
│       ├── stdioClient.ts  # Stdio transport client
│       ├── httpClient.ts   # HTTP transport client (stub)
│       └── index.ts        # Client module exports
├── registry/
│   ├── ServerRegistry.ts   # Server registry with lazy connections
│   └── index.ts            # Registry module exports
├── routing/
│   ├── rankToolsForQuery.ts # Query-to-tool ranking
│   └── index.ts            # Routing module exports
├── server/
│   ├── createDiscoveryServer.ts # Server factory
│   ├── registerRouterTools.ts   # Tool registration
│   └── index.ts            # Server module exports
├── examples/
│   └── weather-server.ts   # Example upstream server
└── index.ts                # Library API exports
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Start the server
npm start
```

## License

ISC
