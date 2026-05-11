import Anthropic from "@anthropic-ai/sdk";
import type { NameContext } from "@/lib/types";

const MODEL = "claude-sonnet-4-20250514";

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

export async function claudeProvider(
  name: string,
  context: NameContext
): Promise<string[]> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      tools: [
        {
          name: "suggest_names",
          description: "Return an array of 8 alternative project names",
          input_schema: {
            type: "object" as const,
            properties: {
              names: {
                type: "array",
                items: { type: "string" },
                description: "Array of 8 alternative package names",
              },
            },
            required: ["names"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "suggest_names" },
      messages: [{ role: "user", content: buildPrompt(name, context) }],
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      throw new Error(
        "Invalid ANTHROPIC_API_KEY. Check your API key configuration."
      );
    }
    return [];
  }

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return [];
  }

  const input = toolUse.input as { names?: unknown };
  if (!Array.isArray(input.names)) {
    return [];
  }

  return input.names.filter((n): n is string => typeof n === "string");
}
