# Autonomous Data Annotator

A reactive, full-stack web application that **automatically annotates any file** you throw at it. Upload
images, text, CSV/TSV/JSONL tables, source code, documents, audio, or video and get structured, editable
annotations in seconds. Real-time progress is pushed to the UI over Server-Sent Events.

Built by **Omprakash Suthar (@OPBSUTHAR)**.

## Features

- **Universal ingestion**: drag-and-drop any file type; MIME/extension-based detection.
- **Autonomous annotators**: per-type pipelines (images, text/NLP, tabular profiling, code metrics, documents, media).
- **Reactive UI**: TanStack Query + SSE for live job progress and instant annotation updates.
- **Human-in-the-loop**: review, edit, delete, and add annotations manually.
- **Export anywhere**: JSON, JSONL, CSV, COCO, YOLO formats for direct ML training.
- **Pluggable AI providers**: optional `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` for richer labeling (heuristics work offline).

## Tech stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS 4
- TanStack Query
- SQLite via Node 24 `node:sqlite` (`data/dev.db`, no native deps)
- Server-Sent Events for realtime

## Quick start

```bash
git clone https://github.com/OPBSUTHAR/autonomous-data-annotator.git
cd autonomous-data-annotator
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:3000.

## Production build

```bash
npm run build
npm start
```

## Project structure

```
src/
  app/            # Next.js App Router pages + API routes
  components/     # React providers
  lib/
    annotate/     # Detection + per-type annotators + pipeline
    db.ts         # SQLite access layer
    events.ts     # SSE event emitter
    storage.ts    # Upload storage
```

## Extending annotators

Add a module under `src/lib/annotate/`, register it in `src/lib/annotate/index.ts`. Each annotator receives an
`AnnotatorContext` (buffer, text, progress callback) and returns `AnnotatorResult` (file kind + annotations).

## Notes

- Data is stored locally in `./data`. Do not commit it.
- The default annotators are deterministic heuristics so the app runs offline. Add provider keys for LLM-based
  annotation.
- Author: Omprakash Suthar (@OPBSUTHAR) -- 178475619+OPBSUTHAR@users.noreply.github.com
