import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { readFileSync } from "fs";
import { join } from "path";

const execAsync = promisify(exec);

// ── In-memory cache (30 min) ─────────────────────────────────────────────────
let cache: { data: UpdateInfo; ts: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000;

export interface UpdateInfo {
  current: string;
  latest: string;
  hasUpdate: boolean;
  releaseUrl: string;
  changelog: string;
}

function currentVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as { version: string };
    return pkg.version;
  } catch {
    return process.env.npm_package_version ?? "0.0.0";
  }
}

function isNewer(latest: string, current: string): boolean {
  const parse = (v: string) => v.replace(/^v/, "").split(".").map(Number);
  const [la, lb, lc] = parse(latest);
  const [ca, cb, cc] = parse(current);
  if (la !== ca) return la > ca;
  if (lb !== cb) return lb > cb;
  return lc > cc;
}

// ── GET — check for update ────────────────────────────────────────────────────
export async function GET() {
  const now = Date.now();
  if (cache && now - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  const current = currentVersion();

  try {
    const res = await fetch(
      "https://api.github.com/repos/tara-cloud/taraos/releases/latest",
      { headers: { Accept: "application/vnd.github+json" }, cache: "no-store" }
    );

    if (!res.ok) throw new Error(`GitHub API ${res.status}`);

    const gh = await res.json() as { tag_name: string; html_url: string; body: string };
    const latest = gh.tag_name.replace(/^v/, "");

    const data: UpdateInfo = {
      current,
      latest,
      hasUpdate: isNewer(latest, current),
      releaseUrl: gh.html_url,
      changelog: gh.body ?? "",
    };

    cache = { data, ts: now };
    return NextResponse.json(data);
  } catch {
    // Return current-only info on network failure
    return NextResponse.json({
      current,
      latest: current,
      hasUpdate: false,
      releaseUrl: "",
      changelog: "",
    });
  }
}

// ── POST — trigger helm upgrade ───────────────────────────────────────────────
export async function POST() {
  const helmPath   = process.env.HELM_PATH   ?? "/usr/local/bin/helm";
  const kubeconfig = process.env.KUBECONFIG  ?? "/etc/rancher/k3s/k3s.yaml";
  const chartPath  = process.env.HELM_CHART  ?? "/home/pi/helm-charts/taraos";

  // Get latest version first
  const checkRes = await GET();
  const info = await checkRes.json() as UpdateInfo;

  if (!info.hasUpdate) {
    return NextResponse.json({ ok: false, message: "Already up to date" });
  }

  const cmd = [
    helmPath, "upgrade", "taraos", chartPath,
    "--kubeconfig", kubeconfig,
    "--namespace", "taraos",
    "--set", `image.tag=${info.latest}`,
  ].join(" ");

  try {
    await execAsync(cmd, { timeout: 120_000 });
    // Invalidate cache so next GET reflects new version
    cache = null;
    return NextResponse.json({ ok: true, message: `Upgrading to v${info.latest}` });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
