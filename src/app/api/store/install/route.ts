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
  if (catalog.manualInstall) return NextResponse.json({ ok: false, message: "This app requires manual installation. Visit the project homepage." }, { status: 400 });

  const installed = readInstalled();
  if (installed.find((a) => a.id === id)) {
    return NextResponse.json({ ok: false, message: "Already installed" }, { status: 409 });
  }

  try {
    await execAsync(`docker pull ${catalog.dockerImage}:latest`, { timeout: 180_000 });
    await execAsync(buildDockerRunCmd(catalog), { timeout: 30_000 });

    const entry = {
      id,
      installedAt: new Date().toISOString(),
      installedTag: "latest",
      containerName: catalog.containerName,
      port: catalog.defaultPort,
    };
    writeInstalled([...installed, entry]);
    return NextResponse.json({ ok: true, app: entry });
  } catch (err) {
    return NextResponse.json({ ok: false, message: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
