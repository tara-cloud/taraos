"use client";

import { useState } from "react";

interface AppIconProps {
  icon: string;       // fallback emoji
  iconUrl?: string;   // official URL
  customIcon?: string; // user override (URL or emoji)
  size?: number;
  borderRadius?: number;
  color?: string;
}

export default function AppIcon({ icon, iconUrl, customIcon, size = 52, borderRadius = 14, color = "#495057" }: Readonly<AppIconProps>) {
  const [imgFailed, setImgFailed] = useState(false);

  const displayUrl = customIcon && (customIcon.startsWith("http") || customIcon.startsWith("/"))
    ? customIcon
    : iconUrl;

  const displayEmoji = customIcon && !customIcon.startsWith("http") && !customIcon.startsWith("/")
    ? customIcon
    : icon;

  const containerStyle = {
    width: size, height: size, borderRadius,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: `${color}22`, border: `1px solid ${color}40`,
    overflow: "hidden", flexShrink: 0,
  };

  if (displayUrl && !imgFailed) {
    return (
      <div style={containerStyle}>
        <img
          src={displayUrl}
          alt=""
          onError={() => setImgFailed(true)}
          style={{ width: size * 0.65, height: size * 0.65, objectFit: "contain" }}
        />
      </div>
    );
  }

  return (
    <div style={{ ...containerStyle, fontSize: size * 0.52 }}>
      {displayEmoji}
    </div>
  );
}
