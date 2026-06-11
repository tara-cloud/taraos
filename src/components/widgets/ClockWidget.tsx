"use client";

import { useEffect, useState } from "react";
import { loadSettings, getCachedSettings } from "@/lib/settings";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

interface Event {
  id: number;
  title: string;
  time: string;
  color: string;
}

type EventMap = Record<string, Event[]>;

const SAMPLE_EVENTS: EventMap = {
  // seeded with today ± a few days so it looks alive on first load
};

function dateKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function buildCalendar(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const cells: { day: number; type: "prev" | "cur" | "next" }[] = [];
  for (let i = firstDay - 1; i >= 0; i--)
    cells.push({ day: daysInPrev - i, type: "prev" });
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ day: d, type: "cur" });
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++)
    cells.push({ day: d, type: "next" });
  return cells;
}

const EVENT_COLORS = ["#0071e3", "#34c759", "#ff9500", "#ff3b30", "#af52de", "#5ac8fa"];

export default function ClockWidget() {
  const [now, setNow] = useState(new Date());
  const [selected, setSelected] = useState(new Date());
  const [clockFormat, setClockFormat]     = useState<"12"|"24">("24");
  const [clockFont, setClockFont]         = useState("system");
  const [clockFontSize, setClockFontSize] = useState(60);
  const [dateFormat, setDateFormat]       = useState("full");
  const [events, setEvents] = useState<EventMap>(() => {
    if (globalThis.window === undefined) return SAMPLE_EVENTS;
    try {
      return JSON.parse(localStorage.getItem("taraos-events") ?? "null") ?? SAMPLE_EVENTS;
    } catch { return SAMPLE_EVENTS; }
  });
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("09:00");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    async function loadClockSettings() {
      const cached = getCachedSettings();
      if (cached) {
        setClockFormat(cached.clockFormat);
        setClockFont(cached.clockFont);
        setClockFontSize(cached.clockSize);
        setDateFormat(cached.dateFormat);
      }
      const s = await loadSettings();
      if (!s) return;
      setClockFormat(s.clockFormat);
      setClockFont(s.clockFont);
      setClockFontSize(s.clockSize);
      setDateFormat(s.dateFormat);
    }
    loadClockSettings();
    function onStorage() { loadClockSettings(); }
    globalThis.addEventListener("storage", onStorage);
    return () => globalThis.removeEventListener("storage", onStorage);
  }, []);

  function saveEvents(next: EventMap) {
    setEvents(next);
    localStorage.setItem("taraos-events", JSON.stringify(next));
  }

  function addEvent() {
    if (!newTitle.trim()) return;
    const key = dateKey(selected);
    const existing = events[key] ?? [];
    const color = EVENT_COLORS[existing.length % EVENT_COLORS.length];
    saveEvents({
      ...events,
      [key]: [...existing, { id: Date.now(), title: newTitle.trim(), time: newTime, color }],
    });
    setNewTitle("");
    setAdding(false);
  }

  function deleteEvent(key: string, id: number) {
    const next = { ...events, [key]: (events[key] ?? []).filter((e) => e.id !== id) };
    if (!next[key].length) delete next[key];
    saveEvents(next);
  }

  const FONT_MAP: Record<string, string> = {
    system:  "-apple-system, BlinkMacSystemFont, sans-serif",
    mono:    "ui-monospace, monospace",
    serif:   "Georgia, serif",
    rounded: "'Trebuchet MS', sans-serif",
  };
  const fontFamily = FONT_MAP[clockFont] ?? FONT_MAP.system;

  const hours12 = now.getHours() % 12 || 12;
  const ampm    = now.getHours() >= 12 ? "PM" : "AM";
  const h = clockFormat === "12" ? String(hours12).padStart(2, "0") : String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  const dateStr = (() => {
    const day  = DAYS[now.getDay()];
    const mon  = MONTHS[now.getMonth()];
    const monS = mon.slice(0, 3);
    const d    = now.getDate();
    const y    = now.getFullYear();
    switch (dateFormat) {
      case "short":    return `${monS} ${d}`;
      case "numeric":  return `${String(now.getMonth() + 1).padStart(2,"0")}/${String(d).padStart(2,"0")}/${y}`;
      case "iso":      return `${y}-${String(now.getMonth()+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      case "day-only": return day;
      case "no-year":  return `${day}, ${mon} ${d}`;
      default:         return `${day}, ${mon} ${d} ${y}`; // full
    }
  })();

  const cells = buildCalendar(now.getFullYear(), now.getMonth());
  const today = now.getDate();
  const selKey = dateKey(selected);
  const selEvents = events[selKey] ?? [];

  const selLabel = selected.toDateString() === now.toDateString()
    ? "Today"
    : `${DAYS[selected.getDay()]}, ${MONTHS[selected.getMonth()]} ${selected.getDate()}`;

  // mark days that have events
  const eventDays = new Set(
    Object.keys(events).map((k) => {
      const [y, mo, d] = k.split("-").map(Number);
      return new Date(y, mo, d);
    }).filter((d) => d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth())
      .map((d) => d.getDate())
  );

  return (
    <div className="glass-widget" style={{ padding: "24px", height: "100%", display: "flex", flexDirection: "column", gap: "18px" }}>
      {/* Time */}
      <div>
        <div style={{ fontSize: clockFontSize, fontWeight: 200, fontFamily, letterSpacing: "-2px", lineHeight: 1, color: "rgba(255,255,255,0.95)", display: "flex", alignItems: "baseline", gap: 4 }}>
          <span>{h}<span style={{ opacity: 0.5, animation: "blink 1s step-end infinite" }}>:</span>{m}</span>
          <span style={{ fontSize: clockFontSize * 0.43, fontWeight: 300, color: "rgba(255,255,255,0.50)" }}>{s}</span>
          {clockFormat === "12" && (
            <span style={{ fontSize: clockFontSize * 0.3, fontWeight: 400, color: "rgba(255,255,255,0.45)", letterSpacing: "0.02em" }}>{ampm}</span>
          )}
        </div>
        <div style={{ marginTop: 6, fontSize: 13, color: "rgba(255,255,255,0.50)" }}>{dateStr}</div>
      </div>

      <div style={{ height: 1, background: "rgba(255,255,255,0.08)" }} />

      {/* Calendar + Event panel side by side */}
      <div style={{ display: "flex", gap: 20, flex: 1, minHeight: 0 }}>

        {/* Calendar */}
        <div style={{ flex: "0 0 auto", minWidth: 230 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.40)", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {MONTHS[now.getMonth()]} {now.getFullYear()}
          </div>
          <div className="mini-cal" style={{ marginBottom: 4 }}>
            {DAYS.map((d) => (
              <div key={d} style={{ textAlign: "center", fontSize: 9, color: "rgba(255,255,255,0.30)", fontWeight: 600, padding: "2px 0" }}>
                {d[0]}
              </div>
            ))}
          </div>
          <div className="mini-cal">
            {cells.map((cell, i) => {
              const isToday = cell.type === "cur" && cell.day === today;
              const isSel = cell.type === "cur" && cell.day === selected.getDate()
                && selected.getMonth() === now.getMonth()
                && selected.getFullYear() === now.getFullYear()
                && !isToday;
              const hasEvent = cell.type === "cur" && eventDays.has(cell.day);
              const key = `${now.getFullYear()}-${now.getMonth()}-${i}`;

              if (cell.type !== "cur") {
                return (
                  <div key={key} className="cal-day other-month">{cell.day}</div>
                );
              }

              function select() { setSelected(new Date(now.getFullYear(), now.getMonth(), cell.day)); }

              return (
                <button
                  key={key}
                  type="button"
                  className={`cal-day ${isToday ? "today" : ""}`}
                  style={{
                    background: isSel ? "rgba(255,255,255,0.15)" : "transparent",
                    outline: isSel ? "1px solid rgba(255,255,255,0.30)" : "none",
                    position: "relative", border: "none", cursor: "pointer", padding: 0,
                  }}
                  onClick={select}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") select(); }}
                >
                  {cell.day}
                  {hasEvent && !isToday && (
                    <span style={{
                      position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)",
                      width: 3, height: 3, borderRadius: "50%", background: "#0071e3",
                    }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Vertical divider */}
        <div style={{ width: 1, background: "rgba(255,255,255,0.08)", flexShrink: 0 }} />

        {/* Events panel */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Events</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", fontWeight: 500, marginTop: 2 }}>{selLabel}</div>
            </div>
            <button
              onClick={() => setAdding((v) => !v)}
              style={{
                background: adding ? "rgba(255,59,48,0.20)" : "rgba(0,113,227,0.25)",
                border: `1px solid ${adding ? "rgba(255,59,48,0.40)" : "rgba(0,113,227,0.40)"}`,
                borderRadius: 8, color: "rgba(255,255,255,0.80)", fontSize: 18,
                width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                lineHeight: 1,
              }}
            >
              {adding ? "×" : "+"}
            </button>
          </div>

          {/* Add event form */}
          {adding && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addEvent()}
                placeholder="Event title…"
                style={{
                  background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 8, padding: "5px 10px", color: "rgba(255,255,255,0.88)",
                  fontSize: 12, outline: "none", width: "100%",
                }}
              />
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  style={{
                    background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 8, padding: "5px 8px", color: "rgba(255,255,255,0.80)",
                    fontSize: 12, outline: "none", flex: 1, colorScheme: "dark",
                  }}
                />
                <button
                  onClick={addEvent}
                  style={{
                    background: "rgba(0,113,227,0.35)", border: "1px solid rgba(0,113,227,0.50)",
                    borderRadius: 8, color: "rgba(255,255,255,0.90)", fontSize: 12,
                    padding: "5px 12px", cursor: "pointer",
                  }}
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Event list */}
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
            {selEvents.length === 0 && (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.28)", paddingTop: 4 }}>No events</div>
            )}
            {[...selEvents].sort((a, b) => a.time.localeCompare(b.time)).map((ev) => (
              <div
                key={ev.id}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderLeft: `3px solid ${ev.color}`,
                  borderRadius: 8, padding: "6px 10px",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {ev.title}
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.38)", marginTop: 1 }}>{ev.time}</div>
                </div>
                <button
                  onClick={() => deleteEvent(selKey, ev.id)}
                  style={{ background: "none", border: "none", color: "rgba(255,255,255,0.25)", cursor: "pointer", fontSize: 14, padding: 0, lineHeight: 1 }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blink { 0%, 100% { opacity: 0.5; } 50% { opacity: 0.15; } }
        input::placeholder { color: rgba(255,255,255,0.30); }
      `}</style>
    </div>
  );
}
