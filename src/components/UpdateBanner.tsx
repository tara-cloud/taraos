"use client";

import { useEffect, useState } from "react";
import type { UpdateInfo } from "@/app/api/update/route";

const DISMISS_KEY = "taraos-update-dismissed";

export default function UpdateBanner() {
  const [info, setInfo]       = useState<UpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [updating, setUpdating]   = useState(false);
  const [status, setStatus]       = useState("");

  useEffect(() => {
    // Don't show if dismissed this session
    const v = sessionStorage.getItem(DISMISS_KEY);
    if (v) setDismissed(true);

    checkUpdate();
    // Re-check every 6 hours
    const id = setInterval(checkUpdate, 6 * 60 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  async function checkUpdate() {
    try {
      const res = await fetch("/api/update");
      const data: UpdateInfo = await res.json();
      setInfo(data);
    } catch { /* silent */ }
  }

  async function triggerUpdate() {
    if (!info) return;
    setUpdating(true);
    setStatus("Sending upgrade command…");

    try {
      const res = await fetch("/api/update", { method: "POST" });
      const data = await res.json() as { ok: boolean; message: string };

      if (!data.ok) {
        setStatus(`Failed: ${data.message}`);
        setUpdating(false);
        return;
      }

      setStatus("Upgrade initiated — waiting for pod to restart…");

      // Poll until new version is live
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        try {
          const r = await fetch("/api/update");
          const d: UpdateInfo = await r.json();
          if (!d.hasUpdate) {
            clearInterval(poll);
            setStatus("Update complete! Reloading…");
            setTimeout(() => globalThis.location.reload(), 1500);
          } else if (attempts > 24) {
            // 2 min timeout
            clearInterval(poll);
            setStatus("Timed out — check Pi manually. Reloading…");
            setTimeout(() => globalThis.location.reload(), 2000);
          }
        } catch { /* pod restarting — normal */ }
      }, 5000);
    } catch {
      setStatus("Network error — check Pi.");
      setUpdating(false);
    }
  }

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  if (!info?.hasUpdate || dismissed) return null;

  return (
    <div style={{
      margin: "12px 16px 0",
      padding: "14px 18px",
      background: "rgba(0,113,227,0.12)",
      border: "1px solid rgba(0,113,227,0.35)",
      borderRadius: 16,
      display: "flex",
      alignItems: "center",
      gap: 12,
      flexWrap: "wrap",
    }}>
      {/* Icon + message */}
      <span style={{ fontSize: 20 }}>🆕</span>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.90)", fontWeight: 500 }}>
          TaraOS v{info.latest} is available
          <span style={{ fontWeight: 400, color: "rgba(255,255,255,0.50)", marginLeft: 8 }}>
            (you&apos;re on v{info.current})
          </span>
        </div>
        {updating && (
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 3 }}>{status}</div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
        {info.releaseUrl && (
          <a
            href={info.releaseUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 13, color: "rgba(255,255,255,0.60)",
              textDecoration: "none", padding: "5px 12px",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 8,
            }}
          >
            Release Notes
          </a>
        )}
        <button
          type="button"
          onClick={triggerUpdate}
          disabled={updating}
          style={{
            fontSize: 13, fontWeight: 600, padding: "6px 16px",
            background: updating ? "rgba(0,113,227,0.15)" : "rgba(0,113,227,0.35)",
            border: "1px solid rgba(0,113,227,0.60)",
            borderRadius: 8, color: "rgba(255,255,255,0.90)", cursor: updating ? "default" : "pointer",
            display: "flex", alignItems: "center", gap: 6,
            transition: "background 0.15s",
          }}
        >
          {updating ? (
            <>
              <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>
              Updating…
            </>
          ) : "Update Now"}
        </button>
        {!updating && (
          <button
            type="button"
            onClick={dismiss}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "rgba(255,255,255,0.35)", fontSize: 18, lineHeight: 1, padding: "4px",
            }}
            aria-label="Dismiss"
          >
            ×
          </button>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
