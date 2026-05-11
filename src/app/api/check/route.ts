import { NextRequest, NextResponse } from "next/server";
import { validatePackageName } from "@/lib/validation";
import { checkName } from "@/lib/registries";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name } = body as { name: string };

  const validation = validatePackageName(name);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const response = await checkName(name);
  return NextResponse.json(response);
}
