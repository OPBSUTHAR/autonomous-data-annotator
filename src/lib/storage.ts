import { mkdirSync } from "node:fs";
import { resolve, join, extname } from "node:path";
import { nanoid } from "nanoid";

const BASE_DIR = process.env.VERCEL ? "/tmp/data" : resolve(/*turbopackIgnore: true*/ process.cwd(), "data");
const UPLOAD_DIR = resolve(/*turbopackIgnore: true*/ BASE_DIR, "uploads");
mkdirSync(UPLOAD_DIR, { recursive: true });

export function uploadPath(id: string, name: string) {
  const ext = extname(name);
  return join(UPLOAD_DIR, `${id}${ext}`);
}

export function relativeUploadPath(abs: string) {
  return abs;
}

export function ensureDirs() {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

export function newFileId() {
  return nanoid();
}
