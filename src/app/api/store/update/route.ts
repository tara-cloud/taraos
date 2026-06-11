import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { getCatalogApp } from "@/lib/catalog";
import { readInstalled, writeInstalled } from "@/lib/installedApps";

const execAsync = promisify(exec);

function buildDockerRunCmd(app: NonNullable<ReturnType<typeof getCatalogApp>>): string {
  const parts = [
    "docker", "run", "-d",
    `--name ${app.containerName}`,
    "--restart=unless-stopped",
    `-p ${app.defaultPort}:${app.defaultPort}`,
  ];
  for (const v of app.volumes ?? []) parts.push(`-v ${v}`);
  for (const e of app.envVars ?? []) parts.push(`-e ${e}`);
  parts.push(`${app.dockerImage}:latest`);
  return parts.join(" ");
}

export async function POST(req: NextRequest) {
  const { id } = await req.json() as { id: string };
  const catalog = getCatalogApp(id);
  if (!catalog) return NextResponse.json({ ok: false, message: "App not found" }, { status: 404 });

  const installed = readInstalled();
  const entry = installed.find((a) => a.id === id);
  if (!entry) return NextResponse.json({ ok: false, message: "Not installed" }, { status: 404 });

  try {
    await execAsync(`docker pull ${catalog.dockerImage}:latest`, { timeout: 180_000 });
    // Stop and remove old container
    await execAsync(`docker stop ${catalog.containerName}`, { timeout: 30_000 }).catch(() => {});
    await execAsync(`docker rm ${catalog.containerName}`, { timeout: 10_000 }).catch(() => {});
    // Re-run with fresh image
    await execAsync(buildDockerRunCmd(catalog), { timeout: 30_000 });

    const updated = installed.map((a) =>
      a.id === id ? { ...a, installedTag: "latest" } : a
    );
    writeInstalled(updated);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, message: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
