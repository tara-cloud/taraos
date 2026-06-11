export interface WeatherLocation {
  id: string;
  label: string;
  lat: number;
  lon: number;
}

const DEFAULT_LOCATIONS: WeatherLocation[] = [
  { id: "kerala",    label: "Kerala, India",    lat: 10.8505, lon: 76.2711 },
  { id: "mumbai",    label: "Mumbai, India",    lat: 19.076,  lon: 72.8777 },
  { id: "bangalore", label: "Bangalore, India", lat: 12.9716, lon: 77.5946 },
  { id: "london",    label: "London, UK",       lat: 51.5074, lon: -0.1278 },
  { id: "newyork",   label: "New York, USA",    lat: 40.7128, lon: -74.006 },
];

export function loadLocations(): WeatherLocation[] {
  try {
    return JSON.parse(localStorage.getItem("taraos-locations") ?? "null") ?? DEFAULT_LOCATIONS;
  } catch { return DEFAULT_LOCATIONS; }
}

export function saveLocations(locs: WeatherLocation[]) {
  localStorage.setItem("taraos-locations", JSON.stringify(locs));
  globalThis.dispatchEvent(new StorageEvent("storage", { key: "taraos-locations" }));
}
