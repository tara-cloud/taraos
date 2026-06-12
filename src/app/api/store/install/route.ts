import { NextRequest, NextResponse } from "next/server";
import { getCatalogApp } from "@/lib/remoteCatalog";
import { readInstalled, writeInstalled } from "@/lib/installedApps";
import { execAsync, k8sAuth, helmAuthFlags, resolveChart, buildSetFlags } from "@/lib/helm";

export async function POST(req: NextRequest) {
  const { id } = await req.json() as { id: string };
  const catalog = await getCatalogApp(id);
  if (!catalog) return NextResponse.json({ ok: false, message: "App not found" }, { status: 404 });
  if (catalog.manualInstall) return NextResponse.json({ ok: false, message: "This app requires manual installation." }, { status: 400 });

  const installed = readInstalled();
  // Allow reinstall if already tracked (idempotent with helm upgrade --install)

  try {
    if (catalog.helmChart) {
      const hc   = catalog.helmChart;
      const auth = k8sAuth();
      const af   = helmAuthFlags(auth);

      // Add public repo if needed (no k8s flags — helm repo add doesn't need them)
      if (hc.repo && hc.repoName) {
        await execAsync(`helm repo add ${hc.repoName} ${hc.repo}`, { timeout: 30_000 }).catch(() => {});
        await execAsync(`helm repo update ${hc.repoName}`, { timeout: 30_000 }).catch(() => {});
      }

      const chart    = resolveChart(hc.chart);
      const setFlags = hc.values ? buildSetFlags(hc.values) : "";
      const verFlag  = hc.version ? `--version ${hc.version}` : "";

      await execAsync(
        `helm upgrade --install ${hc.releaseName} ${chart} ${af} --namespace ${hc.namespace} --create-namespace ${verFlag} ${setFlags}`.trim(),
        { timeout: 180_000 }
      );

      const entry = {
        id, installedAt: new Date().toISOString(), installedTag: hc.version ?? "latest",
        containerName: hc.releaseName, port: hc.nodePort,
        installMethod: "helm" as const, helmRelease: hc.releaseName, helmNamespace: hc.namespace,
      };
      // Upsert — replace existing entry with same id to avoid duplicates
      const withoutOld = installed.filter((a) => a.id !== id);
      writeInstalled([...withoutOld, entry]);
      return NextResponse.json({ ok: true, app: entry });
    }

    // Docker fallback
    const parts = [
      "docker", "run", "-d", `--name ${catalog.containerName}`, "--restart=unless-stopped",
      `-p ${catalog.defaultPort}:${catalog.defaultPort}`,
      ...(catalog.volumes ?? []).map((v) => `-v ${v}`),
      ...(catalog.envVars  ?? []).map((e) => `-e ${e}`),
      `${catalog.dockerImage}:latest`,
    ];
    await execAsync(`docker pull ${catalog.dockerImage}:latest`, { timeout: 180_000 });
    await execAsync(parts.join(" "), { timeout: 30_000 });

    const entry = {
      id, installedAt: new Date().toISOString(), installedTag: "latest",
      containerName: catalog.containerName!, port: catalog.defaultPort!,
      installMethod: "docker" as const,
    };
    writeInstalled([...installed, entry]);
    return NextResponse.json({ ok: true, app: entry });
  } catch (err) {
    return NextResponse.json({ ok: false, message: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
