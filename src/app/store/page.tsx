"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CATALOG, type CatalogApp } from "@/lib/catalog";
import { getCachedSettings, loadSettings } from "@/lib/settings";
import type { InstalledAppStatus } from "@/lib/installedApps";

type CatalogEntry = CatalogApp & { installed: boolean };
type ActionState = "installing" | "updating" | "uninstalling";

const CATEGORY_LABELS: Record<string, string> = {
  media: "Media",
  productivity: "Productivity",
  utilities: "Utilities",
  monitoring: "Monitoring",
  storage: "Storage",
};

const CATEGORY_COLORS: Record<string, string> = {
  media:        "rgba(156,54,181,0.25)",
  productivity: "rgba(0,113,227,0.25)",
  utilities:    "rgba(247,103,7,0.25)",
  monitoring:   "rgba(47,158,68,0.25)",
  storage:      "rgba(230,73,128,0.25)",
};

export default function StorePage() {
  const router = useRouter();
  const [theme, setTheme]                   = useState("bg-nebula");
  const [tab, setTab]                       = useState<"catalog" | "updates">("catalog");
  const [catalog, setCatalog]               = useState<CatalogEntry[]>([]);
  const [installed, setInstalled]           = useState<InstalledAppStatus[]>([]);
  const [actions, setActions]               = useState<Record<string, ActionState>>({});
  const [messages, setMessages]             = useState<Record<string, string>>({});
  const [loading, setLoading]               = useState(true);
  const [search, setSearch]                 = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  useEffect(() => {
    const cached = getCachedSettings();
    if (cached) setTheme(cached.theme);
    loadSettings().then((s) => { if (s) setTheme(s.theme); });

    loadAll();
    const id = setInterval(loadInstalled, 15000);
    return () => clearInterval(id);
  }, []);

  async function loadAll() {
    setLoading(true);
    await Promise.all([loadCatalog(), loadInstalled()]);
    setLoading(false);
  }

  async function loadCatalog() {
    try {
      const res = await fetch("/api/store/catalog");
      const data = await res.json() as { apps: CatalogEntry[] };
      setCatalog(data.apps);
    } catch { /* silent */ }
  }

  async function loadInstalled() {
    try {
      const res = await fetch("/api/store/installed");
      const data: InstalledAppStatus[] = await res.json();
      setInstalled(data);
      // Sync installed flags in catalog
      const ids = new Set(data.map((a) => a.id));
      setCatalog((prev) => prev.map((a) => ({ ...a, installed: ids.has(a.id) })));
    } catch { /* silent */ }
  }

  function setAction(id: string, state: ActionState | null) {
    setActions((prev) => {
      const next = { ...prev };
      if (state === null) delete next[id];
      else next[id] = state;
      return next;
    });
  }

  function setMessage(id: string, msg: string) {
    setMessages((prev) => ({ ...prev, [id]: msg }));
    setTimeout(() => setMessages((prev) => { const n = { ...prev }; delete n[id]; return n; }), 4000);
  }

  async function install(id: string) {
    setAction(id, "installing");
    try {
      const res = await fetch("/api/store/install", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const data = await res.json() as { ok: boolean; message?: string };
      if (data.ok) { setMessage(id, "Installed successfully!"); await loadAll(); }
      else setMessage(id, data.message ?? "Install failed");
    } catch { setMessage(id, "Network error"); }
    finally { setAction(id, null); }
  }

  async function update(id: string) {
    setAction(id, "updating");
    try {
      const res = await fetch("/api/store/update", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const data = await res.json() as { ok: boolean; message?: string };
      if (data.ok) { setMessage(id, "Updated successfully!"); await loadInstalled(); }
      else setMessage(id, data.message ?? "Update failed");
    } catch { setMessage(id, "Network error"); }
    finally { setAction(id, null); }
  }

  async function uninstall(id: string) {
    setAction(id, "uninstalling");
    try {
      const res = await fetch("/api/store/uninstall", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const data = await res.json() as { ok: boolean; message?: string };
      if (data.ok) { setMessage(id, "Uninstalled"); await loadAll(); }
      else setMessage(id, data.message ?? "Uninstall failed");
    } catch { setMessage(id, "Network error"); }
    finally { setAction(id, null); }
  }

  const updatesAvailable = installed.filter((a) => a.hasUpdate);
  const displayApps = (tab === "updates"
    ? catalog.filter((a) => updatesAvailable.some((u) => u.id === a.id))
    : catalog
  ).filter((a) =>
    (activeCategory === "all" || a.category === activeCategory) &&
    (search === "" || a.name.toLowerCase().includes(search.toLowerCase()) || a.description.toLowerCase().includes(search.toLowerCase()))
  );

  function getInstalledStatus(id: string): InstalledAppStatus | undefined {
    return installed.find((a) => a.id === id);
  }

  function AppCard({ app }: Readonly<{ app: CatalogEntry }>) {
    const status = getInstalledStatus(app.id);
    const action = actions[app.id];
    const msg    = messages[app.id];
    const hasUpdate = status?.hasUpdate ?? false;
    const hostname = globalThis.window === undefined ? "pi" : globalThis.location.hostname;

    return (
      <div className="glass-widget" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, background: `${app.color}22`, border: `1px solid ${app.color}33`,
          }}>
            {app.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.90)" }}>{app.name}</span>
              {app.installed && status?.running && (
                <span className="status-dot up" />
              )}
              {app.installed && !status?.running && (
                <span className="status-dot down" />
              )}
              {hasUpdate && (
                <span style={{ fontSize: 10, background: "rgba(255,149,0,0.25)", color: "#ff9500", border: "1px solid rgba(255,149,0,0.45)", borderRadius: 6, padding: "1px 7px", fontWeight: 600 }}>
                  UPDATE
                </span>
              )}
            </div>
            <span style={{ fontSize: 11, background: CATEGORY_COLORS[app.category], color: "rgba(255,255,255,0.70)", borderRadius: 6, padding: "1px 7px", display: "inline-block", marginTop: 3 }}>
              {CATEGORY_LABELS[app.category]}
            </span>
          </div>
        </div>

        <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>{app.description}</p>

        {/* Version info */}
        {status && (
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "monospace" }}>
            {hasUpdate
              ? `${status.currentImageTag} → ${status.latestTag} available`
              : `v${status.currentImageTag}`}
          </div>
        )}

        {/* Message */}
        {msg && (
          <div style={{ fontSize: 12, color: msg.includes("fail") || msg.includes("error") || msg.includes("Error") ? "#ff3b30" : "#34c759" }}>
            {msg}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {app.manualInstall && !app.installed && (
            <a href="https://immich.app/docs/install/docker-compose" target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 12, color: "rgba(255,255,255,0.60)", padding: "6px 12px", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, textDecoration: "none" }}>
              View Install Guide ↗
            </a>
          )}

          {!app.installed && !app.manualInstall && (
            <button type="button" onClick={() => install(app.id)} disabled={!!action}
              style={{ fontSize: 13, fontWeight: 600, padding: "6px 16px", background: "rgba(0,113,227,0.30)", border: "1px solid rgba(0,113,227,0.55)", borderRadius: 8, color: "rgba(255,255,255,0.90)", cursor: action ? "default" : "pointer" }}>
              {action === "installing" ? "⟳ Installing…" : "Install"}
            </button>
          )}

          {app.installed && (
            <>
              <a href={`http://${hostname}:${app.defaultPort}`} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 13, fontWeight: 500, padding: "6px 14px", background: "rgba(52,199,89,0.20)", border: "1px solid rgba(52,199,89,0.40)", borderRadius: 8, color: "#34c759", textDecoration: "none" }}>
                Open
              </a>
              {hasUpdate && (
                <button type="button" onClick={() => update(app.id)} disabled={!!action}
                  style={{ fontSize: 13, fontWeight: 600, padding: "6px 14px", background: "rgba(255,149,0,0.25)", border: "1px solid rgba(255,149,0,0.50)", borderRadius: 8, color: "#ff9500", cursor: action ? "default" : "pointer" }}>
                  {action === "updating" ? "⟳ Updating…" : "Update"}
                </button>
              )}
              <button type="button" onClick={() => uninstall(app.id)} disabled={!!action}
                style={{ fontSize: 13, padding: "6px 14px", background: "rgba(255,59,48,0.15)", border: "1px solid rgba(255,59,48,0.30)", borderRadius: 8, color: "#ff3b30", cursor: action ? "default" : "pointer" }}>
                {action === "uninstalling" ? "⟳ Removing…" : "Uninstall"}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={theme} style={{ minHeight: "100vh" }}>

      {/* Top bar */}
      <div className="glass-bar" style={{
        position: "sticky", top: 0, zIndex: 100,
        height: "calc(52px + env(safe-area-inset-top))",
        display: "flex", alignItems: "flex-end",
        padding: "0 24px 10px",
        paddingLeft: "max(24px, env(safe-area-inset-left))",
        paddingRight: "max(24px, env(safe-area-inset-right))",
        gap: 12,
      }}>
        <button type="button" onClick={() => router.push("/")} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "5px 14px", color: "rgba(255,255,255,0.75)", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          🏠 Home
        </button>
        <span style={{ fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>App Store</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.40)" }}>
          {installed.length} installed
        </span>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, padding: "16px 24px 0" }}>
        {(["catalog", "updates"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} style={{
            padding: "7px 18px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500,
            background: tab === t ? "rgba(0,113,227,0.30)" : "rgba(255,255,255,0.07)",
            color: tab === t ? "#fff" : "rgba(255,255,255,0.55)",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            {t === "catalog" ? "🏪 Catalog" : "🔄 Updates"}
            {t === "updates" && updatesAvailable.length > 0 && (
              <span style={{ background: "#ff9500", color: "#000", borderRadius: 10, padding: "0 6px", fontSize: 11, fontWeight: 700 }}>
                {updatesAvailable.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search + Category filters */}
      {tab === "catalog" && (
        <div style={{ padding: "12px 24px 0", display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Search bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, padding: "8px 14px" }}>
            <span style={{ fontSize: 15, opacity: 0.45 }}>🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search apps…"
              style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 14, color: "rgba(255,255,255,0.85)" }}
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.35)", fontSize: 16, padding: 0, lineHeight: 1 }}>×</button>
            )}
          </div>
          {/* Category chips */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(["all", "media", "productivity", "utilities", "monitoring", "storage"] as const).map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button key={cat} type="button" onClick={() => setActiveCategory(cat)} style={{
                  padding: "5px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 500,
                  background: isActive ? "rgba(0,113,227,0.35)" : "rgba(255,255,255,0.07)",
                  color: isActive ? "#fff" : "rgba(255,255,255,0.55)",
                  transition: "all 0.12s",
                }}>
                  {cat === "all" ? "All" : CATEGORY_LABELS[cat]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* App grid */}
      <div style={{ padding: "16px 24px 48px" }}>
        {loading && (
          <div style={{ color: "rgba(255,255,255,0.38)", fontSize: 14, textAlign: "center", paddingTop: 40 }}>Loading…</div>
        )}
        {!loading && tab === "catalog" && displayApps.length === 0 && (
          <div style={{ color: "rgba(255,255,255,0.38)", fontSize: 14, textAlign: "center", paddingTop: 40 }}>
            No apps match your search
          </div>
        )}
        {!loading && tab === "updates" && updatesAvailable.length === 0 && (
          <div style={{ color: "rgba(255,255,255,0.38)", fontSize: 14, textAlign: "center", paddingTop: 40 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
            All installed apps are up to date
          </div>
        )}
        {!loading && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {displayApps.map((app) => (
              <AppCard key={app.id} app={app} />
            ))}
            {tab === "catalog" && CATALOG.filter((a) => !catalog.some((c) => c.id === a.id)).map((app) => (
              <AppCard key={app.id} app={{ ...app, installed: false }} />
            ))}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
