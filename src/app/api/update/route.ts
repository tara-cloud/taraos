import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";

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
export async function GET(req: Request) {
  const now = Date.now();
  const { searchParams } = new URL(req.url);
  const bust = searchParams.get("bust") === "1";

  if (!bust && cache && now - cache.ts < CACHE_TTL) {
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

// ── POST — trigger upgrade via k8s API (no helm CLI needed) ──────────────────
export async function POST() {
  const checkRes = await GET(new Request("http://localhost/api/update?bust=1"));
  const info = await checkRes.json() as UpdateInfo;

  if (!info.hasUpdate) {
    return NextResponse.json({ ok: false, message: "Already up to date" });
  }

  let token = "";
  try { token = readFileSync("/var/run/secrets/kubernetes.io/serviceaccount/token", "utf8").trim(); } catch { /* not in cluster */ }

  const k8sHost = process.env.KUBERNETES_SERVICE_HOST ?? "kubernetes.default.svc";
  const k8sPort = process.env.KUBERNETES_SERVICE_PORT_HTTPS ?? "443";
  const apiserver = `https://${k8sHost}:${k8sPort}`;

  if (!token) {
    return NextResponse.json({ ok: false, message: "No in-cluster service account token — cannot update from outside k8s" }, { status: 500 });
  }

  try {
    // Patch the deployment image tag via k8s API (strategic merge patch)
    const patchUrl = `${apiserver}/apis/apps/v1/namespaces/taraos/deployments/taraos`;
    const patch = {
      spec: {
        template: {
          spec: {
            containers: [{ name: "taraos", image: `pmananthu/taraos:${info.latest}` }],
          },
        },
      },
    };

    const res = await fetch(patchUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/strategic-merge-patch+json",
        Accept: "application/json",
      },
      body: JSON.stringify(patch),
    });

    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json({ ok: false, message: `k8s API error: ${res.status} ${body}` }, { status: 500 });
    }

    cache = null; // bust cache
    return NextResponse.json({ ok: true, message: `Upgrading to v${info.latest}` });
  } catch (err) {
    return NextResponse.json({ ok: false, message: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
