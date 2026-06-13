// catalog.ts — type definitions + local externalDocker apps only
// The installable app catalog is fetched from tara-cloud/tara-app-registry at runtime.

export interface HelmChartConfig {
  repo?: string;
  repoName?: string;
  chart: string;
  version?: string;
  values?: Record<string, unknown>;
  namespace: string;
  releaseName: string;
  servicePort: number;
  nodePort: number;
}

export interface CatalogApp {
  id: string;
  name: string;
  icon: string;       // fallback emoji
  iconUrl?: string;   // official icon URL (SVG/PNG)
  description: string;
  category: "media" | "productivity" | "utilities" | "monitoring" | "storage";
  color: string;
  helmChart?: HelmChartConfig;
  dockerImage?: string;
  defaultPort?: number;
  containerName?: string;
  volumes?: string[];
  envVars?: string[];
  manualInstall?: boolean;
  externalDocker?: boolean;
}

// ── Static fallback: CasaOS apps still running in Docker (not yet migrated to k3s) ──
// These appear in the launcher with a status dot and Open button only.
// Migrated apps (venus, aries, docvault, immich) are now in installed-apps.json.
export const CATALOG: CatalogApp[] = [
  {
    id: "dht11",
    name: "DHT11 Dashboard",
    icon: "🌡️",
    description: "Temperature and humidity sensor dashboard.",
    category: "monitoring",
    color: "#2f9e44",
    dockerImage: "pmananthu/dht11-dashboard",
    defaultPort: 9090,
    containerName: "dht11-dashboard",
    externalDocker: true,
  },
  {
    id: "navidrome-casaos",
    name: "Navidrome",
    icon: "🎵",
    description: "Music server running via CasaOS Docker.",
    category: "media",
    color: "#9c36b5",
    dockerImage: "linuxserver/navidrome",
    defaultPort: 4533,
    containerName: "navidrome",
    externalDocker: true,
  },
  {
    id: "memos-casaos",
    name: "Memos",
    icon: "📝",
    description: "Quick notes running via CasaOS Docker.",
    category: "productivity",
    color: "#5c7cfa",
    dockerImage: "neosmemo/memos",
    defaultPort: 5230,
    containerName: "memos",
    externalDocker: true,
  },
  {
    id: "pihole-casaos",
    name: "Pi-hole",
    icon: "🛡️",
    description: "Network ad blocker running via CasaOS Docker.",
    category: "utilities",
    color: "#c92a2a",
    dockerImage: "pihole/pihole",
    defaultPort: 8080,
    containerName: "pihole",
    externalDocker: true,
  },
];

export function getCatalogApp(id: string): CatalogApp | undefined {
  return CATALOG.find((a) => a.id === id);
}
