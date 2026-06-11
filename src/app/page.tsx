"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const ClockWidget       = dynamic(() => import("@/components/widgets/ClockWidget"),       { ssr: false });
const WeatherWidget     = dynamic(() => import("@/components/widgets/WeatherWidget"),     { ssr: false });
const AppLauncherWidget = dynamic(() => import("@/components/widgets/AppLauncherWidget"), { ssr: false });

function readBg() {
  const type  = localStorage.getItem("taraos-bg-type")  ?? "Gradient";
  const theme = localStorage.getItem("taraos-theme")    ?? "bg-nebula";
  const image = localStorage.getItem("taraos-bg-image") ?? "";
  return { type, theme, image };
}

export default function Dashboard() {
  const [bgType,  setBgType]  = useState("Gradient");
  const [theme,   setTheme]   = useState("bg-nebula");
  const [bgImage, setBgImage] = useState("");

  useEffect(() => {
    const { type, theme: t, image } = readBg();
    setBgType(type); setTheme(t); setBgImage(image);

    function onStorage(e: StorageEvent) {
      if (e.key === "taraos-theme") {
        const { type: ty, theme: th, image: im } = readBg();
        setBgType(ty); setTheme(th); setBgImage(im);
      }
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

      {/* Top bar */}
      <div
        className="glass-bar"
        style={{ position: "sticky", top: 0, zIndex: 100, height: 52 }}
      />

      {/* Widget grid */}
      <div className="dashboard-grid" style={{ paddingTop: 20, paddingBottom: 8 }}>

        {/* Row 1 — Clock+Events (8 cols) | Weather (4 cols) */}
        <div className="widget-6x2" style={{ minHeight: 380 }}>
          <ClockWidget />
        </div>
        <div style={{ gridColumn: "span 4", gridRow: "span 2", minHeight: 380 }}>
          <WeatherWidget />
        </div>

      </div>

      {/* App launcher — bare icons, no panel */}
      <div style={{ padding: "8px 24px 40px" }}>
        <AppLauncherWidget />
      </div>

    </div>
  );
}
