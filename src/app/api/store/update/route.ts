import { NextRequest, NextResponse } from "next/server";
import { getCatalogApp } from "@/lib/remoteCatalog";
import { readInstalled, writeInstalled } from "@/lib/installedApps";
import { execAsync, k8sAuth, helmAuthFlags, resolveChart, buildSetFlags } from "@/lib/helm";

export async function POST(req: NextRequest) {
  const { id } = await req.json() as { id: string };
  const catalog = await getCatalogApp(id);
  if (!catalog) return NextResponse.json({ ok: false, message: "App not found" }, { status: 404 });

  const installed = readInstalled();
  const entry = installed.find((a) => a.id === id);
  if (!entry) return NextResponse.json({ ok: false, message: "Not installed" }, { status: 404 });

  try {
    if (entry.installMethod === "helm" && catalog.helmChart) {
      const hc   = catalog.helmChart;
      const auth = k8sAuth();
      const af   = helmAuthFlags(auth);
      const chart    = resolveChart(hc.chart);
      const setFlags = hc.values ? buildSetFlags(hc.values) : "";
      const verFlag  = hc.version ? `--version ${hc.version}` : "";

      if (hc.repo && hc.repoName) {
        await execAsync(`helm repo update ${hc.repoName}`, { timeout: 30_000 }).catch(() => {});
      }

      await execAsync(
        `helm upgrade ${hc.releaseName} ${chart} ${af} --namespace ${hc.namespace} --reuse-values ${verFlag} ${setFlags}`.trim(),
        { timeout: 180_000 }
      );

      writeInstalled(installed.map((a) => a.id === id ? { ...a, installedTag: hc.version ?? "latest" } : a));
      return NextResponse.json({ ok: true });
    }

    // Docker fallback
    await execAsync(`docker pull ${catalog.dockerImage}:latest`, { timeout: 180_000 });
    await execAsync(`docker stop ${catalog.containerName} && docker rm ${catalog.containerName}`, { timeout: 30_000 }).catch(() => {});
    const parts = [
      "docker", "run", "-d", `--name ${catalog.containerName}`, "--restart=unless-stopped",
      `-p ${catalog.defaultPort}:${catalog.defaultPort}`,
      ...(catalog.volumes ?? []).map((v) => `-v ${v}`),
      ...(catalog.envVars  ?? []).map((e) => `-e ${e}`),
      `${catalog.dockerImage}:latest`,
    ];
    await execAsync(parts.join(" "), { timeout: 30_000 });
    writeInstalled(installed.map((a) => a.id === id ? { ...a, installedTag: "latest" } : a));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, message: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
