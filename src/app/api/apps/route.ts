import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface DockerContainer {
  Names: string;
  State: string;
  Status: string;
}

const APP_CONTAINER_MAP: Record<string, string> = {
  "Venus Budget":  "venus-budget-app-1",
  "Aries":         "aries-app-1",
  "Pi Control":    "pi-control-center",
  "DocVault":      "docvault",
  "DHT11":         "dht11-dashboard",
  "Tara":          "tara",
  "Mars":          "mars",
  "Navidrome":     "navidrome",
  "Immich":        "immich_server",
  "Memos":         "memos",
  "Pi-hole":       "pihole",
  "Btop":          "big-bear-btop",
};

export async function GET() {
  try {
    const { stdout } = await execAsync(
      `docker ps -a --format '{"Names":"{{.Names}}","State":"{{.State}}","Status":"{{.Status}}"}'`,
      { timeout: 8000 }
    );

    const containers: DockerContainer[] = stdout
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));

    const runningSet = new Set(
      containers.filter((c) => c.State === "running").map((c) => c.Names)
    );

    const result = Object.entries(APP_CONTAINER_MAP).map(([appName, containerName]) => ({
      name: appName,
      container: containerName,
      running: runningSet.has(containerName),
    }));

    return NextResponse.json(result);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
