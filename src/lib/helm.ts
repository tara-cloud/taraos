import { readFileSync } from "node:fs";
import { join } from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";

export const execAsync = promisify(exec);

// ── k8s auth from in-cluster service account ─────────────────────────────────
export function k8sAuth() {
  const host  = process.env.KUBERNETES_SERVICE_HOST ?? "kubernetes.default.svc";
  const port  = process.env.KUBERNETES_SERVICE_PORT_HTTPS ?? "443";
  let token = "";
  try { token = readFileSync("/var/run/secrets/kubernetes.io/serviceaccount/token", "utf8").trim(); } catch { /* dev */ }
  return { apiserver: `https://${host}:${port}`, caFile: "/var/run/secrets/kubernetes.io/serviceaccount/ca.crt", token };
}

// ── Shared helm flags ─────────────────────────────────────────────────────────
export function helmAuthFlags(auth: ReturnType<typeof k8sAuth>): string {
  if (!auth.token) return ""; // dev — no in-cluster token, use default kubeconfig
  return [
    `--kube-apiserver ${auth.apiserver}`,
    `--kube-ca-file ${auth.caFile}`,
    `--kube-token ${auth.token}`,
  ].join(" ");
}

// ── Chart path resolution ─────────────────────────────────────────────────────
const CHARTS_DIR = process.env.HELM_APPS_DIR ?? "/home/pi/helm-charts/apps";

export function resolveChart(chartRef: string): string {
  return chartRef.startsWith("./")
    ? join(CHARTS_DIR, chartRef.slice(2))
    : chartRef;
}

// ── Build --set flags from values object ─────────────────────────────────────
export function buildSetFlags(values: Record<string, unknown>, prefix = ""): string {
  return Object.entries(values).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v))
      return buildSetFlags(v as Record<string, unknown>, key).split(" ").filter(Boolean);
    return [`--set ${key}=${String(v)}`];
  }).join(" ");
}
