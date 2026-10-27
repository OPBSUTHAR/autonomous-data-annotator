import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { projects } from "@/lib/db";
import { z } from "zod";

export async function GET() {
  return NextResponse.json({ projects: projects.list() });
}

const CreateSchema = z.object({ name: z.string().min(1).max(120), description: z.string().max(500).optional() });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const id = nanoid();
  projects.create({ id, name: parsed.data.name, description: parsed.data.description ?? null });
  return NextResponse.json({ project: projects.get(id) }, { status: 201 });
}
