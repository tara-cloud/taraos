import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function runSafe(cmd: string): Promise<string> {
  try {
    const { stdout } = await execAsync(cmd, { timeout: 5000 });
    return stdout.trim();
  } catch { return ""; }
}

interface DiskEntry {
  device: string;
  mount: string;
  total: string;
  used: string;
  free: string;
  percent: number;
  label: string;
}

export async function GET() {
  const dfOut = await runSafe("df -h --output=source,target,size,used,avail,pcent -x tmpfs -x devtmpfs -x overlay -x squashfs");
  const lsblkOut = await runSafe("lsblk -Jbno NAME,SIZE,TYPE,MOUNTPOINT,LABEL 2>/dev/null || echo ''");

  // Build label map from lsblk
  const labelMap: Record<string, string> = {};
  try {
    const lsblk = JSON.parse(lsblkOut || "{}");
    function walk(devs: { name: string; label?: string; mountpoint?: string; children?: unknown[] }[]) {
      for (const d of devs ?? []) {
        if (d.label && d.mountpoint) labelMap[d.mountpoint] = d.label;
        if (d.children) walk(d.children as typeof devs);
      }
    }
    walk(lsblk.blockdevices ?? []);
  } catch { /* lsblk not available or parse error */ }

  const lines = dfOut.split("\n").slice(1).filter(Boolean);
  const disks: DiskEntry[] = [];

  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 6) continue;
    const [device, mount, total, used, free, pctStr] = parts;
    // Skip pseudo filesystems
    if (device.startsWith("none") || mount.startsWith("/sys") || mount.startsWith("/proc") || mount.startsWith("/dev/loop")) continue;

    const percent = parseInt(pctStr) || 0;
    const label = labelMap[mount] ?? (mount === "/" ? "System" : mount.split("/").pop() ?? mount);

    disks.push({ device, mount, total, used, free, percent, label });
  }

  return NextResponse.json(disks);
}
