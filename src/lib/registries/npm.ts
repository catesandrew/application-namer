import type { RegistryResult } from "@/lib/types";
import { registryFetch } from "@/lib/registry-client";

export async function checkNpm(name: string): Promise<RegistryResult> {
  try {
    const [pkgRes, dlRes] = await Promise.all([
      registryFetch(`https://registry.npmjs.org/${encodeURIComponent(name)}`),
      registryFetch(
        `https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(name)}`
      ).catch(() => null),
    ]);

    if (pkgRes.status === 404) {
      return { status: "available", name };
    }

    if (!pkgRes.ok) {
      return { status: "error", name, error: `HTTP ${pkgRes.status}` };
    }

    const pkg = await pkgRes.json();
    const latestVersion: string | undefined = pkg["dist-tags"]?.latest;
    const description: string | undefined = pkg.description;

    let downloads: string | number = "N/A";
    if (dlRes && dlRes.ok) {
      const dlData = await dlRes.json().catch(() => null);
      if (dlData?.downloads != null) {
        downloads = dlData.downloads as number;
      }
    }

    return {
      status: "taken",
      name,
      description,
      url: `https://www.npmjs.com/package/${name}`,
      extra: { latestVersion, weeklyDownloads: downloads },
    };
  } catch (err) {
    return { status: "error", name, error: String(err) };
  }
}
