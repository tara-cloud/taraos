"use client";

import { useEffect, useState } from "react";
import { type WeatherLocation, loadLocations } from "@/lib/locations";

interface WeatherData {
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  tempMin: number;
  tempMax: number;
}

const WMO_CODES: Record<number, { label: string; icon: string }> = {
  0:  { label: "Clear sky",     icon: "☀️" },
  1:  { label: "Mostly clear",  icon: "🌤️" },
  2:  { label: "Partly cloudy", icon: "⛅" },
  3:  { label: "Overcast",      icon: "☁️" },
  45: { label: "Foggy",         icon: "🌫️" },
  48: { label: "Icy fog",       icon: "🌫️" },
  51: { label: "Light drizzle", icon: "🌦️" },
  53: { label: "Drizzle",       icon: "🌦️" },
  55: { label: "Heavy drizzle", icon: "🌧️" },
  61: { label: "Light rain",    icon: "🌧️" },
  63: { label: "Rain",          icon: "🌧️" },
  65: { label: "Heavy rain",    icon: "🌧️" },
  71: { label: "Light snow",    icon: "🌨️" },
  73: { label: "Snow",          icon: "❄️" },
  75: { label: "Heavy snow",    icon: "❄️" },
  80: { label: "Rain showers",  icon: "🌦️" },
  95: { label: "Thunderstorm",  icon: "⛈️" },
};

const DEFAULT: WeatherLocation = { id: "kerala", label: "Kerala, India", lat: 10.8505, lon: 76.2711 };

export default function WeatherWidget() {
  const [locations, setLocations] = useState<WeatherLocation[]>([DEFAULT]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [weather, setWeather]     = useState<WeatherData | null>(null);
  const [error, setError]         = useState(false);
  const [loading, setLoading]     = useState(true);

  // Load locations on mount and when settings change
  useEffect(() => {
    const locs = loadLocations();
    setLocations(locs);
    const saved = localStorage.getItem("taraos-active-location");
    setActiveIdx(saved ? Math.max(locs.findIndex((l) => l.id === saved), 0) : 0);

    function onStorage(e: StorageEvent) {
      if (e.key === "taraos-locations") {
        const updated = loadLocations();
        setLocations(updated);
      }
    }
    globalThis.addEventListener("storage", onStorage);
    return () => globalThis.removeEventListener("storage", onStorage);
  }, []);

  // Fetch weather whenever active location changes
  useEffect(() => {
    if (!locations[activeIdx]) return;
    fetchWeather(locations[activeIdx]);
    const id = setInterval(() => fetchWeather(locations[activeIdx]), 30 * 60 * 1000);
    return () => clearInterval(id);
  }, [activeIdx, locations]);

  async function fetchWeather(loc: WeatherLocation) {
    setLoading(true);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`;
      const res = await fetch(url);
      const data = await res.json();
      setWeather({
        temp:        Math.round(data.current.temperature_2m),
        feelsLike:   Math.round(data.current.apparent_temperature),
        humidity:    data.current.relative_humidity_2m,
        windSpeed:   Math.round(data.current.wind_speed_10m),
        weatherCode: data.current.weather_code,
        tempMin:     Math.round(data.daily.temperature_2m_min[0]),
        tempMax:     Math.round(data.daily.temperature_2m_max[0]),
      });
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  function switchLocation(dir: 1 | -1) {
    const next = (activeIdx + dir + locations.length) % locations.length;
    setActiveIdx(next);
    localStorage.setItem("taraos-active-location", locations[next].id);
  }

  const loc = locations[activeIdx] ?? DEFAULT;
  const wmo = weather ? (WMO_CODES[weather.weatherCode] ?? { label: "Unknown", icon: "🌡️" }) : null;

  return (
    <div className="glass-widget" style={{ padding: "20px", height: "100%", display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Location switcher */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {locations.length > 1 && (
          <button type="button" onClick={() => switchLocation(-1)} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 8, width: 28, height: 28, cursor: "pointer", color: "rgba(255,255,255,0.60)", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
            ‹
          </button>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Weather</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.70)", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
            📍 {loc.label}
          </div>
        </div>
        {locations.length > 1 && (
          <button type="button" onClick={() => switchLocation(1)} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 8, width: 28, height: 28, cursor: "pointer", color: "rgba(255,255,255,0.60)", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
            ›
          </button>
        )}
        {wmo && <div style={{ fontSize: 36 }}>{wmo.icon}</div>}
      </div>

      {/* Location dots */}
      {locations.length > 1 && (
        <div style={{ display: "flex", gap: 5, justifyContent: "center" }}>
          {locations.map((_, i) => (
            <button
              key={locations[i].id}
              type="button"
              onClick={() => { setActiveIdx(i); localStorage.setItem("taraos-active-location", locations[i].id); }}
              style={{
                width: i === activeIdx ? 16 : 6, height: 6, borderRadius: 3,
                background: i === activeIdx ? "#0071e3" : "rgba(255,255,255,0.25)",
                border: "none", cursor: "pointer", padding: 0,
                transition: "all 0.2s ease",
              }}
            />
          ))}
        </div>
      )}

      {error && <div style={{ color: "rgba(255,80,60,0.8)", fontSize: 13 }}>Unable to fetch weather</div>}
      {loading && !weather && <div style={{ color: "rgba(255,255,255,0.38)", fontSize: 13 }}>Loading…</div>}

      {weather && wmo && (
        <>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
            <div style={{ fontSize: 52, fontWeight: 200, color: "rgba(255,255,255,0.95)", lineHeight: 1 }}>
              {weather.temp}°
            </div>
            <div style={{ paddingBottom: 6 }}>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.70)" }}>{wmo.label}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>Feels {weather.feelsLike}°</div>
            </div>
          </div>

          <div style={{ height: 1, background: "rgba(255,255,255,0.08)" }} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { label: "High",     value: `${weather.tempMax}°` },
              { label: "Low",      value: `${weather.tempMin}°` },
              { label: "Humidity", value: `${weather.humidity}%` },
              { label: "Wind",     value: `${weather.windSpeed} km/h` },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
                <div style={{ fontSize: 15, color: "rgba(255,255,255,0.85)", fontWeight: 500, marginTop: 2 }}>{value}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
