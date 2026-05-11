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

const MCP_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json, text/event-stream",
};

/**
 * Parse an SSE response body to extract the JSON-RPC result.
 * MCP Streamable HTTP returns `text/event-stream` with `event: message` frames.
 */
function parseSseResponse(body: string): unknown {
  for (const line of body.split("\n")) {
    if (line.startsWith("data: ")) {
      try {
        return JSON.parse(line.slice(6));
      } catch {
        // skip malformed data lines
      }
    }
  }
  // Fallback: try parsing the entire body as JSON (in case server returns plain JSON)
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

/**
 * MCP Bridge provider factory for mcp-agent-bridge servers.
 *
 * Integrates with catesandrew/mcp-agent-bridge which provides MCP servers
 * for Claude, Codex, and Copilot CLIs via Streamable HTTP transport.
 *
 * The Streamable HTTP protocol requires:
 * 1. Accept header includes both application/json and text/event-stream
 * 2. First call must be `initialize` to get a Mcp-Session-Id
 * 3. Subsequent calls include that session ID header
 * 4. Responses come as SSE (text/event-stream)
 *
 * - Claude server (default :8960): `ask` tool with `{ question }` param
 * - Codex server (default :8961): `codex` tool with `{ prompt }` param
 * - Copilot server (default :8962): `ask` tool with `{ question }` param
 */
export function mcpBridgeProvider(
  serverUrl: string,
  serverName: string,
  toolConfig: { toolName: string; paramName: string }
) {
  const mcpUrl = `${serverUrl}/mcp`;

  async function initializeSession(
    timeoutMs: number
  ): Promise<string | null> {
    const response = await fetch(mcpUrl, {
      method: "POST",
      headers: MCP_HEADERS,
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name: "application-namer", version: "1.0.0" },
        },
        id: 1,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) return null;

    const sessionId = response.headers.get("mcp-session-id");

    // Consume the response body to avoid connection issues
    await response.text();

    return sessionId;
  }

  async function callMcpTool(prompt: string): Promise<string> {
    // Step 1: Initialize session
    const sessionId = await initializeSession(5_000);
    if (!sessionId) {
      throw new Error(`Failed to initialize MCP session with ${serverName}`);
    }

    // Step 2: Call the tool with the session ID
    const response = await fetch(mcpUrl, {
      method: "POST",
      headers: {
        ...MCP_HEADERS,
        "Mcp-Session-Id": sessionId,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: toolConfig.toolName,
          arguments: { [toolConfig.paramName]: prompt },
        },
        id: 2,
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      throw new Error(
        `MCP bridge ${serverName} returned ${response.status}: ${response.statusText}`
      );
    }

    const body = await response.text();
    const json = parseSseResponse(body) as Record<string, unknown> | null;

    if (!json) {
      throw new Error(`Could not parse response from ${serverName}`);
    }

    // MCP JSON-RPC response: { result: { content: [{ type: "text", text: "..." }] } }
    const result = json.result as Record<string, unknown> | undefined;
    const content = result?.content as Array<{ type: string; text: string }> | undefined;
    const text = content?.[0]?.text ?? "";

    if (typeof text !== "string" || text.length === 0) {
      throw new Error(`Empty or unexpected response format from ${serverName}`);
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
        const sessionId = await initializeSession(2_000);
        return sessionId !== null;
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
