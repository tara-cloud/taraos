"use client";

import { useEffect, useState } from "react";

interface DiskEntry {
  device: string;
  mount: string;
  total: string;
  used: string;
  free: string;
  percent: number;
  label: string;
}

function diskIcon(mount: string) {
  if (mount === "/") return "💾";
  if (mount.includes("DATA") || mount.includes("data")) return "🗄️";
  if (mount.includes("boot")) return "🔧";
  return "📀";
}

function barColor(pct: number) {
  if (pct > 85) return "#ff3b30";
  if (pct > 65) return "#ff9500";
  return "#0071e3";
}

export default function DiskWidget() {
  const [disks, setDisks] = useState<DiskEntry[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchDisks();
    const id = setInterval(fetchDisks, 30000);
    return () => clearInterval(id);
  }, []);

  async function fetchDisks() {
    try {
      const res = await fetch("/api/disks");
      if (!res.ok) throw new Error("disk fetch failed");
      setDisks(await res.json());
      setError(false);
    } catch { setError(true); }
  }

  return (
    <div className="glass-widget" style={{ padding: "20px", height: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Storage
      </div>

      {error && <div style={{ fontSize: 12, color: "rgba(255,80,60,0.8)" }}>Unable to read disk info</div>}
      {!disks.length && !error && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.30)" }}>Loading…</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {disks.map((d) => (
          <div key={d.mount}>
            {/* Row: icon + label + percent */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 20 }}>{diskIcon(d.mount)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {d.label}
                  </span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.50)", flexShrink: 0, marginLeft: 8 }}>
                    {d.percent}%
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>
                  {d.used} used of {d.total} &nbsp;·&nbsp; {d.free} free
                </div>
              </div>
            </div>
            {/* Progress bar */}
            <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 3,
                width: `${d.percent}%`,
                background: barColor(d.percent),
                transition: "width 0.6s ease",
              }} />
            </div>
            {/* Mount path */}
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", marginTop: 4 }}>{d.device} → {d.mount}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
