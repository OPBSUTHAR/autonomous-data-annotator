import { nanoid } from "nanoid";
import type { AnnotatorContext, AnnotatorResult, Annotation } from "./types";

export async function annotateDocument(ctx: AnnotatorContext): Promise<AnnotatorResult> {
  ctx.onProgress?.("inspecting document", 10);
  const name = ctx.file.name.toLowerCase();
  if (name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".html") || name.endsWith(".csv")) {
    const { annotateText } = await import("./text");
    return annotateText(ctx);
  }
  ctx.onProgress?.("extracting metadata", 40);
  const annotations: Annotation[] = [
    { id: nanoid(), kind: "document", data: { note: "Binary document. Text extraction not available in this build; file stored for downstream processing.", mimeType: ctx.file.mimeType, size: ctx.file.size }, confidence: 0.4, source: "auto" },
    { id: nanoid(), kind: "label", data: { label: "document" }, confidence: 0.5, source: "auto" },
  ];
  ctx.onProgress?.("done", 100);
  return { fileKind: "document", annotations, metadata: {} };
}
