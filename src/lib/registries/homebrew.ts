import type { RegistryResult } from "@/lib/types";
import { registryFetch } from "@/lib/registry-client";

async function checkHomebrew(
  type: "formula" | "cask",
  name: string
): Promise<RegistryResult> {
  const endpoint =
    type === "formula"
      ? `https://formulae.brew.sh/api/formula/${encodeURIComponent(name)}.json`
      : `https://formulae.brew.sh/api/cask/${encodeURIComponent(name)}.json`;

  try {
    const res = await registryFetch(endpoint);

    if (res.status === 404) {
      return { status: "available", name };
    }

    if (!res.ok) {
      return { status: "error", name, error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    const description: string | undefined =
      data.desc ?? data.description ?? undefined;
    const homepage: string | undefined = data.homepage ?? undefined;

    return {
      status: "taken",
      name,
      description,
      url: homepage,
      extra: { homepage },
    };
  } catch (err) {
    return { status: "error", name, error: String(err) };
  }
}

export function checkHomebrewFormulae(name: string): Promise<RegistryResult> {
  return checkHomebrew("formula", name);
}

export function checkHomebrewCask(name: string): Promise<RegistryResult> {
  return checkHomebrew("cask", name);
}
