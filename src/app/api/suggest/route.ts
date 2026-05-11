import { NextRequest, NextResponse } from "next/server";
import { validatePackageName } from "@/lib/validation";
import { generateSuggestions } from "@/lib/suggestions";
import { checkNames } from "@/lib/registries";
import type { NameContext, SuggestionResult, SuggestResponse } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, provider, context } = body as {
    name: string;
    provider: string;
    context: NameContext;
  };

  const validation = validatePackageName(name);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  let rawSuggestions: string[];
  try {
    rawSuggestions = await generateSuggestions(name, provider, context);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err), provider },
      { status: 503 }
    );
  }

  const validSuggestions = rawSuggestions.filter(
    (s) => validatePackageName(s).valid
  );

  const registryResults = await checkNames(validSuggestions);

  const suggestions: SuggestionResult[] = validSuggestions.map((s) => ({
    name: s,
    results: registryResults[s]?.results ?? ({} as SuggestionResult["results"]),
  }));

  const response: SuggestResponse = { suggestions };
  return NextResponse.json(response);
}
