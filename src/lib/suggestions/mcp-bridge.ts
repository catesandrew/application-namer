import type { NameContext } from "@/lib/types";

const HEALTH_CHECK_TIMEOUT_MS = 2000;

interface McpResponse {
  result?: {
    content?: Array<{ type: string; text?: string }>;
  };
  error?: { message: string };
}

function buildPrompt(name: string, context: NameContext): string {
  return `Suggest 8 creative, memorable alternative names for a software project called "${name}".

Context: This name is already taken on: ${context.takenOn.join(", ")}.

Requirements:
- Each name should be a single word or hyphenated (valid package name: lowercase, alphanumeric, hyphens)
- Names should be memorable, easy to spell, and related to the original concept
- Avoid generic prefixes like "my-" or "the-"
- Mix approaches: synonyms, metaphors, portmanteaus, related concepts
Return ONLY a JSON array of strings.`;
}

async function callMcpAsk(
  serverUrl: string,
  question: string,
  signal?: AbortSignal
): Promise<string> {
  const response = await fetch(`${serverUrl}/mcp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "tools/call",
      params: { name: "ask", arguments: { question } },
      id: 1,
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`MCP bridge returned ${response.status}`);
  }

  const data = (await response.json()) as McpResponse;

  if (data.error) {
    throw new Error(data.error.message);
  }

  const content = data.result?.content;
  if (Array.isArray(content)) {
    const textBlock = content.find(
      (c) => c.type === "text" && typeof c.text === "string"
    );
    if (textBlock?.text) {
      return textBlock.text;
    }
  }

  return "";
}

function extractNamesFromText(text: string): string[] {
  // Try direct JSON parse first
  try {
    const parsed = JSON.parse(text) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((n): n is string => typeof n === "string");
    }
  } catch {
    // fall through to pattern matching
  }

  // Look for array pattern in text
  const match = text.match(/\[[\s\S]*?\]/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((n): n is string => typeof n === "string");
      }
    } catch {
      // ignore
    }
  }

  return [];
}

export function mcpBridgeProvider(serverUrl: string, serverName: string) {
  return {
    serverUrl,
    serverName,

    async isAvailable(): Promise<boolean> {
      const controller = new AbortController();
      const timer = setTimeout(
        () => controller.abort(),
        HEALTH_CHECK_TIMEOUT_MS
      );
      try {
        await fetch(`${serverUrl}/mcp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "tools/call",
            params: { name: "ask", arguments: { question: "ping" } },
            id: 0,
          }),
          signal: controller.signal,
        });
        return true;
      } catch {
        return false;
      } finally {
        clearTimeout(timer);
      }
    },

    async generateSuggestions(
      name: string,
      context: NameContext
    ): Promise<string[]> {
      try {
        const text = await callMcpAsk(serverUrl, buildPrompt(name, context));
        return extractNamesFromText(text);
      } catch {
        return [];
      }
    },
  };
}
