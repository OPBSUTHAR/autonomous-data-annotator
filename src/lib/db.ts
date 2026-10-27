import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const DB_PATH = resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.DATABASE_PATH || "./data/dev.db");
mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);

db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  mimeType TEXT NOT NULL,
  size INTEGER NOT NULL,
  path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploaded',
  type TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS annotations (
  id TEXT PRIMARY KEY,
  fileId TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  data TEXT NOT NULL,
  confidence REAL,
  source TEXT NOT NULL DEFAULT 'auto',
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  fileId TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued',
  progress INTEGER NOT NULL DEFAULT 0,
  stage TEXT,
  error TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

export interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FileRow {
  id: string;
  projectId: string;
  name: string;
  mimeType: string;
  size: number;
  path: string;
  status: string;
  type: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnnotationRow {
  id: string;
  fileId: string;
  kind: string;
  data: string;
  confidence: number | null;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobRow {
  id: string;
  fileId: string;
  status: string;
  progress: number;
  stage: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export function nowIso() {
  return new Date().toISOString();
}

// ---- Projects ----
export const projects = {
  create(input: { id: string; name: string; description?: string | null }) {
    db.prepare(
      "INSERT INTO projects (id, name, description, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)",
    ).run(input.id, input.name, input.description ?? null, nowIso(), nowIso());
  },
  list() {
    return db.prepare("SELECT * FROM projects ORDER BY createdAt DESC").all() as ProjectRow[];
  },
  get(id: string) {
    return (db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as ProjectRow | undefined) ?? null;
  },
  update(id: string, data: { name?: string; description?: string | null }) {
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (data.name !== undefined) {
      sets.push("name = ?");
      vals.push(data.name);
    }
    if (data.description !== undefined) {
      sets.push("description = ?");
      vals.push(data.description);
    }
    sets.push("updatedAt = ?");
    vals.push(nowIso());
    vals.push(id);
    db.prepare(`UPDATE projects SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
  },
  delete(id: string) {
    db.prepare("DELETE FROM projects WHERE id = ?").run(id);
  },
};

export const files = {
  create(input: { id: string; projectId: string; name: string; mimeType: string; size: number; path: string; type?: string | null }) {
    db.prepare(
      "INSERT INTO files (id, projectId, name, mimeType, size, path, status, type, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, 'uploaded', ?, ?, ?)",
    ).run(input.id, input.projectId, input.name, input.mimeType, input.size, input.path, input.type ?? null, nowIso(), nowIso());
  },
  get(id: string) {
    return (db.prepare("SELECT * FROM files WHERE id = ?").get(id) as FileRow | undefined) ?? null;
  },
  listByProject(projectId: string) {
    return db.prepare("SELECT * FROM files WHERE projectId = ? ORDER BY createdAt DESC").all(projectId) as FileRow[];
  },
  update(id: string, data: Partial<Pick<FileRow, "status" | "type">>) {
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (data.status !== undefined) {
      sets.push("status = ?");
      vals.push(data.status);
    }
    if (data.type !== undefined) {
      sets.push("type = ?");
      vals.push(data.type);
    }
    sets.push("updatedAt = ?");
    vals.push(nowIso());
    vals.push(id);
    db.prepare(`UPDATE files SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
  },
  delete(id: string) {
    db.prepare("DELETE FROM files WHERE id = ?").run(id);
  },
};

export const annotations = {
  create(input: { id: string; fileId: string; kind: string; data: unknown; confidence?: number | null; source?: string }) {
    db.prepare(
      "INSERT INTO annotations (id, fileId, kind, data, confidence, source, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ).run(input.id, input.fileId, input.kind, JSON.stringify(input.data), input.confidence ?? null, input.source ?? "auto", nowIso(), nowIso());
  },
  listByFile(fileId: string) {
    return (db.prepare("SELECT * FROM annotations WHERE fileId = ? ORDER BY createdAt ASC").all(fileId) as AnnotationRow[]).map((r) => ({
      ...r,
      data: JSON.parse(r.data),
    }));
  },
  replaceForFile(fileId: string, items: { id: string; kind: string; data: unknown; confidence?: number | null; source?: string }[]) {
    db.prepare("DELETE FROM annotations WHERE fileId = ?").run(fileId);
    for (const it of items) {
      annotations.create({ ...it, fileId });
    }
  },
  update(id: string, data: { data?: unknown; confidence?: number | null; source?: string }) {
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (data.data !== undefined) {
      sets.push("data = ?");
      vals.push(JSON.stringify(data.data));
    }
    if (data.confidence !== undefined) {
      sets.push("confidence = ?");
      vals.push(data.confidence);
    }
    if (data.source !== undefined) {
      sets.push("source = ?");
      vals.push(data.source);
    }
    sets.push("updatedAt = ?");
    vals.push(nowIso());
    vals.push(id);
    db.prepare(`UPDATE annotations SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
  },
  delete(id: string) {
    db.prepare("DELETE FROM annotations WHERE id = ?").run(id);
  },
};

export const jobs = {
  create(input: { id: string; fileId: string }) {
    db.prepare(
      "INSERT INTO jobs (id, fileId, status, progress, stage, createdAt, updatedAt) VALUES (?, ?, 'queued', 0, NULL, ?, ?)",
    ).run(input.id, input.fileId, nowIso(), nowIso());
  },
  get(id: string) {
    return (db.prepare("SELECT * FROM jobs WHERE id = ?").get(id) as JobRow | undefined) ?? null;
  },
  getByFile(fileId: string) {
    return (db.prepare("SELECT * FROM jobs WHERE fileId = ? ORDER BY createdAt DESC LIMIT 1").get(fileId) as JobRow | undefined) ?? null;
  },
  update(id: string, data: Partial<Pick<JobRow, "status" | "progress" | "stage" | "error">>) {
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (data.status !== undefined) { sets.push("status = ?"); vals.push(data.status); }
    if (data.progress !== undefined) { sets.push("progress = ?"); vals.push(data.progress); }
    if (data.stage !== undefined) { sets.push("stage = ?"); vals.push(data.stage); }
    if (data.error !== undefined) { sets.push("error = ?"); vals.push(data.error); }
    sets.push("updatedAt = ?");
    vals.push(nowIso());
    vals.push(id);
    db.prepare(`UPDATE jobs SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
  },
};
