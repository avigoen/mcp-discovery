import type { ToolInfo } from "../mcp/client/types.js";
import type { ServerConfig } from "../config/schema.js";

/**
 * A ranked tool candidate for a user query
 */
export interface RankedTool {
  serverId: string;
  serverName: string;
  toolName: string;
  toolDescription?: string;
  score: number;
  reason: string;
}

/**
 * Tokenize a string for matching: lowercase, split on whitespace/punctuation, filter empties
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s\-_.,;:!?()[\]{}'"\/\\]+/)
    .filter((t) => t.length > 0);
}

/**
 * Calculate overlap score between query tokens and target tokens.
 * Returns a value between 0 and 1.
 */
function calculateOverlapScore(queryTokens: string[], targetTokens: Set<string>): number {
  if (queryTokens.length === 0 || targetTokens.size === 0) {
    return 0;
  }

  let matches = 0;
  for (const queryToken of queryTokens) {
    // Exact match
    if (targetTokens.has(queryToken)) {
      matches += 1;
      continue;
    }
    // Partial match (query token is substring of target token or vice versa)
    for (const targetToken of targetTokens) {
      if (targetToken.includes(queryToken) || queryToken.includes(targetToken)) {
        matches += 0.5;
        break;
      }
    }
  }

  return matches / queryTokens.length;
}

/**
 * Build a matching reason explanation
 */
function buildReason(
  queryTokens: string[],
  serverTokens: Set<string>,
  toolTokens: Set<string>
): string {
  const serverMatches: string[] = [];
  const toolMatches: string[] = [];

  for (const qt of queryTokens) {
    for (const st of serverTokens) {
      if (st === qt || st.includes(qt) || qt.includes(st)) {
        serverMatches.push(st);
        break;
      }
    }
    for (const tt of toolTokens) {
      if (tt === qt || tt.includes(qt) || qt.includes(tt)) {
        toolMatches.push(tt);
        break;
      }
    }
  }

  const parts: string[] = [];
  if (serverMatches.length > 0) {
    parts.push(`server matches: ${[...new Set(serverMatches)].slice(0, 3).join(", ")}`);
  }
  if (toolMatches.length > 0) {
    parts.push(`tool matches: ${[...new Set(toolMatches)].slice(0, 3).join(", ")}`);
  }

  return parts.length > 0 ? parts.join("; ") : "low relevance match";
}

/**
 * Rank tools across all servers based on relevance to a user query.
 * 
 * Uses token overlap scoring between the query and:
 * - Server name, description, and tags
 * - Tool name and description
 * 
 * @param query - User's natural language query
 * @param serverTools - Map of serverId -> tools from that server
 * @param serverConfigs - Map of serverId -> ServerConfig
 * @param maxResults - Maximum number of results to return
 * @returns Ranked list of tool candidates
 */
export function rankToolsForQuery(
  query: string,
  serverTools: Map<string, ToolInfo[]>,
  serverConfigs: Map<string, ServerConfig>,
  maxResults: number = 5
): RankedTool[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) {
    return [];
  }

  const candidates: RankedTool[] = [];

  for (const [serverId, tools] of serverTools) {
    const config = serverConfigs.get(serverId);
    if (!config) continue;

    // Build server token set
    const serverText = [
      config.name,
      config.description ?? "",
      ...config.tags,
    ].join(" ");
    const serverTokens = new Set(tokenize(serverText));
    const serverScore = calculateOverlapScore(queryTokens, serverTokens);

    for (const tool of tools) {
      // Build tool token set
      const toolText = [tool.name, tool.title ?? "", tool.description ?? ""].join(" ");
      const toolTokens = new Set(tokenize(toolText));
      const toolScore = calculateOverlapScore(queryTokens, toolTokens);

      // Combined score: weight tool matches slightly higher
      const combinedScore = serverScore * 0.4 + toolScore * 0.6;

      if (combinedScore > 0) {
        candidates.push({
          serverId,
          serverName: config.name,
          toolName: tool.name,
          toolDescription: tool.description,
          score: Math.round(combinedScore * 100) / 100,
          reason: buildReason(queryTokens, serverTokens, toolTokens),
        });
      }
    }
  }

  // Sort by score descending, then by tool name for stability
  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.toolName.localeCompare(b.toolName);
  });

  return candidates.slice(0, maxResults);
}

