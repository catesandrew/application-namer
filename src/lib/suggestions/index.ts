import type { NameContext, ProviderInfo } from "@/lib/types";
import { claudeProvider } from "./claude";
import { openaiProvider } from "./openai";
import {
  mcpClaudeProvider,
  mcpCodexProvider,
  mcpCopilotProvider,
} from "./mcp-bridge";

export async function getAvailableProviders(): Promise<ProviderInfo[]> {
  const [mcpClaudeAvailable, mcpCodexAvailable, mcpCopilotAvailable] =
    await Promise.all([
      mcpClaudeProvider.isAvailable(),
      mcpCodexProvider.isAvailable(),
      mcpCopilotProvider.isAvailable(),
    ]);

  return [
    {
      id: "claude",
      name: "Claude API",
      available: !!process.env.ANTHROPIC_API_KEY,
    },
    {
      id: "openai",
      name: "OpenAI API",
      available: !!process.env.OPENAI_API_KEY,
    },
    { id: "mcp-claude", name: "Claude (MCP)", available: mcpClaudeAvailable },
    { id: "mcp-codex", name: "Codex (MCP)", available: mcpCodexAvailable },
    {
      id: "mcp-copilot",
      name: "Copilot (MCP)",
      available: mcpCopilotAvailable,
    },
  ];
}

export async function generateSuggestions(
  name: string,
  providerId: string,
  context: NameContext
): Promise<string[]> {
  switch (providerId) {
    case "claude":
      return claudeProvider(name, context);
    case "openai":
      return openaiProvider(name, context);
    case "mcp-claude":
      return mcpClaudeProvider.generateSuggestions(name, context);
    case "mcp-codex":
      return mcpCodexProvider.generateSuggestions(name, context);
    case "mcp-copilot":
      return mcpCopilotProvider.generateSuggestions(name, context);
    default:
      throw new Error(`Unknown provider: ${providerId}`);
  }
}
