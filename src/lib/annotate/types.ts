export type FileKind = "image" | "text" | "tabular" | "code" | "document" | "audio" | "video" | "unknown";

export interface Annotation {
  id: string;
  kind: string;
  data: unknown;
  confidence?: number;
  source?: "auto" | "human";
}

export interface AnnotatorContext {
  file: { id: string; name: string; mimeType: string; path: string; size: number };
  buffer: Buffer;
  text?: string;
  onProgress?: (stage: string, progress: number) => void;
}

export interface AnnotatorResult {
  fileKind: FileKind;
  annotations: Annotation[];
  metadata?: Record<string, unknown>;
}
