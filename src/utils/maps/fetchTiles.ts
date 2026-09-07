const HEADERS = {
  "User-Agent": "oktechjp-site-build/1.0 (+https://oktech.jp)",
};

const RETRIES = 3;
const RETRY_BASE_MS = 250;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Fetches one tile; missing tiles (204/404) resolve to null, transient failures are retried. */
async function fetchTile(url: string): Promise<Buffer | null> {
  for (let attempt = 0; attempt < RETRIES; attempt++) {
    try {
      const response = await fetch(url, { headers: HEADERS });
      if (response.status === 204 || response.status === 404) return null;
      if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      if (attempt === RETRIES - 1) throw error;
      await delay(RETRY_BASE_MS * 2 ** attempt);
    }
  }
  return null;
}

/** Fetches tiles with a bounded number of in-flight requests, preserving input order. */
export async function fetchTiles(urls: string[], concurrency: number): Promise<(Buffer | null)[]> {
  const results: (Buffer | null)[] = new Array(urls.length).fill(null);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, urls.length) }, async () => {
    while (cursor < urls.length) {
      const index = cursor++;
      results[index] = await fetchTile(urls[index]);
    }
  });
  await Promise.all(workers);
  return results;
}
