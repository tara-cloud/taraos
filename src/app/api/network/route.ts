import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function runSafe(cmd: string): Promise<string> {
  try {
    const { stdout } = await execAsync(cmd, { timeout: 5000 });
    return stdout.trim();
  } catch { return ""; }
}

interface NetIface {
  name: string;
  ipv4: string;
  ipv6: string;
  mac: string;
  rxBytes: number;
  txBytes: number;
  rxSpeed: number; // KB/s
  txSpeed: number;
  up: boolean;
}

// Simple in-memory state for speed calculation
const prevStats: Record<string, { rx: number; tx: number; ts: number }> = {};

function parseNetDev(): Record<string, { rx: number; tx: number }> {
  const result: Record<string, { rx: number; tx: number }> = {};
  try {
    const raw = readFileSync("/proc/net/dev", "utf8");
    for (const line of raw.split("\n").slice(2)) {
      const m = line.match(/^\s*(\S+):\s+(\d+)(?:\s+\d+){7}\s+(\d+)/);
      if (m) result[m[1].replace(":", "")] = { rx: Number(m[2]), tx: Number(m[3]) };
    }
  } catch { /* ignore */ }
  return result;
}

export async function GET() {
  const ipOut   = await runSafe("ip -o addr show");
  const linkOut = await runSafe("ip -o link show");

  // Parse IPs
  const ipv4Map: Record<string, string> = {};
  const ipv6Map: Record<string, string> = {};
  for (const line of ipOut.split("\n")) {
    const m4 = line.match(/(\S+)\s+inet\s+([\d.]+\/\d+)/);
    if (m4) ipv4Map[m4[1]] = m4[2];
    const m6 = line.match(/(\S+)\s+inet6\s+([a-f0-9:]+\/\d+)/);
    if (m6 && !m6[2].startsWith("fe80")) ipv6Map[m6[1]] = m6[2];
  }

  // Parse MACs and state
  const macMap: Record<string, string> = {};
  const stateMap: Record<string, boolean> = {};
  for (const line of linkOut.split("\n")) {
    const mMac = line.match(/(\S+).*link\/ether\s+([0-9a-f:]+)/);
    if (mMac) macMap[mMac[1]] = mMac[2];
    const mState = line.match(/(\S+).*state\s+(\S+)/);
    if (mState) stateMap[mState[1]] = mState[2] === "UP";
  }

  // Traffic stats
  const now = Date.now();
  const netDev = parseNetDev();

  const ifaces: NetIface[] = [];
  const seen = new Set<string>();

  for (const name of Object.keys({ ...ipv4Map, ...ipv6Map, ...macMap })) {
    if (seen.has(name)) continue;
    seen.add(name);
    if (name === "lo") continue;

    const stats = netDev[name] ?? { rx: 0, tx: 0 };
    const prev = prevStats[name];
    let rxSpeed = 0, txSpeed = 0;
    if (prev) {
      const dt = (now - prev.ts) / 1000;
      rxSpeed = Math.max(0, Math.round((stats.rx - prev.rx) / 1024 / dt));
      txSpeed = Math.max(0, Math.round((stats.tx - prev.tx) / 1024 / dt));
    }
    prevStats[name] = { rx: stats.rx, tx: stats.tx, ts: now };

    ifaces.push({
      name,
      ipv4: ipv4Map[name] ?? "",
      ipv6: ipv6Map[name] ?? "",
      mac: macMap[name] ?? "",
      rxBytes: stats.rx,
      txBytes: stats.tx,
      rxSpeed,
      txSpeed,
      up: stateMap[name] ?? false,
    });
  }

  // hostname
  const hostname = await runSafe("hostname");

  return NextResponse.json({ hostname, ifaces });
}
