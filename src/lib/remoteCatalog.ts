// Shared remote catalog cache — used by catalog route and store action routes
// so that getCatalogApp() works for apps from the registry.

import type { CatalogApp } from "@/lib/catalog";
import { getCatalogApp as getStaticCatalogApp } from "@/lib/catalog";

const CATALOG_URL = process.env.CATALOG_URL
  ?? "https://raw.githubusercontent.com/tara-cloud/tara-app-registry/main/catalog.json";

let cache: { data: CatalogApp[]; ts: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000;

export async function fetchRemoteCatalog(): Promise<CatalogApp[]> {
  const now = Date.now();
  if (cache && now - cache.ts < CACHE_TTL) return cache.data;
  try {
    const res = await fetch(CATALOG_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`registry ${res.status}`);
    const data = await res.json() as CatalogApp[];
    cache = { data, ts: now };
    return data;
  } catch {
    return cache?.data ?? [];
  }
}

export function clearCatalogCache() { cache = null; }

/** Look up an app from the remote registry first, then static fallback. */
export async function getCatalogApp(id: string): Promise<CatalogApp | undefined> {
  const remote = await fetchRemoteCatalog();
  return remote.find((a) => a.id === id) ?? getStaticCatalogApp(id);
}
