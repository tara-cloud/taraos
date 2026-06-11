"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { loadSettings, getCachedSettings } from "@/lib/settings";

const ClockWidget       = dynamic(() => import("@/components/widgets/ClockWidget"),       { ssr: false });
const WeatherWidget     = dynamic(() => import("@/components/widgets/WeatherWidget"),     { ssr: false });
const AppLauncherWidget = dynamic(() => import("@/components/widgets/AppLauncherWidget"), { ssr: false });
const UpdateBanner      = dynamic(() => import("@/components/UpdateBanner"),              { ssr: false });

export default function Dashboard() {
  const [bgType,  setBgType]  = useState("Gradient");
  const [theme,   setTheme]   = useState("bg-nebula");
  const [bgImage, setBgImage] = useState("");

  useEffect(() => {
    // Apply cached settings instantly, then sync from server
    const cached = getCachedSettings();
    if (cached) { setBgType(cached.bgType); setTheme(cached.theme); setBgImage(cached.bgImage); }

    loadSettings().then((s) => {
      if (!s) return;
      setBgType(s.bgType); setTheme(s.theme); setBgImage(s.bgImage);
    });

    function onStorage() {
      loadSettings().then((s) => {
        if (!s) return;
        setBgType(s.bgType); setTheme(s.theme); setBgImage(s.bgImage);
      });
    }
    globalThis.addEventListener("storage", onStorage);
    return () => globalThis.removeEventListener("storage", onStorage);
  }, []);

  const backgroundStyle: React.CSSProperties =
    bgType === "Image" && bgImage
      ? { backgroundImage: `url(${bgImage})`, backgroundSize: "cover", backgroundPosition: "center" }
      : {};

  return (
    <div
      className={bgType === "Image" ? undefined : theme}
      style={{ minHeight: "100vh", ...backgroundStyle }}
    >
      <div className="glass-bar" style={{ position: "sticky", top: 0, zIndex: 100, height: 52 }} />

      <UpdateBanner />

      <div className="dashboard-grid" style={{ paddingTop: 20, paddingBottom: 8 }}>

        {/* Clock — full width on mobile, 8 cols on desktop */}
        <div className="widget-6x2" style={{ minHeight: 380 }}>
          <ClockWidget />
        </div>

        {/* Weather — full width on mobile, 4 cols on desktop beside clock */}
        <div className="weather-col" style={{ gridColumn: "span 4", gridRow: "span 2", minHeight: 220 }}>
          <WeatherWidget />
        </div>

      </div>

      <div style={{ padding: "8px 24px 40px" }}>
        <AppLauncherWidget />
      </div>
    </div>
  );
}
