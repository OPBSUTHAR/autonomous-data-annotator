import { NextResponse } from "next/server";
import { files, annotations } from "@/lib/db";

export const runtime = "nodejs";

function toCsv(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return "";
  const keys = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n");
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const file = files.get(id);
  if (!file) return NextResponse.json({ error: "not found" }, { status: 404 });
  const url = new URL(req.url);
  const format = url.searchParams.get("format") || "json";
  const anns = annotations.listByFile(id);

  if (format === "json") {
    const body = JSON.stringify({ file, annotations: anns }, null, 2);
    return new Response(body, { headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="${file.name}.annotations.json"` } });
  }
  if (format === "jsonl") {
    const body = anns.map((a) => JSON.stringify(a)).join("\n");
    return new Response(body, { headers: { "Content-Type": "application/x-ndjson", "Content-Disposition": `attachment; filename="${file.name}.jsonl"` } });
  }
  if (format === "csv") {
    const rows = anns.map((a) => ({ id: a.id, kind: a.kind, confidence: a.confidence, source: a.source, data: JSON.stringify(a.data) }));
    const body = toCsv(rows);
    return new Response(body, { headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="${file.name}.csv"` } });
  }
  if (format === "yolo") {
    const boxes = anns.filter((a) => a.kind === "bbox");
    const classes = Array.from(new Set(boxes.map((b: any) => (b.data as any).label)));
    const idx = new Map(classes.map((c, i) => [c, i]));
    const lines = boxes.map((b: any) => {
      const d = b.data as any;
      const ci = idx.get(d.label) ?? 0;
      return `${ci} ${d.x + d.w / 2} ${d.y + d.h / 2} ${d.w} ${d.h}`;
    });
    const body = `# classes: ${classes.join(", ")}\n` + lines.join("\n");
    return new Response(body, { headers: { "Content-Type": "text/plain", "Content-Disposition": `attachment; filename="${file.name}.txt"` } });
  }
  if (format === "coco") {
    const boxes = anns.filter((a) => a.kind === "bbox");
    const categories = Array.from(new Set(boxes.map((b: any) => (b.data as any).label))).map((label, i) => ({ id: i + 1, name: label }));
    const catIndex = new Map(categories.map((c) => [c.name, c.id]));
    const coco = {
      images: [{ id: 1, file_name: file.name, width: null, height: null }],
      categories,
      annotations: boxes.map((b: any, i: number) => {
        const d = b.data as any;
        return { id: i + 1, image_id: 1, category_id: catIndex.get(d.label) ?? 1, bbox: [d.x, d.y, d.w, d.h], area: d.w * d.h, iscrowd: 0, score: b.confidence ?? null };
      }),
    };
    return new Response(JSON.stringify(coco, null, 2), { headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="${file.name}.coco.json"` } });
  }

  return NextResponse.json({ error: "unknown format" }, { status: 400 });
}
