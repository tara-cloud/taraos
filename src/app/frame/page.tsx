"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function FrameContent() {
  const router     = useRouter();
  const params     = useSearchParams();
  const url        = params.get("url") ?? "";
  const title      = params.get("title") ?? url;

  if (!url) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "rgba(255,255,255,0.50)", fontSize: 14 }}>
        No URL provided.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>

      {/* Top bar */}
      <div className="glass-bar" style={{
        flexShrink: 0,
        height: "calc(48px + env(safe-area-inset-top))",
        display: "flex", alignItems: "flex-end",
        padding: "0 16px 8px",
        paddingLeft: "max(16px, env(safe-area-inset-left))",
        gap: 10, zIndex: 100,
      }}>
        <button
          type="button"
          onClick={() => router.back()}
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "5px 14px", color: "rgba(255,255,255,0.75)", fontSize: 13, cursor: "pointer", flexShrink: 0 }}
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={() => router.push("/")}
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "5px 14px", color: "rgba(255,255,255,0.75)", fontSize: 13, cursor: "pointer", flexShrink: 0 }}
        >
          🏠 Home
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.80)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {title}
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>
            {url}
          </div>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, padding: "5px 12px", color: "rgba(255,255,255,0.50)", fontSize: 12, textDecoration: "none", flexShrink: 0 }}
        >
          Open ↗
        </a>
      </div>

      {/* iFrame */}
      <iframe
        src={url}
        style={{ flex: 1, border: "none", width: "100%", background: "#fff" }}
        title={title}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
}

export default function FramePage() {
  return (
    <div className="bg-midnight" style={{ minHeight: "100vh" }}>
      <Suspense fallback={<div style={{ color: "rgba(255,255,255,0.40)", padding: 24 }}>Loading…</div>}>
        <FrameContent />
      </Suspense>
    </div>
  );
}
