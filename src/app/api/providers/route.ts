import { NextResponse } from "next/server";
import { getAvailableProviders } from "@/lib/suggestions";

export async function GET() {
  const providers = await getAvailableProviders();
  return NextResponse.json(providers);
}
