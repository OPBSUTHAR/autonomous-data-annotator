import { nanoid } from "nanoid";
import type { AnnotatorContext, AnnotatorResult, Annotation } from "./types";

export async function annotateCode(ctx: AnnotatorContext): Promise<AnnotatorResult> {
  ctx.onProgress?.("analyzing code", 10);
  const text = ctx.text ?? ctx.buffer.toString("utf8");
  const lines = text.split(/\r?\n/);
  const nonEmpty = lines.filter((l) => l.trim().length > 0).length;
  const todoLines = lines.filter((l) => /TODO|FIXME|HACK/i.test(l));
  const imports = lines.filter((l) => /^\s*(import|require\(|from )/.test(l));
  const functions = text.match(/\b(function|def|func|fn)\s+\w+/g) ?? [];
  const classes = text.match(/\b(class|struct|interface)\s+\w+/g) ?? [];
  const ext = ctx.file.name.split(".").pop() ?? "unknown";
  ctx.onProgress?.("done", 100);
  const annotations: Annotation[] = [
    { id: nanoid(), kind: "code-metrics", data: { language: ext, totalLines: lines.length, nonEmptyLines: nonEmpty, imports: imports.length, functions: functions.length, classes: classes.length }, confidence: 0.95, source: "auto" },
    { id: nanoid(), kind: "todos", data: { count: todoLines.length, items: todoLines.slice(0, 20) }, confidence: 0.9, source: "auto" },
  ];
  return { fileKind: "code", annotations, metadata: { lines: lines.length } };
}
