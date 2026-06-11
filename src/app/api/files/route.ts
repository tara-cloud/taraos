import { NextRequest, NextResponse } from "next/server";
import { readdirSync, statSync } from "fs";
import { join, resolve } from "path";

const BASE_DIR = "/data/files";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

export async function GET(req: NextRequest) {
  const rawPath = req.nextUrl.searchParams.get("path") ?? "";

  // Prevent path traversal
  const target = resolve(join(BASE_DIR, rawPath));
  if (!target.startsWith(BASE_DIR)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const entries = readdirSync(target);
    const result = entries
      .map((name) => {
        try {
          const s = statSync(join(target, name));
          return {
            name,
            isDir: s.isDirectory(),
            size: s.isDirectory() ? "" : formatSize(s.size),
            modified: s.mtime.toLocaleDateString(),
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (a!.isDir !== b!.isDir) return a!.isDir ? -1 : 1;
        return a!.name.localeCompare(b!.name);
      });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
