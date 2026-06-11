"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { type WeatherLocation, loadLocations, saveLocations } from "@/lib/locations";

// ── Data ─────────────────────────────────────────────────────────────────────

const THEMES = [
  { key: "bg-nebula",   label: "Nebula",   colors: ["#0f0c29", "#302b63", "#24243e"] },
  { key: "bg-aurora",   label: "Aurora",   colors: ["#0d1b2a", "#1a3a4a", "#0d2b1e"] },
  { key: "bg-ocean",    label: "Ocean",    colors: ["#0a1628", "#1a2a4a", "#0d1f3c"] },
  { key: "bg-midnight", label: "Midnight", colors: ["#0f0f23", "#1a1a3e", "#0f0f23"] },
];

const BG_TYPES = ["Gradient", "Solid", "Image"];

// ── Sidebar ───────────────────────────────────────────────────────────────────

type PageKey = "display.theme" | "display.background" | "clock.format" | "location.locations";

const SIDEBAR = [
  {
    key: "display",
    label: "Display",
    items: [
      { key: "display.theme"      as PageKey, label: "Theme" },
      { key: "display.background" as PageKey, label: "Background" },
    ],
  },
  {
    key: "clock",
    label: "Clock",
    items: [
      { key: "clock.format" as PageKey, label: "Clock & Font" },
    ],
  },
  {
    key: "location",
    label: "Location",
    items: [
      { key: "location.locations" as PageKey, label: "Locations" },
    ],
  },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function Row({ children, last }: Readonly<{ children: React.ReactNode; last?: boolean }>) {
  return (
    <div style={{ padding: "13px 16px", borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.06)" }}>
      {children}
    </div>
  );
}

function Card({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="glass-widget" style={{ padding: 0, overflow: "hidden" }}>{children}</div>;
}

function SectionTitle({ children, mt }: Readonly<{ children: React.ReactNode; mt?: number }>) {
  return (
    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, marginTop: mt ?? 4 }}>
      {children}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const [active, setActive]     = useState<PageKey>("display.theme");
  const [theme, setTheme]       = useState("bg-nebula");
  const [bgType, setBgType]     = useState("Gradient");
  const [bgImage, setBgImage]   = useState("");
  const [saved, setSaved]       = useState(false);

  // Clock settings
  const [clockFormat, setClockFormat]   = useState<"12" | "24">("24");
  const [clockFont, setClockFont]       = useState("system");
  const [clockFontSize, setClockFontSize] = useState(60);
  const [dateFormat, setDateFormat]     = useState("full");

  // Locations state
  const [locations, setLocations] = useState<WeatherLocation[]>([]);
  const [newLabel, setNewLabel]   = useState("");
  const [newLat, setNewLat]       = useState("");
  const [newLon, setNewLon]       = useState("");
  const [addError, setAddError]   = useState("");

  useEffect(() => {
    setTheme(localStorage.getItem("taraos-theme") ?? "bg-nebula");
    setBgType(localStorage.getItem("taraos-bg-type") ?? "Gradient");
    setBgImage(localStorage.getItem("taraos-bg-image") ?? "");
    setClockFormat((localStorage.getItem("taraos-clock-format") ?? "24") as "12" | "24");
    setClockFont(localStorage.getItem("taraos-clock-font") ?? "system");
    setClockFontSize(Number(localStorage.getItem("taraos-clock-size") ?? 60));
    setDateFormat(localStorage.getItem("taraos-date-format") ?? "full");
    setLocations(loadLocations());
  }, []);

  function saveClock() {
    localStorage.setItem("taraos-clock-format", clockFormat);
    localStorage.setItem("taraos-clock-font", clockFont);
    localStorage.setItem("taraos-clock-size", String(clockFontSize));
    localStorage.setItem("taraos-date-format", dateFormat);
    globalThis.dispatchEvent(new StorageEvent("storage", { key: "taraos-clock-format" }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function saveDisplay() {
    localStorage.setItem("taraos-theme", theme);
    localStorage.setItem("taraos-bg-type", bgType);
    localStorage.setItem("taraos-bg-image", bgImage);
    globalThis.dispatchEvent(new StorageEvent("storage", { key: "taraos-theme", newValue: theme }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function addLocation() {
    const lat = Number.parseFloat(newLat);
    const lon = Number.parseFloat(newLon);
    if (!newLabel.trim()) { setAddError("Name is required"); return; }
    if (Number.isNaN(lat) || lat < -90 || lat > 90) { setAddError("Invalid latitude (−90 to 90)"); return; }
    if (Number.isNaN(lon) || lon < -180 || lon > 180) { setAddError("Invalid longitude (−180 to 180)"); return; }
    const next = [...locations, { id: `custom-${Date.now()}`, label: newLabel.trim(), lat, lon }];
    setLocations(next);
    saveLocations(next);
    setNewLabel(""); setNewLat(""); setNewLon(""); setAddError("");
  }

  function removeLocation(id: string) {
    const next = locations.filter((l) => l.id !== id);
    setLocations(next);
    saveLocations(next);
    // Reset active if it was the removed one
    const activeId = localStorage.getItem("taraos-active-location");
    if (activeId === id) localStorage.removeItem("taraos-active-location");
  }

  // ── Detail pane ───────────────────────────────────────────────────────────

  function renderDetail() {
    switch (active) {

      case "display.theme":
        return (
          <>
            <SectionTitle>Theme</SectionTitle>
            <Card>
              {THEMES.map((t, i) => (
                <Row key={t.key} last={i === THEMES.length - 1}>
                  <button type="button" onClick={() => setTheme(t.key)} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, padding: 0 }}>
                    <div style={{ display: "flex", gap: 3 }}>
                      {t.colors.map((c, ci) => (
                        <div key={`${t.key}-${ci}`} style={{ width: 10, height: 10, borderRadius: "50%", background: c, border: "1px solid rgba(255,255,255,0.2)" }} />
                      ))}
                    </div>
                    <span style={{ flex: 1, fontSize: 14, color: "rgba(255,255,255,0.82)", textAlign: "left" }}>{t.label}</span>
                    {theme === t.key && <span style={{ color: "#0071e3", fontSize: 16 }}>✓</span>}
                  </button>
                </Row>
              ))}
            </Card>
          </>
        );

      case "display.background":
        return (
          <>
            <SectionTitle>Background Type</SectionTitle>
            <Card>
              {BG_TYPES.map((b, i) => (
                <Row key={b} last={i === BG_TYPES.length - 1}>
                  <button type="button" onClick={() => setBgType(b)} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, padding: 0 }}>
                    <span style={{ flex: 1, fontSize: 14, color: "rgba(255,255,255,0.82)", textAlign: "left" }}>{b}</span>
                    {bgType === b && <span style={{ color: "#0071e3", fontSize: 16 }}>✓</span>}
                  </button>
                </Row>
              ))}
            </Card>
            {bgType === "Image" && (
              <>
                <SectionTitle mt={20}>Image URL</SectionTitle>
                <Card>
                  <Row last>
                    <input value={bgImage} onChange={(e) => setBgImage(e.target.value)} placeholder="https://…" style={{ width: "100%", background: "none", border: "none", outline: "none", fontSize: 14, color: "rgba(255,255,255,0.80)" }} />
                  </Row>
                </Card>
              </>
            )}
          </>
        );

      case "location.locations":
        return (
          <>
            <SectionTitle>Saved Locations</SectionTitle>
            <Card>
              {locations.map((loc, i) => (
                <Row key={loc.id} last={i === locations.length - 1}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, color: "rgba(255,255,255,0.85)" }}>{loc.label}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2, fontFamily: "monospace" }}>{loc.lat}, {loc.lon}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLocation(loc.id)}
                      style={{ background: "rgba(255,59,48,0.15)", border: "1px solid rgba(255,59,48,0.30)", borderRadius: 8, color: "#ff3b30", fontSize: 12, padding: "4px 10px", cursor: "pointer" }}
                    >
                      Remove
                    </button>
                  </div>
                </Row>
              ))}
              {locations.length === 0 && (
                <Row last><span style={{ fontSize: 13, color: "rgba(255,255,255,0.30)" }}>No locations added</span></Row>
              )}
            </Card>

            <SectionTitle mt={24}>Add New Location</SectionTitle>
            <Card>
              <Row>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", marginBottom: 4 }}>Name</div>
                <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="e.g. Home, Office…" style={{ width: "100%", background: "none", border: "none", outline: "none", fontSize: 14, color: "rgba(255,255,255,0.85)" }} />
              </Row>
              <Row>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", marginBottom: 4 }}>Latitude</div>
                <input value={newLat} onChange={(e) => setNewLat(e.target.value)} placeholder="e.g. 10.8505" style={{ width: "100%", background: "none", border: "none", outline: "none", fontSize: 14, color: "rgba(255,255,255,0.85)" }} />
              </Row>
              <Row last>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", marginBottom: 4 }}>Longitude</div>
                <input value={newLon} onChange={(e) => setNewLon(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addLocation()} placeholder="e.g. 76.2711" style={{ width: "100%", background: "none", border: "none", outline: "none", fontSize: 14, color: "rgba(255,255,255,0.85)" }} />
              </Row>
            </Card>
            {addError && <div style={{ fontSize: 12, color: "#ff3b30", marginTop: 8 }}>{addError}</div>}
            <button
              type="button"
              onClick={addLocation}
              style={{ marginTop: 12, width: "100%", background: "rgba(0,113,227,0.20)", border: "1px solid rgba(0,113,227,0.40)", borderRadius: 12, padding: "11px", cursor: "pointer", color: "rgba(255,255,255,0.85)", fontSize: 14, fontWeight: 500 }}
            >
              + Add Location
            </button>
          </>
        );

      case "clock.format": {
        const FONTS = [
          { key: "system",   label: "System",   sample: "-apple-system, sans-serif" },
          { key: "mono",     label: "Monospace", sample: "ui-monospace, monospace" },
          { key: "serif",    label: "Serif",     sample: "Georgia, serif" },
          { key: "rounded",  label: "Rounded",   sample: "'Trebuchet MS', sans-serif" },
        ];
        const fontFamily = FONTS.find((f) => f.key === clockFont)?.sample ?? "sans-serif";
        return (
          <>
            {/* Live preview */}
            <SectionTitle>Preview</SectionTitle>
            <Card>
              <Row last>
                <div style={{ textAlign: "center", padding: "12px 0" }}>
                  <div style={{
                    fontSize: clockFontSize,
                    fontWeight: 200,
                    fontFamily,
                    color: "rgba(255,255,255,0.92)",
                    lineHeight: 1,
                    letterSpacing: "-2px",
                  }}>
                    {clockFormat === "12"
                      ? new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
                      : `${String(new Date().getHours()).padStart(2,"0")}:${String(new Date().getMinutes()).padStart(2,"0")}`}
                  </div>
                </div>
              </Row>
            </Card>

            <SectionTitle mt={20}>Time Format</SectionTitle>
            <Card>
              {(["24", "12"] as const).map((f, i) => (
                <Row key={f} last={i === 1}>
                  <button type="button" onClick={() => setClockFormat(f)} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, padding: 0 }}>
                    <span style={{ flex: 1, fontSize: 14, color: "rgba(255,255,255,0.82)", textAlign: "left" }}>{f === "24" ? "24-hour (14:30)" : "12-hour (2:30 PM)"}</span>
                    {clockFormat === f && <span style={{ color: "#0071e3", fontSize: 16 }}>✓</span>}
                  </button>
                </Row>
              ))}
            </Card>

            <SectionTitle mt={20}>Font</SectionTitle>
            <Card>
              {FONTS.map((f, i) => (
                <Row key={f.key} last={i === FONTS.length - 1}>
                  <button type="button" onClick={() => setClockFont(f.key)} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, padding: 0 }}>
                    <span style={{ flex: 1, fontSize: 14, color: "rgba(255,255,255,0.82)", textAlign: "left", fontFamily: f.sample }}>{f.label}</span>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: f.sample, marginRight: 8 }}>12:00</span>
                    {clockFont === f.key && <span style={{ color: "#0071e3", fontSize: 16 }}>✓</span>}
                  </button>
                </Row>
              ))}
            </Card>

            <SectionTitle mt={20}>Font Size</SectionTitle>
            <Card>
              <Row last>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <input
                    type="range" min={32} max={96} step={4}
                    value={clockFontSize}
                    onChange={(e) => setClockFontSize(Number(e.target.value))}
                    style={{ flex: 1, accentColor: "#0071e3" }}
                  />
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.70)", width: 36, textAlign: "right" }}>{clockFontSize}px</span>
                </div>
              </Row>
            </Card>

            <SectionTitle mt={20}>Date Format</SectionTitle>
            <Card>
              {([
                { key: "full",     label: "Full",         sample: "Wed, June 11 2026" },
                { key: "no-year",  label: "No year",      sample: "Wed, June 11" },
                { key: "short",    label: "Short",        sample: "Jun 11" },
                { key: "numeric",  label: "Numeric",      sample: "06/11/2026" },
                { key: "iso",      label: "ISO",          sample: "2026-06-11" },
                { key: "day-only", label: "Day only",     sample: "Wednesday" },
              ] as const).map((f, i, arr) => (
                <Row key={f.key} last={i === arr.length - 1}>
                  <button type="button" onClick={() => setDateFormat(f.key)} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, padding: 0 }}>
                    <span style={{ flex: 1, fontSize: 14, color: "rgba(255,255,255,0.82)", textAlign: "left" }}>{f.label}</span>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", marginRight: 8 }}>{f.sample}</span>
                    {dateFormat === f.key && <span style={{ color: "#0071e3", fontSize: 16 }}>✓</span>}
                  </button>
                </Row>
              ))}
            </Card>
          </>
        );
      }
    }
  }

  const isLocationPage = active === "location.locations";

  return (
    <div className="bg-nebula" style={{ minHeight: "100vh" }}>

      {/* Top bar */}
      <div className="glass-bar" style={{
        position: "sticky", top: 0, zIndex: 100,
        height: "calc(52px + env(safe-area-inset-top))",
        display: "flex", alignItems: "flex-end",
        padding: "0 24px 10px",
        paddingLeft: "max(24px, env(safe-area-inset-left))",
        paddingRight: "max(24px, env(safe-area-inset-right))",
        gap: 12,
      }}>
        <button type="button" onClick={() => router.push("/")} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "5px 14px", color: "rgba(255,255,255,0.75)", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          ← Back
        </button>
        <span style={{ fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>Settings</span>
      </div>

      {/* Two-column layout */}
      <div style={{ display: "flex", maxWidth: 900, margin: "0 auto", padding: "24px 16px 48px", gap: 16, alignItems: "flex-start" }}>

        {/* Sidebar */}
        <div style={{ width: 220, flexShrink: 0, display: "flex", flexDirection: "column", gap: 16 }}>
          {SIDEBAR.map((section) => (
            <div key={section.key}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 8px", marginBottom: 6 }}>
                {section.label}
              </div>
              <div className="glass-widget" style={{ padding: 0, overflow: "hidden" }}>
                {section.items.map((item, i) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActive(item.key)}
                    style={{
                      width: "100%",
                      background: active === item.key ? "rgba(0,113,227,0.18)" : "transparent",
                      border: "none",
                      borderBottom: i < section.items.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                      padding: "12px 16px", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      transition: "background 0.12s",
                    }}
                  >
                    <span style={{ fontSize: 14, color: active === item.key ? "#fff" : "rgba(255,255,255,0.72)" }}>{item.label}</span>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>›</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Detail pane */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {renderDetail()}
          {!isLocationPage && (
            <button
              type="button"
              onClick={active === "clock.format" ? saveClock : saveDisplay}
              style={{
                marginTop: 24, width: "100%",
                background: saved ? "rgba(52,199,89,0.20)" : "rgba(0,113,227,0.25)",
                border: `1px solid ${saved ? "rgba(52,199,89,0.45)" : "rgba(0,113,227,0.45)"}`,
                borderRadius: 14, padding: "13px", cursor: "pointer",
                color: saved ? "#34c759" : "rgba(255,255,255,0.88)",
                fontSize: 14, fontWeight: 600, transition: "all 0.2s",
              }}
            >
              {saved ? "✓ Saved" : "Save Settings"}
            </button>
          )}
        </div>

      </div>

      <style>{`input::placeholder { color: rgba(255,255,255,0.22); }`}</style>
    </div>
  );
}
