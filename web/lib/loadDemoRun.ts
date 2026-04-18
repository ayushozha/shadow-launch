import type { Run } from "./types";

// Lane A demo data loader. Serves the pre-baked cached run from /public/cache.
// Swap to a real backend fetch once the FastAPI orchestrator ships (spec §3.1).

const DEMO_CACHE_PATH = "/cache/demo-linear.json";

export async function loadDemoRun(signal?: AbortSignal): Promise<Run> {
  const res = await fetch(DEMO_CACHE_PATH, { signal, cache: "no-store" });
  if (!res.ok) {
    throw new Error(
      `Failed to load demo run (${res.status} ${res.statusText}). Expected file at ${DEMO_CACHE_PATH}.`,
    );
  }
  return (await res.json()) as Run;
}
