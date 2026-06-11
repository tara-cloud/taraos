import { NextRequest, NextResponse } from "next/server";
import { getCatalogApp } from "@/lib/catalog";
import { readInstalled, writeInstalled } from "@/lib/installedApps";
import { execAsync, k8sAuth, helmAuthFlags } from "@/lib/helm";

export async function POST(req: NextRequest) {
  const { id } = await req.json() as { id: string };
  const catalog = getCatalogApp(id);
  if (!catalog) return NextResponse.json({ ok: false, message: "App not found" }, { status: 404 });

  const installed = readInstalled();
  const entry = installed.find((a) => a.id === id);
  if (!entry) return NextResponse.json({ ok: false, message: "Not installed" }, { status: 404 });

  try {
    if (entry.installMethod === "helm" && entry.helmRelease && entry.helmNamespace) {
      const auth = k8sAuth();
      const af   = helmAuthFlags(auth);
      await execAsync(
        `helm uninstall ${entry.helmRelease} ${af} --namespace ${entry.helmNamespace}`.trim(),
        { timeout: 60_000 }
      );
    } else {
      await execAsync(`docker stop ${catalog.containerName}`, { timeout: 30_000 }).catch(() => {});
      await execAsync(`docker rm ${catalog.containerName}`,   { timeout: 10_000 }).catch(() => {});
    }

    writeInstalled(installed.filter((a) => a.id !== id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, message: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
