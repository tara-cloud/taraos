import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { NextRequest, NextResponse } from "next/server";

const DATA_DIR  = process.env.DATA_PATH ?? join(process.cwd(), "dev-data");
const SETTINGS_FILE = join(DATA_DIR, "settings.json");

export interface AppSettings {
  theme:       string;
  bgType:      string;
  bgImage:     string;
  clockFormat: "12" | "24";
  clockFont:   string;
  clockSize:   number;
  dateFormat:  string;
  locations:   { id: string; label: string; lat: number; lon: number }[];
  activeLocationId: string;
  appIcons:    Record<string, string>; // appId → custom iconUrl or emoji
  appIconSize: number;   // icon size in px (default 56)
  appLabelSize: number;  // label font size in px (default 11)
  tithiUrl:    string;   // Tithi calendar app URL e.g. http://192.168.0.107:30302
}

const DEFAULTS: AppSettings = {
  theme:            "bg-nebula",
  bgType:           "Gradient",
  bgImage:          "",
  clockFormat:      "24",
  clockFont:        "system",
  clockSize:        60,
  dateFormat:       "full",
  locations: [
    { id: "kerala",    label: "Kerala, India",    lat: 10.8505, lon: 76.2711 },
    { id: "mumbai",    label: "Mumbai, India",    lat: 19.076,  lon: 72.8777 },
    { id: "bangalore", label: "Bangalore, India", lat: 12.9716, lon: 77.5946 },
  ],
  activeLocationId: "kerala",
  appIcons: {},
  appIconSize: 56,
  appLabelSize: 11,
  tithiUrl: "",
};

function readSettings(): AppSettings {
  try {
    return { ...DEFAULTS, ...JSON.parse(readFileSync(SETTINGS_FILE, "utf8")) };
  } catch {
    return DEFAULTS;
  }
}

function writeSettings(s: AppSettings) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(SETTINGS_FILE, JSON.stringify(s, null, 2));
}

export async function GET() {
  return NextResponse.json(readSettings());
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Partial<AppSettings>;
    const current = readSettings();
    const next: AppSettings = { ...current, ...body };
    writeSettings(next);
    return NextResponse.json(next);
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
}
