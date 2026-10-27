import { NextResponse } from "next/server";
import { files, annotations, jobs } from "@/lib/db";
import { unlink } from "node:fs/promises";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const file = files.get(id);
  if (!file) return NextResponse.json({ error: "not found" }, { status: 404 });
  const anns = annotations.listByFile(id);
  const job = jobs.getByFile(id);
  return NextResponse.json({ file, annotations: anns, job });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const file = files.get(id);
  if (!file) return NextResponse.json({ error: "not found" }, { status: 404 });
  try { await unlink(file.path); } catch {}
  files.delete(id);
  return NextResponse.json({ ok: true });
}
