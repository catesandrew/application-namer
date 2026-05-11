import type { RegistryResult } from "@/lib/types";
import { registryFetch } from "@/lib/registry-client";

export async function checkPyPI(name: string): Promise<RegistryResult> {
  try {
    const res = await registryFetch(
      `https://pypi.org/pypi/${encodeURIComponent(name)}/json`
    );

    if (res.status === 404) {
      return { status: "available", name };
    }

    if (!res.ok) {
      return { status: "error", name, error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    const info = data.info ?? {};
    const summary: string | undefined = info.summary ?? undefined;
    const latestVersion: string | undefined = info.version ?? undefined;
    const author: string | undefined = info.author ?? undefined;

    return {
      status: "taken",
      name,
      description: summary,
      url: `https://pypi.org/project/${name}/`,
      extra: { latestVersion, author },
    };
  } catch (err) {
    return { status: "error", name, error: String(err) };
  }
}
