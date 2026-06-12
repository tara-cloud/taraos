import { NextResponse } from "next/server";
import type { CatalogApp } from "@/lib/catalog";
import { readInstalled } from "@/lib/installedApps";
import { fetchRemoteCatalog, clearCatalogCache } from "@/lib/remoteCatalog";

function withInstalledFlags(apps: CatalogApp[]) {
  const installed = readInstalled();
  const installedIds = new Set(installed.map((a) => a.id));
  // Store shows only helm-installable apps (no externalDocker, no manualInstall)
  return apps
    .filter((a) => !a.externalDocker && !a.manualInstall)
    .map((a) => ({ ...a, installed: installedIds.has(a.id) }));
}

export async function GET() {
  try {
    const data = await fetchRemoteCatalog();
    return NextResponse.json({ apps: withInstalledFlags(data) });
  } catch {
    return NextResponse.json({ apps: [] });
  }
}

export async function POST() {
  clearCatalogCache();
  return NextResponse.json({ ok: true, message: "Catalog cache cleared" });
}
