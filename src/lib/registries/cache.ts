import type { RegistryId, RegistryResult } from "@/lib/types";

const TTL_MS = 300_000; // 5 minutes
const MAX_ENTRIES = 1000;

interface CacheEntry {
  result: RegistryResult;
  expiresAt: number;
  insertedAt: number;
}

const cache = new Map<string, CacheEntry>();
let insertionCounter = 0;

function normalizeName(registryId: RegistryId, name: string): string {
  if (registryId === "pypi") {
    return name.replace(/[-_.]+/g, "-").toLowerCase();
  }
  return name;
}

function cacheKey(registryId: RegistryId, name: string): string {
  return `${registryId}:${normalizeName(registryId, name)}`;
}

function evictOldest(): void {
  let oldestKey: string | undefined;
  let oldestInsertedAt = Infinity;

  for (const [key, entry] of cache) {
    if (entry.insertedAt < oldestInsertedAt) {
      oldestInsertedAt = entry.insertedAt;
      oldestKey = key;
    }
  }

  if (oldestKey !== undefined) {
    cache.delete(oldestKey);
  }
}

export function getFromCache(
  registryId: RegistryId,
  name: string
): RegistryResult | undefined {
  const key = cacheKey(registryId, name);
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.result;
}

export function setInCache(
  registryId: RegistryId,
  name: string,
  result: RegistryResult
): void {
  const key = cacheKey(registryId, name);

  if (!cache.has(key) && cache.size >= MAX_ENTRIES) {
    evictOldest();
  }

  cache.set(key, {
    result,
    expiresAt: Date.now() + TTL_MS,
    insertedAt: insertionCounter++,
  });
}

export function clearCache(): void {
  cache.clear();
  insertionCounter = 0;
}
