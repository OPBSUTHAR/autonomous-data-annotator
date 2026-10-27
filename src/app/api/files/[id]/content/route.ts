import { NextResponse } from "next/server";
import { files } from "@/lib/db";
import { readFile } from "node:fs/promises";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const file = files.get(id);
  if (!file) return NextResponse.json({ error: "not found" }, { status: 404 });
  const buf = await readFile(file.path);
  return new Response(buf, {
    headers: { "Content-Type": file.mimeType, "Cache-Control": "public, max-age=3600" },
  });
}
