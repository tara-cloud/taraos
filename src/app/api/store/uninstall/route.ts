import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { getCatalogApp } from "@/lib/catalog";
import { readInstalled, writeInstalled } from "@/lib/installedApps";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  const { id } = await req.json() as { id: string };
  const catalog = getCatalogApp(id);
  if (!catalog) return NextResponse.json({ ok: false, message: "App not found" }, { status: 404 });

  const installed = readInstalled();
  if (!installed.find((a) => a.id === id)) {
    return NextResponse.json({ ok: false, message: "Not installed" }, { status: 404 });
  }

  try {
    await execAsync(`docker stop ${catalog.containerName}`, { timeout: 30_000 }).catch(() => {});
    await execAsync(`docker rm ${catalog.containerName}`, { timeout: 10_000 }).catch(() => {});
    writeInstalled(installed.filter((a) => a.id !== id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, message: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
