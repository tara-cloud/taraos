import { NextResponse } from "next/server";
import { CATALOG, type CatalogApp } from "@/lib/catalog";
import { readInstalled } from "@/lib/installedApps";

const CATALOG_URL = process.env.CATALOG_URL
  ?? "https://raw.githubusercontent.com/tara-cloud/tara-app-registry/main/catalog.json";

// 1-hour in-memory cache
let catalogCache: { data: CatalogApp[]; ts: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000;

function withInstalledFlags(apps: CatalogApp[]) {
  const installed = readInstalled();
  const installedIds = new Set(installed.map((a) => a.id));
  // Also mark externalDocker apps from static catalog
  const externalIds = new Set(CATALOG.filter((a) => a.externalDocker).map((a) => a.id));
  return apps.map((a) => ({ ...a, installed: installedIds.has(a.id) }))
    .concat(
      CATALOG.filter((a) => a.externalDocker).map((a) => ({
        ...a,
        installed: externalIds.has(a.id),
      }))
    );
}

export async function GET() {
  const now = Date.now();

  // Serve from cache if fresh
  if (catalogCache && now - catalogCache.ts < CACHE_TTL) {
    return NextResponse.json({ apps: withInstalledFlags(catalogCache.data) });
  }

  try {
    const res = await fetch(CATALOG_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`registry fetch failed: ${res.status}`);
    const data = await res.json() as CatalogApp[];
    catalogCache = { data, ts: now };
    return NextResponse.json({ apps: withInstalledFlags(data) });
  } catch {
    // Fallback: serve only externalDocker apps from static catalog
    const fallback = CATALOG.filter((a) => a.externalDocker);
    return NextResponse.json({ apps: withInstalledFlags(fallback) });
  }
}

// Allow force-refreshing the cache (e.g. after adding an app to the registry)
export async function POST() {
  catalogCache = null;
  return NextResponse.json({ ok: true, message: "Catalog cache cleared" });
}
