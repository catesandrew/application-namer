export async function registryFetch(
  url: string,
  options?: { timeout?: number; headers?: Record<string, string> }
): Promise<Response> {
  const timeout = options?.timeout ?? 4000;
  const signal = AbortSignal.timeout(timeout);

  return fetch(url, {
    signal,
    headers: options?.headers,
  });
}
