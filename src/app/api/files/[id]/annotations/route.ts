import { NextResponse } from "next/server";
import { annotations } from "@/lib/db";
import { nanoid } from "nanoid";
import { z } from "zod";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const schema = z.object({ kind: z.string().min(1), data: z.any(), confidence: z.number().optional(), source: z.string().optional() });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const annId = nanoid();
  annotations.create({ id: annId, fileId: id, kind: parsed.data.kind, data: parsed.data.data, confidence: parsed.data.confidence ?? null, source: parsed.data.source ?? "human" });
  return NextResponse.json({ id: annId }, { status: 201 });
}
