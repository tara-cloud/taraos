import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { readInstalled } from "@/lib/installedApps";
import { getCatalogApp } from "@/lib/catalog";
import type { InstalledAppStatus } from "@/lib/installedApps";

const execAsync = promisify(exec);

// 30-min in-memory cache for Docker Hub latest tag per image
const hubCache = new Map<string, { tag: string; ts: number }>();
const CACHE_TTL = 30 * 60 * 1000;

async function getLatestTag(dockerImage: string): Promise<string> {
  // Skip GHCR images — can't easily check without auth
  if (dockerImage.startsWith("ghcr.io/")) return "latest";

  const cached = hubCache.get(dockerImage);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.tag;

  try {
    // Parse namespace/repo from image string
    const parts = dockerImage.split("/");
    const repo = parts.length >= 2 ? `${parts[0]}/${parts.slice(1).join("/")}` : `library/${dockerImage}`;
    const res = await fetch(
      `https://hub.docker.com/v2/repositories/${repo}/tags?page_size=10&ordering=last_updated`,
      { cache: "no-store" }
    );
    if (!res.ok) return "latest";
    const data = await res.json() as { results: { name: string }[] };
    // Return first non-latest tag, or "latest" as fallback
    const tag = data.results?.find((t) => t.name !== "latest")?.name ?? "latest";
    hubCache.set(dockerImage, { tag, ts: Date.now() });
    return tag;
  } catch {
    return "latest";
  }
}

async function getCurrentImageTag(containerName: string): Promise<string> {
  try {
    const { stdout } = await execAsync(
      `docker inspect ${containerName} --format '{{.Config.Image}}'`,
      { timeout: 5000 }
    );
    return stdout.trim();
  } catch {
    return "";
  }
}

async function isRunning(containerName: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync(
      `docker inspect ${containerName} --format '{{.State.Running}}'`,
      { timeout: 5000 }
    );
    return stdout.trim() === "true";
  } catch {
    return false;
  }
}

export async function GET() {
  const installed = readInstalled();
  if (!installed.length) return NextResponse.json([]);

  const results: InstalledAppStatus[] = await Promise.all(
    installed.map(async (app) => {
      const catalog = getCatalogApp(app.id);
      const dockerImage = catalog?.dockerImage ?? "";

      const [running, currentImageTag, latestTag] = await Promise.all([
        isRunning(app.containerName),
        getCurrentImageTag(app.containerName),
        getLatestTag(dockerImage),
      ]);

      // Normalize tags for comparison (strip repo prefix from inspect output)
      const normalizedCurrent = currentImageTag.split(":").pop() ?? app.installedTag;
      const hasUpdate = latestTag !== "latest" && normalizedCurrent !== latestTag;

      return {
        ...app,
        running,
        currentImageTag: normalizedCurrent,
        latestTag,
        hasUpdate,
      };
    })
  );

  return NextResponse.json(results);
}
