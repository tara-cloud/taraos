import type { AppSettings } from "@/app/api/settings/route";

export type { AppSettings };

const STORAGE_KEY = "taraos-settings-cache";

// Write-through cache: store in localStorage for instant reads,
// sync to server so all devices share the same state.

export async function loadSettings(): Promise<AppSettings> {
  try {
    const res = await fetch("/api/settings", { cache: "no-store" });
    const data: AppSettings = await res.json();
    // Sync to localStorage so storage-event listeners can react
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return data;
  } catch {
    // Fallback to cached copy if network fails
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    } catch { /* fall through to null */ }
    return null as unknown as AppSettings;
  }
}

export async function saveSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const res = await fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const data: AppSettings = await res.json();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  // Notify other tabs/components on same device
  globalThis.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
  return data;
}

export function getCachedSettings(): AppSettings | null {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
  } catch { return null; }
}
