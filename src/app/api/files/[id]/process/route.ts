import { NextResponse } from "next/server";
import { processFile } from "@/lib/annotate";

export const runtime = "nodejs";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  void processFile(id);
  return NextResponse.json({ ok: true });
}
