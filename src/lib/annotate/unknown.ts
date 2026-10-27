import { nanoid } from "nanoid";
import type { AnnotatorContext, AnnotatorResult, Annotation } from "./types";

export async function annotateUnknown(ctx: AnnotatorContext): Promise<AnnotatorResult> {
  const annotations: Annotation[] = [
    { id: nanoid(), kind: "label", data: { label: "unknown", note: "No specialized annotator matched this file." }, confidence: 0.2, source: "auto" },
  ];
  return { fileKind: "unknown", annotations, metadata: {} };
}
