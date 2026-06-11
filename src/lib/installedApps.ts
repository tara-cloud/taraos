import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const DATA_DIR = process.env.DATA_PATH ?? join(process.cwd(), "dev-data");
const INSTALLED_FILE = join(DATA_DIR, "installed-apps.json");

export interface InstalledApp {
  id: string;
  installedAt: string;
  installedTag: string;
  containerName: string;
  port: number;
  installMethod: "helm" | "docker";
  helmRelease?: string;
  helmNamespace?: string;
}

export interface InstalledAppStatus extends InstalledApp {
  running: boolean;
  currentImageTag: string;
  latestTag: string;
  hasUpdate: boolean;
}

export function readInstalled(): InstalledApp[] {
  try {
    return JSON.parse(readFileSync(INSTALLED_FILE, "utf8")) as InstalledApp[];
  } catch {
    return [];
  }
}

export function writeInstalled(apps: InstalledApp[]): void {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(INSTALLED_FILE, JSON.stringify(apps, null, 2));
}
