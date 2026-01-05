import { z } from "zod";

/**
 * Transport configuration for stdio-based MCP servers
 */
export const StdioTransportConfigSchema = z.object({
  type: z.literal("stdio"),
  command: z.string().describe("Command to spawn the MCP server"),
  args: z.array(z.string()).default([]).describe("Arguments for the command"),
  env: z.record(z.string()).optional().describe("Environment variables to pass"),
  cwd: z.string().optional().describe("Working directory for the subprocess"),
});

/**
 * Transport configuration for HTTP/SSE-based MCP servers (placeholder for future)
 */
export const HttpTransportConfigSchema = z.object({
  type: z.literal("http"),
  url: z.string().url().describe("Base URL of the MCP server"),
  headers: z.record(z.string()).optional().describe("HTTP headers to include"),
});

/**
 * Union of all supported transport configurations
 */
export const TransportConfigSchema = z.discriminatedUnion("type", [
  StdioTransportConfigSchema,
  HttpTransportConfigSchema,
]);

/**
 * Configuration for a single upstream MCP server
 */
export const ServerConfigSchema = z.object({
  id: z.string().describe("Unique identifier for this server"),
  name: z.string().describe("Human-readable name"),
  description: z.string().optional().describe("Description of what this server provides"),
  transport: TransportConfigSchema,
  enabled: z.boolean().default(true).describe("Whether this server is enabled"),
  tags: z.array(z.string()).default([]).describe("Tags for categorization/routing"),
});

/**
 * Root configuration schema for mcp-discovery
 */
export const DiscoveryConfigSchema = z.object({
  version: z.literal("1.0").default("1.0"),
  servers: z.array(ServerConfigSchema).describe("List of upstream MCP servers"),
  routing: z
    .object({
      maxResults: z.number().int().positive().default(5).describe("Max tools to return in route-query"),
      cacheTtlMs: z.number().int().nonnegative().default(60000).describe("TTL for tool cache in ms"),
    })
    .default({}),
});

// Type exports inferred from schemas
export type StdioTransportConfig = z.infer<typeof StdioTransportConfigSchema>;
export type HttpTransportConfig = z.infer<typeof HttpTransportConfigSchema>;
export type TransportConfig = z.infer<typeof TransportConfigSchema>;
export type ServerConfig = z.infer<typeof ServerConfigSchema>;
export type DiscoveryConfig = z.infer<typeof DiscoveryConfigSchema>;

