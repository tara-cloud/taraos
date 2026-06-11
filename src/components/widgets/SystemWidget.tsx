"use client";

import { useEffect, useState } from "react";

interface SystemStats {
  cpu: number;
  ram: { used: string; total: string; percent: number };
  disk: { used: string; total: string; percent: number };
  temp: number;
  uptime: string;
}

const SIZE = 72;
const STROKE = 6;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

function Ring({ percent, color, label, value }: Readonly<{ percent: number; color: string; label: string; value: string }>) {
  const offset = CIRC * (1 - percent / 100);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{ position: "relative", width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} style={{ transform: "rotate(-90deg)" }}>
          {/* Track */}
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={STROKE} />
          {/* Fill */}
          <circle
            cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none"
            stroke={color} strokeWidth={STROKE}
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center",
          justifyContent: "center", flexDirection: "column",
        }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.90)", lineHeight: 1 }}>
            {percent}%
          </span>
        </div>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", marginTop: 1 }}>{value}</div>
      </div>
    </div>
  );
}

function ringColor(pct: number) {
  if (pct > 85) return "#ff3b30";
  if (pct > 65) return "#ff9500";
  return "#34c759";
}

export default function SystemWidget() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchStats();
    const id = setInterval(fetchStats, 5000);
    return () => clearInterval(id);
  }, []);

  async function fetchStats() {
    try {
      const res = await fetch("/api/system");
      if (!res.ok) throw new Error("system stats fetch failed");
      setStats(await res.json());
      setError(false);
    } catch {
      setError(true);
    }
  }

  function tempColor() {
    if (!stats) return "#34c759";
    if (stats.temp > 75) return "#ff3b30";
    if (stats.temp > 60) return "#ff9500";
    return "#34c759";
  }

  return (
    <div className="glass-widget" style={{ padding: "20px", height: "100%", display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.08em" }}>System</span>
        {stats && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.30)" }}>up {stats.uptime}</span>}
      </div>

      {error && <div style={{ fontSize: 12, color: "rgba(255,80,60,0.8)" }}>Unable to read stats</div>}
      {!stats && !error && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.30)" }}>Loading…</div>}

      {stats && (
        <>
          {/* Rings row */}
          <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center" }}>
            <Ring percent={stats.cpu}       color={ringColor(stats.cpu)}       label="CPU"  value={`${stats.cpu}%`} />
            <Ring percent={stats.ram.percent} color={ringColor(stats.ram.percent)} label="RAM"  value={`${stats.ram.used}G`} />
            <Ring percent={stats.disk.percent} color={ringColor(stats.disk.percent)} label="Disk" value={stats.disk.used} />
          </div>

          <div style={{ height: 1, background: "rgba(255,255,255,0.07)" }} />

          {/* Temperature row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>🌡️</span>
            <div>
              <span style={{ fontSize: 28, fontWeight: 200, color: tempColor(), lineHeight: 1 }}>{stats.temp}°C</span>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>CPU Temp</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
