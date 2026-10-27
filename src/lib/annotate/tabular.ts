import { nanoid } from "nanoid";
import type { AnnotatorContext, AnnotatorResult, Annotation } from "./types";

function splitCsvLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === delim && !inQ) {
      out.push(cur); cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

function inferType(vals: string[]): string {
  let num = 0, bool = 0, date = 0;
  const sample = vals.filter(Boolean).slice(0, 50);
  for (const v of sample) {
    if (/^-?\d+(\.\d+)?$/.test(v.trim())) num++;
    else if (/^(true|false|yes|no)$/i.test(v.trim())) bool++;
    else if (!isNaN(Date.parse(v)) && v.length > 6) date++;
  }
  const n = sample.length || 1;
  if (num / n > 0.8) return "number";
  if (bool / n > 0.8) return "boolean";
  if (date / n > 0.8) return "date";
  return "string";
}

export async function annotateTabular(ctx: AnnotatorContext): Promise<AnnotatorResult> {
  ctx.onProgress?.("parsing", 10);
  const raw = ctx.text ?? ctx.buffer.toString("utf8");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return { fileKind: "tabular", annotations: [], metadata: { rows: 0 } };
  }
  let delim = ",";
  if (ctx.file.name.endsWith(".tsv")) delim = "\t";
  const first = lines[0];
  const commaCount = (first.match(/,/g) || []).length;
  const tabCount = (first.match(/\t/g) || []).length;
  if (tabCount > commaCount) delim = "\t";
  const header = splitCsvLine(first, delim).map((h) => h.trim());
  const rows = lines.slice(1).map((l) => splitCsvLine(l, delim));
  ctx.onProgress?.("profiling columns", 40);
  const annotations: Annotation[] = [];
  annotations.push({
    id: nanoid(),
    kind: "dataset",
    data: { rowCount: rows.length, columnCount: header.length, columns: header },
    confidence: 1,
    source: "auto",
  });
  for (let c = 0; c < header.length; c++) {
    const colVals = rows.map((r) => (r[c] ?? "").trim());
    const nonEmpty = colVals.filter(Boolean);
    const nullCount = colVals.length - nonEmpty.length;
    const t = inferType(colVals);
    const unique = new Set(nonEmpty).size;
    annotations.push({
      id: nanoid(),
      kind: "column",
      data: {
        name: header[c],
        index: c,
        type: t,
        nullCount,
        uniqueCount: unique,
        sample: nonEmpty.slice(0, 5),
      },
      confidence: 0.8,
      source: "auto",
    });
  }
  // heuristic label column: column with few unique categorical values or name hints
  const labelHint = header.find((h) => /label|target|class|y$/i.test(h));
  if (labelHint) {
    annotations.push({ id: nanoid(), kind: "label-column", data: { column: labelHint }, confidence: 0.9, source: "auto" });
  }
  ctx.onProgress?.("done", 100);
  return { fileKind: "tabular", annotations, metadata: { rows: rows.length, columns: header.length } };
}
