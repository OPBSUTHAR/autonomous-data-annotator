import { nanoid } from "nanoid";
import type { AnnotatorContext, AnnotatorResult, Annotation } from "./types";

const POS = new Set(["good","great","excellent","positive","happy","love","like","best","awesome","nice","fast","easy"]);
const NEG = new Set(["bad","terrible","poor","negative","sad","hate","dislike","worst","awful","slow","hard","bug"]);

export async function annotateText(ctx: AnnotatorContext): Promise<AnnotatorResult> {
  ctx.onProgress?.("reading text", 10);
  const text = ctx.text ?? ctx.buffer.toString("utf8");
  const lower = text.toLowerCase();
  const words = lower.match(/[a-z']+/g) ?? [];
  ctx.onProgress?.("computing statistics", 30);
  const freq = new Map<string, number>();
  for (const w of words) if (w.length > 3) freq.set(w, (freq.get(w) ?? 0) + 1);
  const topTerms = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([t, c]) => ({ term: t, count: c }));
  ctx.onProgress?.("sentiment", 50);
  let score = 0;
  for (const w of words) {
    if (POS.has(w)) score++;
    if (NEG.has(w)) score--;
  }
  const sentiment = score > 0 ? "positive" : score < 0 ? "negative" : "neutral";
  ctx.onProgress?.("entity extraction", 70);
  const entityRegex = /\b([A-Z][a-zA-Z]{2,}(?:\s+[A-Z][a-zA-Z]{2,})*)\b/g;
  const entitiesSet = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = entityRegex.exec(text)) !== null) entitiesSet.add(m[1]);
  const entities = [...entitiesSet].slice(0, 40).map((e) => ({ text: e, type: "ENTITY" }));
  ctx.onProgress?.("assembling", 90);
  const annotations: Annotation[] = [];
  annotations.push({
    id: nanoid(),
    kind: "sentiment",
    data: { sentiment, score, wordCount: words.length },
    confidence: 0.6,
    source: "auto",
  });
  annotations.push({
    id: nanoid(),
    kind: "keywords",
    data: { terms: topTerms },
    confidence: 0.7,
    source: "auto",
  });
  for (const e of entities) {
    annotations.push({ id: nanoid(), kind: "entity", data: e, confidence: 0.5, source: "auto" });
  }
  annotations.push({
    id: nanoid(),
    kind: "summary",
    data: { preview: text.slice(0, 280), length: text.length },
    confidence: 0.9,
    source: "auto",
  });
  ctx.onProgress?.("done", 100);
  return { fileKind: "text", annotations, metadata: { wordCount: words.length, sentiment } };
}
