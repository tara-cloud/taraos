"use client";

import { useEffect, useState } from "react";

interface NetIface {
  name: string;
  ipv4: string;
  ipv6: string;
  mac: string;
  rxBytes: number;
  txBytes: number;
  rxSpeed: number;
  txSpeed: number;
  up: boolean;
}

interface NetworkData {
  hostname: string;
  ifaces: NetIface[];
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${(b / 1024 ** 3).toFixed(2)} GB`;
}

function ifaceIcon(name: string) {
  if (name.startsWith("eth") || name.startsWith("en")) return "🔌";
  if (name.startsWith("wl")) return "📶";
  if (name.startsWith("tail")) return "🔐";
  return "🌐";
}

export default function NetworkWidget() {
  const [data, setData] = useState<NetworkData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchNet();
    const id = setInterval(fetchNet, 3000);
    return () => clearInterval(id);
  }, []);

  async function fetchNet() {
    try {
      const res = await fetch("/api/network");
      if (!res.ok) throw new Error("network fetch failed");
      setData(await res.json());
      setError(false);
    } catch { setError(true); }
  }

  return (
    <div className="glass-widget" style={{ padding: "20px", height: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Network</span>
        {data && (
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontFamily: "monospace" }}>{data.hostname}</span>
        )}
      </div>

      {error && <div style={{ fontSize: 12, color: "rgba(255,80,60,0.8)" }}>Unable to read network info</div>}
      {!data && !error && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.30)" }}>Loading…</div>}

      {data && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {data.ifaces.map((iface) => (
            <div
              key={iface.name}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 12,
                padding: "12px 14px",
              }}
            >
              {/* Interface name + status */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 18 }}>{ifaceIcon(iface.name)}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>{iface.name}</span>
                <span style={{
                  marginLeft: "auto", fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
                  background: iface.up ? "rgba(52,199,89,0.15)" : "rgba(255,59,48,0.15)",
                  color: iface.up ? "#34c759" : "#ff3b30",
                  border: `1px solid ${iface.up ? "rgba(52,199,89,0.30)" : "rgba(255,59,48,0.30)"}`,
                }}>
                  {iface.up ? "UP" : "DOWN"}
                </span>
              </div>

              {/* IP / MAC details */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px" }}>
                {iface.ipv4 && (
                  <div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.30)", textTransform: "uppercase", letterSpacing: "0.06em" }}>IPv4</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", fontFamily: "monospace", marginTop: 1 }}>{iface.ipv4}</div>
                  </div>
                )}
                {iface.mac && (
                  <div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.30)", textTransform: "uppercase", letterSpacing: "0.06em" }}>MAC</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", fontFamily: "monospace", marginTop: 1 }}>{iface.mac}</div>
                  </div>
                )}
                {iface.ipv6 && (
                  <div style={{ gridColumn: "span 2" }}>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.30)", textTransform: "uppercase", letterSpacing: "0.06em" }}>IPv6</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", fontFamily: "monospace", marginTop: 1, wordBreak: "break-all" }}>{iface.ipv6}</div>
                  </div>
                )}
              </div>

              {/* Traffic */}
              <div style={{ display: "flex", gap: 12, marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.30)", textTransform: "uppercase", letterSpacing: "0.06em" }}>↓ Download</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}>
                    <span style={{ fontSize: 14, color: "#34c759", fontWeight: 500 }}>{iface.rxSpeed} <span style={{ fontSize: 10 }}>KB/s</span></span>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.28)" }}>{formatBytes(iface.rxBytes)} total</span>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.30)", textTransform: "uppercase", letterSpacing: "0.06em" }}>↑ Upload</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}>
                    <span style={{ fontSize: 14, color: "#0071e3", fontWeight: 500 }}>{iface.txSpeed} <span style={{ fontSize: 10 }}>KB/s</span></span>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.28)" }}>{formatBytes(iface.txBytes)} total</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
