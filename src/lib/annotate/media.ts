import { nanoid } from "nanoid";
import type { AnnotatorContext, AnnotatorResult, Annotation } from "./types";

export async function annotateAudio(ctx: AnnotatorContext): Promise<AnnotatorResult> {
  ctx.onProgress?.("profiling audio", 20);
  const annotations: Annotation[] = [
    { id: nanoid(), kind: "label", data: { label: "audio", segments: [] }, confidence: 0.4, source: "auto" },
    { id: nanoid(), kind: "metadata", data: { size: ctx.file.size, mimeType: ctx.file.mimeType, note: "Transcription requires an ASR provider; placeholder generated." }, confidence: 0.3, source: "auto" },
  ];
  ctx.onProgress?.("done", 100);
  return { fileKind: "audio", annotations, metadata: {} };
}

export async function annotateVideo(ctx: AnnotatorContext): Promise<AnnotatorResult> {
  ctx.onProgress?.("profiling video", 20);
  const annotations: Annotation[] = [
    { id: nanoid(), kind: "label", data: { label: "video", scenes: [] }, confidence: 0.4, source: "auto" },
    { id: nanoid(), kind: "metadata", data: { size: ctx.file.size, mimeType: ctx.file.mimeType, note: "Frame extraction/ASR requires a media provider; placeholder generated." }, confidence: 0.3, source: "auto" },
  ];
  ctx.onProgress?.("done", 100);
  return { fileKind: "video", annotations, metadata: {} };
}
