import { nanoid } from "nanoid";
import { detectKind } from "./detector";
import { annotateImage } from "./image";
import { annotateText } from "./text";
import { annotateTabular } from "./tabular";
import { annotateCode } from "./code";
import { annotateDocument } from "./document";
import { annotateAudio, annotateVideo } from "./media";
import { annotateUnknown } from "./unknown";
import type { AnnotatorContext, AnnotatorResult } from "./types";
import { files, annotations, jobs } from "../db";
import { emit } from "../events";

export async function processFile(fileId: string) {
  const file = files.get(fileId);
  if (!file) return;
  const job = jobs.getByFile(fileId);
  const jobId = job?.id ?? nanoid();
  if (!job) jobs.create({ id: jobId, fileId });

  const updateJob = (status: string, progress: number, stage?: string, error?: string) => {
    jobs.update(jobId, { status, progress, stage: stage ?? null, error: error ?? null });
    files.update(fileId, { status: status === "completed" ? "annotated" : status === "failed" ? "failed" : "processing" });
    emit("file", { fileId, projectId: file.projectId, jobId, status, progress, stage, error });
  };

  try {
    updateJob("processing", 0, "loading file");
    const fs = await import("node:fs/promises");
    const buffer = await fs.readFile(file.path);
    const kind = detectKind(file.mimeType, file.name);
    files.update(fileId, { type: kind });
    updateJob("processing", 5, `detected ${kind}`);

    let text: string | undefined;
    if (kind === "text" || kind === "code" || kind === "tabular" || kind === "document") {
      try { text = buffer.toString("utf8"); } catch { text = undefined; }
    }

    const ctx: AnnotatorContext = {
      file: { id: file.id, name: file.name, mimeType: file.mimeType, path: file.path, size: file.size },
      buffer,
      text,
      onProgress: (stage, progress) => updateJob("processing", progress, stage),
    };

    let result: AnnotatorResult;
    switch (kind) {
      case "image": result = await annotateImage(ctx); break;
      case "text": result = await annotateText(ctx); break;
      case "tabular": result = await annotateTabular(ctx); break;
      case "code": result = await annotateCode(ctx); break;
      case "document": result = await annotateDocument(ctx); break;
      case "audio": result = await annotateAudio(ctx); break;
      case "video": result = await annotateVideo(ctx); break;
      default: result = await annotateUnknown(); break;
    }

    files.update(fileId, { type: result.fileKind });
    annotations.replaceForFile(fileId, result.annotations.map((a) => ({
      id: a.id,
      kind: a.kind,
      data: a.data,
      confidence: a.confidence ?? null,
      source: a.source ?? "auto",
    })));
    updateJob("completed", 100, "done");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    updateJob("failed", 100, "error", msg);
  }
}

export { detectKind };
