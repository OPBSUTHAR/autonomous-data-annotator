import { NextResponse } from "next/server";
import { annotations } from "@/lib/db";
import { z } from "zod";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const schema = z.object({ data: z.any().optional(), confidence: z.number().optional(), source: z.string().optional() });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  annotations.update(id, parsed.data);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  annotations.delete(id);
  return NextResponse.json({ ok: true });
}
