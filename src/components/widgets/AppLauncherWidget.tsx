"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface AppEntry {
  name: string;
  icon: string;
  url: string;
  color: string;
  internal?: boolean;
}

const APPS: AppEntry[] = [
  { name: "Settings", icon: "⚙️", url: "/settings", color: "#636e72", internal: true },
];

export default function AppLauncherWidget() {
  const [statuses, setStatuses] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [focusIdx, setFocusIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchStatuses();
    const id = setInterval(fetchStatuses, 15000);
    return () => clearInterval(id);
  }, []);

  // Global keyboard shortcut: Cmd+K or /
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); openSearch(); }
      if (e.key === "Escape" && searchOpen) closeSearch();
    }
    globalThis.addEventListener("keydown", onKey);
    return () => globalThis.removeEventListener("keydown", onKey);
  }, [searchOpen]);

  function openSearch() {
    setSearchOpen(true);
    setQuery("");
    setFocusIdx(0);
    setTimeout(() => inputRef.current?.focus(), 40);
  }

  function closeSearch() {
    setSearchOpen(false);
    setQuery("");
  }

  async function fetchStatuses() {
    try {
      const res = await fetch("/api/apps");
      if (!res.ok) return;
      const data: { name: string; running: boolean }[] = await res.json();
      const map: Record<string, boolean> = {};
      for (const d of data) map[d.name] = d.running;
      setStatuses(map);
    } catch { /* ignore */ }
  }

  const filtered = APPS.filter((a) =>
    a.name.toLowerCase().includes(query.toLowerCase())
  );

  function handleSearchKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setFocusIdx((i) => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setFocusIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && filtered[focusIdx]) {
      globalThis.open(filtered[focusIdx].url, "_blank");
      closeSearch();
    }
  }

  return (
    <>
      {/* Search overlay */}
      {searchOpen && (
        <button
          type="button"
          ref={overlayRef as React.Ref<HTMLButtonElement>}
          aria-label="Close search"
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(12px)",
            display: "flex", alignItems: "flex-start", justifyContent: "center",
            paddingTop: "15vh",
            border: "none", cursor: "default",
          }}
          onClick={(e) => { if (e.target === overlayRef.current) closeSearch(); }}
        >
          <div style={{
            width: "min(560px, 90vw)",
            background: "rgba(20,20,35,0.88)",
            border: "1px solid rgba(255,255,255,0.14)",
            borderRadius: 18,
            boxShadow: "0 32px 80px rgba(0,0,0,0.60)",
            overflow: "hidden",
          }}>
            {/* Search input */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <span style={{ fontSize: 18, opacity: 0.5 }}>🔍</span>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setFocusIdx(0); }}
                onKeyDown={handleSearchKey}
                placeholder="Search apps…"
                style={{
                  flex: 1, background: "none", border: "none", outline: "none",
                  fontSize: 16, color: "rgba(255,255,255,0.90)",
                }}
              />
              <kbd style={{
                fontSize: 11, color: "rgba(255,255,255,0.30)",
                background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 6, padding: "2px 7px",
              }}>esc</kbd>
            </div>

            {/* Results */}
            <div style={{ maxHeight: 360, overflowY: "auto", padding: "8px 0" }}>
              {filtered.length === 0 && (
                <div style={{ padding: "16px 18px", fontSize: 13, color: "rgba(255,255,255,0.35)" }}>No apps found</div>
              )}
              {filtered.map((app, i) => {
                const isUp = statuses[app.name];
                const hasStatus = app.name in statuses;
                const linkProps = app.internal
                  ? { href: app.url }
                  : { href: app.url, target: "_blank" as const, rel: "noopener noreferrer" };
                return (
                  <Link
                    key={app.name}
                    {...linkProps}
                    onClick={closeSearch}
                    style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "10px 18px", textDecoration: "none",
                      background: i === focusIdx ? "rgba(255,255,255,0.08)" : "transparent",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={() => setFocusIdx(i)}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 22, background: `${app.color}22`, border: `1px solid ${app.color}33`,
                    }}>
                      {app.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, color: "rgba(255,255,255,0.88)", fontWeight: 500 }}>{app.name}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>{app.url}</div>
                    </div>
                    {hasStatus && (
                      <span className={`status-dot ${isUp ? "up" : "down"}`} />
                    )}
                    {i === focusIdx && (
                      <kbd style={{
                        fontSize: 10, color: "rgba(255,255,255,0.30)",
                        background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 5, padding: "2px 7px",
                      }}>↵</kbd>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </button>
      )}

      {/* Bare app dock — no panel */}
      <div style={{ padding: "0 4px" }}>
        {/* Search trigger hint */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <button
            type="button"
            onClick={openSearch}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 12, padding: "7px 18px", cursor: "pointer",
              color: "rgba(255,255,255,0.38)", fontSize: 13,
              transition: "all 0.15s",
            }}
          >
            <span>🔍</span>
            <span>Search apps</span>
            <kbd style={{
              fontSize: 11, color: "rgba(255,255,255,0.25)",
              background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 5, padding: "1px 6px", marginLeft: 4,
            }}>⌘K</kbd>
          </button>
        </div>

        {/* App icons */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, justifyContent: "center" }}>
          {APPS.map((app) => {
            const isUp = statuses[app.name];
            const hasStatus = app.name in statuses;
            const linkProps = app.internal
              ? { href: app.url }
              : { href: app.url, target: "_blank" as const, rel: "noopener noreferrer" };
            return (
              <Link
                key={app.name}
                {...linkProps}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  gap: 8, width: 72, textDecoration: "none", cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  const icon = e.currentTarget.querySelector<HTMLDivElement>(".app-icon-inner");
                  if (icon) { icon.style.transform = "translateY(-4px) scale(1.08)"; icon.style.boxShadow = `0 8px 24px ${app.color}44`; }
                }}
                onMouseLeave={(e) => {
                  const icon = e.currentTarget.querySelector<HTMLDivElement>(".app-icon-inner");
                  if (icon) { icon.style.transform = ""; icon.style.boxShadow = ""; }
                }}
              >
                <div style={{ position: "relative" }}>
                  <div
                    className="app-icon-inner"
                    style={{
                      width: 56, height: 56, borderRadius: 16, fontSize: 28,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: `${app.color}25`, border: `1px solid ${app.color}40`,
                      transition: "transform 0.15s, box-shadow 0.15s",
                    }}
                  >
                    {app.icon}
                  </div>
                  {hasStatus && (
                    <span className={`status-dot ${isUp ? "up" : "down"}`} style={{ position: "absolute", top: -2, right: -2 }} />
                  )}
                </div>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.60)", textAlign: "center", lineHeight: 1.3 }}>
                  {app.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <style>{`
        input::placeholder { color: rgba(255,255,255,0.28); }
      `}</style>
    </>
  );
}
