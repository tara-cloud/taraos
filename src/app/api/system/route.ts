import { readFileSync } from "fs";
import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function runSafe(cmd: string): Promise<string> {
  try {
    const { stdout } = await execAsync(cmd, { timeout: 5000 });
    return stdout.trim();
  } catch {
    return "";
  }
}

async function getCpu(): Promise<number> {
  function parseStat(line: string) {
    const parts = line.trim().split(/\s+/).slice(1).map(Number);
    const idle = parts[3] + parts[4];
    const total = parts.reduce((a, b) => a + b, 0);
    return { idle, total };
  }

  try {
    const stat1 = readFileSync("/proc/stat", "utf8").split("\n")[0];
    await new Promise((r) => setTimeout(r, 200));
    const stat2 = readFileSync("/proc/stat", "utf8").split("\n")[0];
    const s1 = parseStat(stat1);
    const s2 = parseStat(stat2);
    const totalDelta = s2.total - s1.total;
    const idleDelta = s2.idle - s1.idle;
    return Math.round((1 - idleDelta / totalDelta) * 100);
  } catch {
    return 0;
  }
}

async function getRam() {
  try {
    const raw = readFileSync("/proc/meminfo", "utf8");
    const get = (key: string) => {
      const m = raw.match(new RegExp(`^${key}:\\s+(\\d+)`, "m"));
      return m ? Number(m[1]) * 1024 : 0;
    };
    const total = get("MemTotal");
    const free = get("MemFree");
    const buffers = get("Buffers");
    const cached = get("Cached");
    const used = total - free - buffers - cached;
    const toGB = (b: number) => (b / 1024 ** 3).toFixed(1);
    return {
      used: toGB(used),
      total: toGB(total),
      percent: Math.round((used / total) * 100),
    };
  } catch {
    return { used: "0", total: "0", percent: 0 };
  }
}

async function getDisk() {
  const out = await runSafe("df -h /data --output=used,size,pcent | tail -1");
  if (!out) return { used: "?", total: "?", percent: 0 };
  const [used, total, pct] = out.trim().split(/\s+/);
  return { used, total, percent: parseInt(pct) || 0 };
}

async function getTemp(): Promise<number> {
  try {
    const raw = readFileSync("/sys/class/thermal/thermal_zone0/temp", "utf8");
    return Math.round(Number(raw.trim()) / 1000);
  } catch {
    return 0;
  }
}

async function getUptime(): Promise<string> {
  const out = await runSafe("uptime -p");
  return out.replace("up ", "") || "unknown";
}

export async function GET() {
  const [cpu, ram, disk, temp, uptime] = await Promise.all([
    getCpu(), getRam(), getDisk(), getTemp(), getUptime(),
  ]);
  return NextResponse.json({ cpu, ram, disk, temp, uptime });
}
