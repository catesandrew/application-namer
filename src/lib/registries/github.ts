import type { RegistryResult } from "@/lib/types";
import { registryFetch } from "@/lib/registry-client";

function githubHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function exactMatch(items: Array<{ name: string }>, name: string): boolean {
  return items.some((r) => r.name.toLowerCase() === name.toLowerCase());
}

function topRepoExtra(
  items: Array<{ name: string; owner: { login: string }; stargazers_count: number; description: string | null }>
): Record<string, unknown> {
  if (items.length === 0) return {};
  const top = items[0];
  return {
    owner: top.owner?.login,
    stars: top.stargazers_count,
    description: top.description ?? undefined,
  };
}

export async function checkGitHub(name: string): Promise<RegistryResult> {
  try {
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(name)}+in:name&sort=stars&per_page=5`;
    const res = await registryFetch(url, { headers: githubHeaders() });

    if (res.status === 403 || res.status === 429) {
      return { status: "rate_limited", name };
    }

    if (!res.ok) {
      return { status: "error", name, error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    const items = data.items ?? [];

    if (exactMatch(items, name)) {
      const extra = topRepoExtra(items);
      return {
        status: "taken",
        name,
        description: extra.description as string | undefined,
        url: `https://github.com/search?q=${encodeURIComponent(name)}+in:name`,
        extra,
      };
    }

    return { status: "available", name };
  } catch (err) {
    return { status: "error", name, error: String(err) };
  }
}

export async function checkGitHubBatch(
  names: string[]
): Promise<Record<string, RegistryResult>> {
  if (names.length === 0) return {};

  try {
    const query = names.map((n) => encodeURIComponent(n)).join("+OR+");
    const url = `https://api.github.com/search/repositories?q=${query}+in:name&sort=stars&per_page=30`;
    const res = await registryFetch(url, { headers: githubHeaders() });

    if (res.status === 403 || res.status === 429) {
      return Object.fromEntries(
        names.map((n) => [n, { status: "rate_limited" as const, name: n }])
      );
    }

    if (!res.ok) {
      return Object.fromEntries(
        names.map((n) => [
          n,
          { status: "error" as const, name: n, error: `HTTP ${res.status}` },
        ])
      );
    }

    const data = await res.json();
    const items: Array<{ name: string; owner: { login: string }; stargazers_count: number; description: string | null }> =
      data.items ?? [];

    return Object.fromEntries(
      names.map((name) => {
        const matched = items.filter(
          (r) => r.name.toLowerCase() === name.toLowerCase()
        );
        if (matched.length > 0) {
          const extra = topRepoExtra(matched);
          return [
            name,
            {
              status: "taken" as const,
              name,
              description: extra.description as string | undefined,
              url: `https://github.com/search?q=${encodeURIComponent(name)}+in:name`,
              extra,
            },
          ];
        }
        return [name, { status: "available" as const, name }];
      })
    );
  } catch (err) {
    return Object.fromEntries(
      names.map((n) => [n, { status: "error" as const, name: n, error: String(err) }])
    );
  }
}
