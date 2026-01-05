import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { DiscoveryConfigSchema, type DiscoveryConfig } from "./schema.js";

/**
 * Default config file name
 */
export const DEFAULT_CONFIG_FILENAME = "mcp-discovery.config.json";

/**
 * Search paths for config file (in order of priority)
 */
function getSearchPaths(cwd: string): string[] {
  return [
    resolve(cwd, DEFAULT_CONFIG_FILENAME),
    resolve(cwd, ".mcp-discovery.json"),
  ];
}

/**
 * Load and validate the mcp-discovery configuration file.
 * 
 * @param configPath - Optional explicit path to config file. If not provided, searches default locations.
 * @param cwd - Working directory for relative path resolution (defaults to process.cwd())
 * @returns Validated configuration object
 * @throws Error if config file not found or validation fails
 */
export async function loadConfig(
  configPath?: string,
  cwd: string = process.cwd()
): Promise<DiscoveryConfig> {
  let resolvedPath: string;
  let rawContent: string;

  if (configPath) {
    // Explicit path provided
    resolvedPath = resolve(cwd, configPath);
    try {
      rawContent = await readFile(resolvedPath, "utf-8");
    } catch (err) {
      throw new Error(`Failed to read config file at ${resolvedPath}: ${(err as Error).message}`);
    }
  } else {
    // Search default locations
    const searchPaths = getSearchPaths(cwd);
    let found = false;

    for (const searchPath of searchPaths) {
      try {
        rawContent = await readFile(searchPath, "utf-8");
        resolvedPath = searchPath;
        found = true;
        break;
      } catch {
        // Continue to next path
      }
    }

    if (!found) {
      throw new Error(
        `Config file not found. Searched: ${searchPaths.join(", ")}. ` +
        `Create a ${DEFAULT_CONFIG_FILENAME} file or specify --config path.`
      );
    }
  }

  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent!);
  } catch (err) {
    throw new Error(`Invalid JSON in config file ${resolvedPath!}: ${(err as Error).message}`);
  }

  // Validate with Zod
  const result = DiscoveryConfigSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Config validation failed:\n${issues}`);
  }

  return result.data;
}

/**
 * Re-export types for convenience
 */
export type { DiscoveryConfig, ServerConfig, TransportConfig } from "./schema.js";

