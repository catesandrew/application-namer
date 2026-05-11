import type { NameContext } from "@/lib/types";

const SUGGESTION_PROMPT_TEMPLATE = (name: string, context: NameContext) =>
  `Suggest 8 creative, memorable alternative names for a software project called "${name}".

Context: This name is already taken on: ${context.takenOn.join(", ")}.

Requirements for suggestions:
- Each name should be a single word or hyphenated (valid package name: lowercase, alphanumeric, hyphens)
- Names should be memorable, easy to spell, and related to the original concept
- Avoid generic prefixes like "my-" or "the-"
- Mix approaches: synonyms, metaphors, portmanteaus, related concepts

Return ONLY a JSON array of strings, e.g.: ["name1", "name2", ...]`;

/**
 * MCP Bridge provider factory for mcp-agent-bridge servers.
 *
 * Integrates with catesandrew/mcp-agent-bridge which provides MCP servers
 * for Claude, Codex, and Copilot CLIs via Streamable HTTP transport.
 *
 * - Claude server (default :8940): `ask` tool with `{ question }` param
 * - Codex server (default :8941): `codex` tool with `{ prompt }` param
 * - Copilot server (default :8945): `ask` tool with `{ question }` param
 */
export function mcpBridgeProvider(
  serverUrl: string,
  serverName: string,
  toolConfig: { toolName: string; paramName: string }
) {
  async function callMcpTool(prompt: string): Promise<string> {
    const url = `${serverUrl}/mcp`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: toolConfig.toolName,
          arguments: { [toolConfig.paramName]: prompt },
        },
        id: 1,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      throw new Error(
        `MCP bridge ${serverName} returned ${response.status}: ${response.statusText}`
      );
    }

    const json = await response.json();

    // MCP JSON-RPC response: { result: { content: [{ type: "text", text: "..." }] } }
    const text =
      json?.result?.content?.[0]?.text ??
      json?.result?.result ??
      json?.result ??
      "";

    if (typeof text !== "string") {
      throw new Error(`Unexpected response format from ${serverName}`);
    }

    return text;
  }

  function extractJsonArray(text: string): string[] {
    // Try direct JSON parse first
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed.filter((s) => typeof s === "string");
      if (parsed?.suggestions && Array.isArray(parsed.suggestions))
        return parsed.suggestions.filter((s: unknown) => typeof s === "string");
    } catch {
      // Fall through to regex extraction
    }

    // Extract JSON array from text (AI responses sometimes wrap in markdown)
    const match = text.match(/\[[\s\S]*?\]/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed))
          return parsed.filter((s) => typeof s === "string");
      } catch {
        // Could not parse extracted array
      }
    }

    return [];
  }

  return {
    async isAvailable(): Promise<boolean> {
      try {
        const response = await fetch(`${serverUrl}/mcp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "tools/list",
            params: {},
            id: 0,
          }),
          signal: AbortSignal.timeout(2_000),
        });
        return response.ok;
      } catch {
        return false;
      }
    },

    async generateSuggestions(
      name: string,
      context: NameContext
    ): Promise<string[]> {
      const prompt = SUGGESTION_PROMPT_TEMPLATE(name, context);
      const responseText = await callMcpTool(prompt);
      return extractJsonArray(responseText);
    },
  };
}

// Pre-configured providers for mcp-agent-bridge servers
export const mcpClaudeProvider = mcpBridgeProvider(
  process.env.MCP_CLAUDE_URL ?? "http://localhost:8960",
  "Claude MCP",
  { toolName: "ask", paramName: "question" }
);

export const mcpCodexProvider = mcpBridgeProvider(
  process.env.MCP_CODEX_URL ?? "http://localhost:8961",
  "Codex MCP",
  { toolName: "codex", paramName: "prompt" }
);

export const mcpCopilotProvider = mcpBridgeProvider(
  process.env.MCP_COPILOT_URL ?? "http://localhost:8962",
  "Copilot MCP",
  { toolName: "ask", paramName: "question" }
);
