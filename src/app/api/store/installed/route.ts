import { NextResponse } from "next/server";
import { getCatalogApp } from "@/lib/catalog";
import { readInstalled } from "@/lib/installedApps";
import { execAsync, k8sAuth, helmAuthFlags } from "@/lib/helm";
import type { InstalledAppStatus } from "@/lib/installedApps";

// 30-min Docker Hub tag cache
const hubCache = new Map<string, { tag: string; ts: number }>();
const CACHE_TTL = 30 * 60 * 1000;

async function getLatestDockerTag(dockerImage: string): Promise<string> {
  if (dockerImage.startsWith("ghcr.io/")) return "latest";
  const cached = hubCache.get(dockerImage);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.tag;
  try {
    const parts = dockerImage.split("/");
    const repo = parts.length >= 2 ? parts.join("/") : `library/${dockerImage}`;
    const res = await fetch(`https://hub.docker.com/v2/repositories/${repo}/tags?page_size=10&ordering=last_updated`, { cache: "no-store" });
    if (!res.ok) return "latest";
    const data = await res.json() as { results: { name: string }[] };
    const tag = data.results?.find((t) => t.name !== "latest")?.name ?? "latest";
    hubCache.set(dockerImage, { tag, ts: Date.now() });
    return tag;
  } catch { return "latest"; }
}

async function helmAppStatus(release: string, namespace: string, auth: ReturnType<typeof k8sAuth>): Promise<{ running: boolean; appVersion: string }> {
  try {
    const af = helmAuthFlags(auth);
    const { stdout } = await execAsync(
      `helm status ${release} ${af} --namespace ${namespace} --output json`,
      { timeout: 10_000 }
    );
    const data = JSON.parse(stdout) as { info?: { status?: string }; chart?: { metadata?: { appVersion?: string } } };
    return {
      running: data.info?.status === "deployed",
      appVersion: data.chart?.metadata?.appVersion ?? "latest",
    };
  } catch { return { running: false, appVersion: "latest" }; }
}

async function dockerAppStatus(containerName: string): Promise<{ running: boolean; imageTag: string }> {
  try {
    const { stdout } = await execAsync(`docker inspect ${containerName} --format '{{.State.Running}}|{{.Config.Image}}'`, { timeout: 5_000 });
    const [runStr, image] = stdout.trim().split("|");
    return { running: runStr === "true", imageTag: image?.split(":").pop() ?? "latest" };
  } catch { return { running: false, imageTag: "latest" }; }
}

export async function GET() {
  const installed = readInstalled();
  if (!installed.length) return NextResponse.json([]);

  const auth = k8sAuth();

  const results: InstalledAppStatus[] = await Promise.all(
    installed.map(async (app) => {
      const catalog = getCatalogApp(app.id);

      if (app.installMethod === "helm" && app.helmRelease && app.helmNamespace) {
        const { running, appVersion } = await helmAppStatus(app.helmRelease, app.helmNamespace, auth);
        const dockerImage = catalog?.dockerImage ?? "";
        const latestTag = dockerImage ? await getLatestDockerTag(dockerImage) : "latest";
        return { ...app, running, currentImageTag: appVersion, latestTag, hasUpdate: latestTag !== "latest" && appVersion !== latestTag };
      }

      // Docker
      const { running, imageTag } = await dockerAppStatus(app.containerName);
      const dockerImage = catalog?.dockerImage ?? "";
      const latestTag = dockerImage ? await getLatestDockerTag(dockerImage) : "latest";
      return { ...app, running, currentImageTag: imageTag, latestTag, hasUpdate: latestTag !== "latest" && imageTag !== latestTag };
    })
  );

  return NextResponse.json(results);
}
