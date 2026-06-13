import { NextResponse } from "next/server";
import { getCatalogApp } from "@/lib/catalog";
import { readInstalled } from "@/lib/installedApps";
import { k8sAuth } from "@/lib/helm";
import type { InstalledAppStatus } from "@/lib/installedApps";
import http from "node:http";
import https from "node:https";

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
  return new Promise((resolve) => {
    if (!auth.token) { resolve({ running: false, appVersion: "latest" }); return; }
    const url = new URL(`${auth.apiserver}/apis/apps/v1/namespaces/${namespace}/deployments/${release}`);
    const opts = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: "GET",
      headers: { Authorization: `Bearer ${auth.token}`, Accept: "application/json" },
      rejectUnauthorized: false,
    };
    const req = https.request(opts, (res) => {
      let body = "";
      res.on("data", (chunk: Buffer) => { body += chunk.toString(); });
      res.on("end", () => {
        try {
          const data = JSON.parse(body) as { status?: { readyReplicas?: number }; spec?: { template?: { spec?: { containers?: { image?: string }[] } } } };
          const running = (data.status?.readyReplicas ?? 0) > 0;
          const image = data.spec?.template?.spec?.containers?.[0]?.image ?? "";
          resolve({ running, appVersion: image.split(":").pop() ?? "latest" });
        } catch { resolve({ running: false, appVersion: "latest" }); }
      });
    });
    req.on("error", () => resolve({ running: false, appVersion: "latest" }));
    req.setTimeout(8000, () => { req.destroy(); resolve({ running: false, appVersion: "latest" }); });
    req.end();
  });
}

async function dockerAppStatus(containerName: string): Promise<{ running: boolean; imageTag: string }> {
  return new Promise((resolve) => {
    const opts = {
      socketPath: "/var/run/docker.sock",
      path: `/v1.41/containers/${containerName}/json`,
      method: "GET",
    };
    const req = http.request(opts, (res) => {
      let body = "";
      res.on("data", (chunk: Buffer) => { body += chunk.toString(); });
      res.on("end", () => {
        try {
          const d = JSON.parse(body) as { State?: { Running?: boolean }; Config?: { Image?: string } };
          const running = d.State?.Running ?? false;
          const image = d.Config?.Image ?? "";
          resolve({ running, imageTag: image.split(":").pop() ?? "latest" });
        } catch { resolve({ running: false, imageTag: "latest" }); }
      });
    });
    req.on("error", () => resolve({ running: false, imageTag: "latest" }));
    req.setTimeout(5000, () => { req.destroy(); resolve({ running: false, imageTag: "latest" }); });
    req.end();
  });
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
