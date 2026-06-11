export interface HelmChartConfig {
  repo?: string;
  repoName?: string;
  chart: string;          // "./navidrome" for bundled, "portainer/portainer" for public
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
  icon: string;
  description: string;
  category: "media" | "productivity" | "utilities" | "monitoring" | "storage";
  color: string;
  // Helm-based install (preferred)
  helmChart?: HelmChartConfig;
  // Docker fallback (legacy / manual)
  dockerImage?: string;
  defaultPort?: number;
  containerName?: string;
  volumes?: string[];
  envVars?: string[];
  manualInstall?: boolean;
}

export const CATALOG: CatalogApp[] = [
  // ── Bundled helm charts ──────────────────────────────────────────────────
  {
    id: "navidrome",
    name: "Navidrome",
    icon: "🎵",
    description: "Modern music server and streamer compatible with Subsonic API.",
    category: "media",
    color: "#9c36b5",
    helmChart: {
      chart: "./navidrome",
      namespace: "navidrome",
      releaseName: "navidrome",
      servicePort: 4533,
      nodePort: 30433,
    },
  },
  {
    id: "memos",
    name: "Memos",
    icon: "📝",
    description: "Lightweight, self-hosted memo hub for quick notes.",
    category: "productivity",
    color: "#5c7cfa",
    helmChart: {
      chart: "./memos",
      namespace: "memos",
      releaseName: "memos",
      servicePort: 5230,
      nodePort: 30530,
    },
  },
  {
    id: "filebrowser",
    name: "File Browser",
    icon: "📁",
    description: "Web-based file manager for browsing and managing your files.",
    category: "utilities",
    color: "#f76707",
    helmChart: {
      chart: "./filebrowser",
      namespace: "filebrowser",
      releaseName: "filebrowser",
      servicePort: 8081,
      nodePort: 30081,
    },
  },
  {
    id: "uptime-kuma",
    name: "Uptime Kuma",
    icon: "📡",
    description: "Self-hosted uptime monitoring tool with a fancy UI.",
    category: "monitoring",
    color: "#2f9e44",
    helmChart: {
      chart: "./uptime-kuma",
      namespace: "uptime-kuma",
      releaseName: "uptime-kuma",
      servicePort: 3001,
      nodePort: 30401,
    },
  },
  {
    id: "vaultwarden",
    name: "Vaultwarden",
    icon: "🔐",
    description: "Unofficial Bitwarden-compatible server written in Rust.",
    category: "productivity",
    color: "#495057",
    helmChart: {
      chart: "./vaultwarden",
      namespace: "vaultwarden",
      releaseName: "vaultwarden",
      servicePort: 80,
      nodePort: 30222,
    },
  },
  {
    id: "mealie",
    name: "Mealie",
    icon: "🍽️",
    description: "Self-hosted recipe manager and meal planner.",
    category: "productivity",
    color: "#12b886",
    helmChart: {
      chart: "./mealie",
      namespace: "mealie",
      releaseName: "mealie",
      servicePort: 9000,
      nodePort: 30925,
    },
  },
  {
    id: "dozzle",
    name: "Dozzle",
    icon: "🪵",
    description: "Realtime log viewer for Docker containers.",
    category: "monitoring",
    color: "#e03131",
    helmChart: {
      chart: "./dozzle",
      namespace: "dozzle",
      releaseName: "dozzle",
      servicePort: 8080,
      nodePort: 30999,
    },
  },
  {
    id: "dashdot",
    name: "Dash.",
    icon: "📊",
    description: "Modern server dashboard with live system metrics.",
    category: "monitoring",
    color: "#e64980",
    helmChart: {
      chart: "./dashdot",
      namespace: "dashdot",
      releaseName: "dashdot",
      servicePort: 3001,
      nodePort: 30305,
    },
  },

  // ── Public Helm repo charts ───────────────────────────────────────────────
  {
    id: "portainer",
    name: "Portainer",
    icon: "🐋",
    description: "Lightweight container management UI for Docker and Kubernetes.",
    category: "monitoring",
    color: "#1971c2",
    helmChart: {
      repo: "https://portainer.github.io/k8s/charts",
      repoName: "portainer",
      chart: "portainer/portainer",
      namespace: "portainer",
      releaseName: "portainer",
      servicePort: 9000,
      nodePort: 30900,
      values: { service: { type: "NodePort", httpPort: 9000, httpNodePort: 30900 } },
    },
  },
  {
    id: "gitea",
    name: "Gitea",
    icon: "🐙",
    description: "Lightweight self-hosted Git service.",
    category: "productivity",
    color: "#2f9e44",
    helmChart: {
      repo: "https://dl.gitea.com/charts/",
      repoName: "gitea-charts",
      chart: "gitea-charts/gitea",
      namespace: "gitea",
      releaseName: "gitea",
      servicePort: 3000,
      nodePort: 30030,
      values: { service: { http: { type: "NodePort", nodePort: 30030 } }, gitea: { admin: { username: "admin", email: "admin@gitea.local" } } },
    },
  },
  {
    id: "jellyfin",
    name: "Jellyfin",
    icon: "🎬",
    description: "Free software media system to manage and stream your media.",
    category: "media",
    color: "#7950f2",
    helmChart: {
      repo: "https://jellyfin.github.io/jellyfin-helm",
      repoName: "jellyfin",
      chart: "jellyfin/jellyfin",
      namespace: "jellyfin",
      releaseName: "jellyfin",
      servicePort: 8096,
      nodePort: 30896,
      values: { service: { type: "NodePort", nodePort: 30896 } },
    },
  },

  // ── Docker-only (complex multi-container or manual) ───────────────────────
  {
    id: "immich",
    name: "Immich",
    icon: "📷",
    description: "High-performance self-hosted photo and video backup solution.",
    category: "media",
    color: "#1971c2",
    dockerImage: "ghcr.io/immich-app/immich-server",
    defaultPort: 2283,
    containerName: "immich_server",
    manualInstall: true,
  },
  {
    id: "homeassistant",
    name: "Home Assistant",
    icon: "🏠",
    description: "Open source home automation platform.",
    category: "utilities",
    color: "#1a73e8",
    dockerImage: "homeassistant/home-assistant",
    defaultPort: 8123,
    containerName: "homeassistant",
    manualInstall: true,
  },
  {
    id: "pihole",
    name: "Pi-hole",
    icon: "🛡️",
    description: "Network-wide ad blocker acting as a DNS sinkhole.",
    category: "utilities",
    color: "#c92a2a",
    dockerImage: "pihole/pihole",
    defaultPort: 8080,
    containerName: "pihole",
    volumes: ["/DATA/AppData/pihole/etc:/etc/pihole", "/DATA/AppData/pihole/dnsmasq:/etc/dnsmasq.d"],
    envVars: ["WEBPASSWORD=admin", "TZ=Asia/Kolkata"],
  },
  {
    id: "navidrome-docker",
    name: "Navidrome (Docker)",
    icon: "🎵",
    description: "Music server — Docker version (legacy).",
    category: "media",
    color: "#9c36b5",
    dockerImage: "deluan/navidrome",
    defaultPort: 4533,
    containerName: "navidrome",
    volumes: ["/DATA/AppData/navidrome/data:/data", "/DATA/AppData/navidrome/music:/music:ro"],
    envVars: ["ND_SCANSCHEDULE=1h", "ND_LOGLEVEL=info"],
  },
];

export function getCatalogApp(id: string): CatalogApp | undefined {
  return CATALOG.find((a) => a.id === id);
}
