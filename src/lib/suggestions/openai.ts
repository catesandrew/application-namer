import OpenAI from "openai";
import type { NameContext } from "@/lib/types";

const MODEL = "gpt-4o-mini";

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

export async function openaiProvider(
  name: string,
  context: NameContext
): Promise<string[]> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  let response: OpenAI.Chat.ChatCompletion;
  try {
    response = await client.chat.completions.create({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'You are a creative naming assistant. Always respond with a JSON object containing a "names" array of strings.',
        },
        { role: "user", content: buildPrompt(name, context) },
      ],
    });
  } catch (error) {
    if (error instanceof OpenAI.AuthenticationError) {
      throw new Error(
        "Invalid OPENAI_API_KEY. Check your API key configuration."
      );
    }
    return [];
  }

  const content = response.choices[0]?.message?.content;
  if (!content) {
    return [];
  }

  try {
    const parsed = JSON.parse(content) as { names?: unknown };
    if (Array.isArray(parsed.names)) {
      return parsed.names.filter((n): n is string => typeof n === "string");
    }
    return [];
  } catch {
    return [];
  }
}
