import type { CheckResponse, RegistryId, RegistryResult } from "@/lib/types";
import { checkNpm } from "./npm";
import { checkHomebrewFormulae, checkHomebrewCask } from "./homebrew";
import { checkPyPI } from "./pypi";
import { checkGitHub, checkGitHubBatch } from "./github";
import { getFromCache, setInCache } from "./cache";

const REGISTRY_IDS = [
  "npm",
  "homebrew-formulae",
  "homebrew-cask",
  "pypi",
  "github",
] as const satisfies RegistryId[];

function hasPyPINormalizationChars(name: string): boolean {
  return /[-_.]/.test(name);
}

function errorResult(name: string, err: unknown): RegistryResult {
  return { status: "error", name, error: String(err) };
}

async function fetchWithCache(
  registryId: RegistryId,
  name: string,
  fetcher: () => Promise<RegistryResult>
): Promise<RegistryResult> {
  const cached = getFromCache(registryId, name);
  if (cached) return cached;
  const result = await fetcher();
  setInCache(registryId, name, result);
  return result;
}

export async function checkName(name: string): Promise<CheckResponse> {
  const warnings: string[] = [];

  if (hasPyPINormalizationChars(name)) {
    warnings.push(
      `PyPI normalizes package names: "${name}" may match packages with different separators (-, _, .)`
    );
  }

  const [npmR, formulaeR, caskR, pypiR, githubR] = await Promise.allSettled([
    fetchWithCache("npm", name, () => checkNpm(name)),
    fetchWithCache("homebrew-formulae", name, () => checkHomebrewFormulae(name)),
    fetchWithCache("homebrew-cask", name, () => checkHomebrewCask(name)),
    fetchWithCache("pypi", name, () => checkPyPI(name)),
    fetchWithCache("github", name, () => checkGitHub(name)),
  ]);

  function settle(
    r: PromiseSettledResult<RegistryResult>
  ): RegistryResult {
    return r.status === "fulfilled" ? r.value : errorResult(name, r.reason);
  }

  const results: Record<RegistryId, RegistryResult> = {
    npm: settle(npmR),
    "homebrew-formulae": settle(formulaeR),
    "homebrew-cask": settle(caskR),
    pypi: settle(pypiR),
    github: settle(githubR),
  };

  return { results, warnings: warnings.length > 0 ? warnings : undefined };
}

export async function checkNames(
  names: string[]
): Promise<Record<string, CheckResponse>> {
  if (names.length === 0) return {};

  // Run npm, homebrew, pypi per-name with cache; GitHub as a single batch
  const perNameRegistries: Array<{
    id: RegistryId;
    fetcher: (name: string) => Promise<RegistryResult>;
  }> = [
    { id: "npm", fetcher: checkNpm },
    { id: "homebrew-formulae", fetcher: checkHomebrewFormulae },
    { id: "homebrew-cask", fetcher: checkHomebrewCask },
    { id: "pypi", fetcher: checkPyPI },
  ];

  // Names that are not fully cached for GitHub
  const githubUncached = names.filter(
    (n) => getFromCache("github", n) === undefined
  );

  const [perNameResults, githubBatchResults] = await Promise.all([
    Promise.all(
      names.map(async (name) => {
        const settled = await Promise.allSettled(
          perNameRegistries.map(({ id, fetcher }) =>
            fetchWithCache(id, name, () => fetcher(name))
          )
        );
        return { name, settled };
      })
    ),
    githubUncached.length > 0
      ? checkGitHubBatch(githubUncached)
      : Promise.resolve({} as Record<string, RegistryResult>),
  ]);

  // Store GitHub batch results in cache
  for (const [name, result] of Object.entries(githubBatchResults)) {
    setInCache("github", name, result);
  }

  const output: Record<string, CheckResponse> = {};

  for (const { name, settled } of perNameResults) {
    const warnings: string[] = [];
    if (hasPyPINormalizationChars(name)) {
      warnings.push(
        `PyPI normalizes package names: "${name}" may match packages with different separators (-, _, .)`
      );
    }

    const [npmR, formulaeR, caskR, pypiR] = settled;
    const githubResult =
      getFromCache("github", name) ?? errorResult(name, "GitHub batch failed");

    const results: Record<RegistryId, RegistryResult> = {
      npm: npmR.status === "fulfilled" ? npmR.value : errorResult(name, npmR.reason),
      "homebrew-formulae":
        formulaeR.status === "fulfilled"
          ? formulaeR.value
          : errorResult(name, formulaeR.reason),
      "homebrew-cask":
        caskR.status === "fulfilled"
          ? caskR.value
          : errorResult(name, caskR.reason),
      pypi:
        pypiR.status === "fulfilled"
          ? pypiR.value
          : errorResult(name, pypiR.reason),
      github: githubResult,
    };

    output[name] = { results, warnings: warnings.length > 0 ? warnings : undefined };
  }

  return output;
}

export { REGISTRY_IDS };
