import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { files, projects, jobs } from "@/lib/db";
import { uploadPath } from "@/lib/storage";
import { writeFile } from "node:fs/promises";
import { processFile } from "@/lib/annotate";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const form = await req.formData();
  const projectId = String(form.get("projectId") || "");
  if (!projectId || !projects.get(projectId)) {
    return NextResponse.json({ error: "valid projectId required" }, { status: 400 });
  }
  const uploaded = form.getAll("files").filter((v): v is File => v instanceof File);
  if (uploaded.length === 0) return NextResponse.json({ error: "no files" }, { status: 400 });

  const results = [];
  for (const f of uploaded) {
    const id = nanoid();
    const path = uploadPath(id, f.name);
    const buf = Buffer.from(await f.arrayBuffer());
    await writeFile(path, buf);
    files.create({ id, projectId, name: f.name, mimeType: f.type || "application/octet-stream", size: f.size, path });
    jobs.create({ id: nanoid(), fileId: id });
    results.push({ id, name: f.name, size: f.size });
    // fire and forget
    void processFile(id);
  }
  return NextResponse.json({ files: results }, { status: 201 });
}
