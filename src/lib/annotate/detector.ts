import path from "node:path";

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|bmp|tiff?)$/i;
const AUDIO_EXT = /\.(mp3|wav|ogg|m4a|flac|aac)$/i;
const VIDEO_EXT = /\.(mp4|webm|mov|mkv|avi)$/i;
const CODE_EXT = new Set([".ts",".tsx",".js",".jsx",".py",".java",".go",".rs",".cpp",".c",".h",".cs",".rb",".php",".swift",".kt",".scala"]);
const DOC_EXT = new Set([".pdf",".docx",".doc",".pptx",".xlsx"]);
const TABULAR_EXT = new Set([".csv",".tsv",".jsonl",".parquet"]);

export function detectKind(mimeType: string, name: string): string {
  const ext = path.extname(name).toLowerCase();
  if (mimeType.startsWith("image/") || IMAGE_EXT.test(name)) return "image";
  if (mimeType.startsWith("audio/") || AUDIO_EXT.test(name)) return "audio";
  if (mimeType.startsWith("video/") || VIDEO_EXT.test(name)) return "video";
  if (mimeType === "text/csv" || TABULAR_EXT.has(ext) || ext === ".csv") return "tabular";
  if (CODE_EXT.has(ext)) return "code";
  if (DOC_EXT.has(ext) || mimeType === "application/pdf") return "document";
  if (mimeType.startsWith("text/") || /\.(md|txt|json|xml|html|css|yaml|yml)$/i.test(name)) return "text";
  if (mimeType === "application/json" || mimeType === "application/xml") return "text";
  return "unknown";
}
