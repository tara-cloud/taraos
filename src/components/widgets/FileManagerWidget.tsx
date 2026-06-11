"use client";

import { useEffect, useState } from "react";

interface FileEntry {
  name: string;
  isDir: boolean;
  size: string;
  modified: string;
}

const ROOT = "";

export default function FileManagerWidget() {
  const [path, setPath] = useState(ROOT);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => { load(path); }, [path]);

  async function load(p: string) {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(p)}`);
      if (!res.ok) throw new Error();
      setEntries(await res.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  function navigate(entry: FileEntry) {
    if (!entry.isDir) return;
    setPath(path ? `${path}/${entry.name}` : entry.name);
  }

  function goUp() {
    const parts = path.split("/");
    parts.pop();
    setPath(parts.join("/"));
  }

  const breadcrumbs = path ? path.split("/") : [];

  return (
    <div className="glass-widget" style={{ padding: "20px", height: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Files · /DATA/AppData
        </div>
      </div>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "rgba(255,255,255,0.50)", flexWrap: "wrap" }}>
        <span
          style={{ cursor: "pointer", color: "rgba(255,255,255,0.70)" }}
          onClick={() => setPath(ROOT)}
        >
          root
        </span>
        {breadcrumbs.map((b, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ opacity: 0.35 }}>/</span>
            <span
              style={{ cursor: "pointer", color: i === breadcrumbs.length - 1 ? "rgba(255,255,255,0.90)" : "rgba(255,255,255,0.60)" }}
              onClick={() => setPath(breadcrumbs.slice(0, i + 1).join("/"))}
            >
              {b}
            </span>
          </span>
        ))}
      </div>

      {/* File list */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {loading && <div style={{ color: "rgba(255,255,255,0.38)", fontSize: 13 }}>Loading…</div>}
        {error && <div style={{ color: "rgba(255,80,60,0.8)", fontSize: 13 }}>Failed to load directory</div>}
        {!loading && !error && (
          <>
            {path && (
              <div className="file-row" onClick={goUp}>
                <span style={{ fontSize: 16 }}>⬆️</span>
                <span style={{ color: "rgba(255,255,255,0.50)" }}>.. (up)</span>
              </div>
            )}
            {entries.length === 0 && (
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, padding: "8px 10px" }}>Empty directory</div>
            )}
            {entries.map((e) => (
              <div key={e.name} className="file-row" onClick={() => navigate(e)}>
                <span style={{ fontSize: 15 }}>{e.isDir ? "📁" : "📄"}</span>
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {e.name}
                </span>
                {!e.isDir && (
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", flexShrink: 0 }}>{e.size}</span>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
