import { NextResponse } from "next/server";
import { CATALOG } from "@/lib/catalog";
import { readInstalled } from "@/lib/installedApps";

export async function GET() {
  const installed = readInstalled();
  const installedIds = new Set(installed.map((a) => a.id));
  const apps = CATALOG.map((a) => ({ ...a, installed: installedIds.has(a.id) }));
  return NextResponse.json({ apps });
}
