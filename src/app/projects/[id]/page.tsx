"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type FileRow = { id: string; name: string; mimeType: string; size: number; status: string; type: string | null; createdAt: string };
type Ann = { id: string; kind: string; data: any; confidence: number | null; source: string };

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const { data: projectData } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => fetch(`/api/projects/${id}`).then((r) => r.json()),
    refetchInterval: 3000,
  });

  const { data: fileData } = useQuery({
    queryKey: ["file", selected],
    queryFn: async () => (selected ? fetch(`/api/files/${selected}`).then((r) => r.json()) : null),
    enabled: !!selected,
    refetchInterval: selected ? 2000 : false,
  });

  // SSE
  useEffect(() => {
    const es = new EventSource("/api/events");
    es.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.fileId) {
          qc.invalidateQueries({ queryKey: ["file", payload.fileId] });
        }
        qc.invalidateQueries({ queryKey: ["project", id] });
      } catch {}
    };
    return () => es.close();
  }, [id, qc]);

  const upload = useMutation({
    mutationFn: async (filesList: File[]) => {
      const fd = new FormData();
      fd.append("projectId", id);
      filesList.forEach((f) => fd.append("files", f));
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project", id] }),
  });

  const handleFiles = useCallback((fl: FileList | null) => {
    if (!fl || fl.length === 0) return;
    upload.mutate(Array.from(fl));
  }, [upload]);

  const project = projectData?.project;
  const filesList: FileRow[] = projectData?.files ?? [];
  const selectedFile = fileData?.file;
  const annotations: Ann[] = fileData?.annotations ?? [];
  const job = fileData?.job;

  if (!project) return <div className="p-8 text-zinc-400">Loading...</div>;

  return (
    <main className="max-w-7xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/" className="text-zinc-400 hover:text-white text-sm">{"<-"} Projects</Link>
        <h1 className="text-2xl font-bold">{project.name}</h1>
      </div>

      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        className={`border-2 border-dashed rounded-xl p-8 text-center mb-6 transition ${dragging ? "border-emerald-500 bg-emerald-500/5" : "border-zinc-800"}`}
      >
        <p className="text-zinc-400 mb-3">Drag & drop any files here (images, text, CSV, code, docs, audio, video)</p>
        <button
          onClick={() => fileInput.current?.click()}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium"
        >
          {upload.isPending ? "Uploading..." : "Choose files"}
        </button>
        <input ref={fileInput} type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* File list */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <h2 className="font-semibold mb-3">Files ({filesList.length})</h2>
          <ul className="space-y-2 max-h-[70vh] overflow-auto">
            {filesList.map((f) => (
              <li key={f.id}>
                <button
                  onClick={() => setSelected(f.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${selected === f.id ? "bg-emerald-600/20 border border-emerald-500" : "hover:bg-zinc-800 border border-transparent"}`}
                >
                  <div className="truncate font-medium">{f.name}</div>
                  <div className="flex items-center justify-between text-xs text-zinc-500 mt-1">
                    <span>{f.type ?? "detecting"}</span>
                    <StatusBadge status={f.status} />
                  </div>
                </button>
              </li>
            ))}
            {filesList.length === 0 && <li className="text-zinc-500 text-sm py-4 text-center">No files yet</li>}
          </ul>
        </div>

        {/* Annotator view */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          {!selectedFile ? (
            <div className="text-zinc-500 text-center py-20">Select a file to view annotations</div>
          ) : (
            <AnnotatorView file={selectedFile} annotations={annotations} job={job} onReprocess={() => fetch(`/api/files/${selected}/process`, { method: "POST" })} />
          )}
        </div>
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = status === "annotated" ? "text-emerald-400" : status === "failed" ? "text-red-400" : status === "processing" ? "text-amber-400" : "text-zinc-500";
  return <span className={color}>{status}</span>;
}

function AnnotatorView({ file, annotations, job, onReprocess }: { file: FileRow; annotations: Ann[]; job: any; onReprocess: () => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold">{file.name}</h2>
          <div className="text-xs text-zinc-500">{file.type} &middot; {file.status} {job ? `&middot; ${job.progress}%` : ""}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={onReprocess} className="text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded">Reprocess</button>
          <ExportMenu fileId={file.id} />
        </div>
      </div>

      {job && job.status === "processing" && (
        <div className="mb-4">
          <div className="text-xs text-zinc-400 mb-1">{job.stage} ({job.progress}%)</div>
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${job.progress}%` }} />
          </div>
        </div>
      )}
      {job && job.status === "failed" && <div className="mb-4 text-red-400 text-sm">Error: {job.error}</div>}

      {file.type === "image" && <ImageView file={file} annotations={annotations} />}
      {file.type === "text" && <TextView file={file} annotations={annotations} />}
      {file.type === "tabular" && <TabularView annotations={annotations} />}
      {file.type === "code" && <CodeView annotations={annotations} />}
      {(file.type === "document" || file.type === "audio" || file.type === "video" || file.type === "unknown") && <GenericView file={file} annotations={annotations} />}

      <AnnotationList file={file} annotations={annotations} />
    </div>
  );
}

function ExportMenu({ fileId }: { fileId: string }) {
  const formats = ["json", "jsonl", "csv", "coco", "yolo"];
  return (
    <div className="flex gap-1">
      {formats.map((f) => (
        <a
          key={f}
          href={`/api/export/${fileId}?format=${f}`}
          className="text-xs px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded uppercase"
          download
        >
          {f}
        </a>
      ))}
    </div>
  );
}

function ImageView({ file, annotations }: { file: FileRow; annotations: Ann[] }) {
  const boxes = annotations.filter((a) => a.kind === "bbox");
  const labels = annotations.filter((a) => a.kind === "label");
  const meta = annotations.find((a) => a.kind === "metadata");
  return (
    <div className="mb-4">
      <div className="relative inline-block max-w-full">
        <img src={`/api/files/${file.id}/content`} alt={file.name} className="max-h-[50vh] rounded-lg" />
        {boxes.map((b) => {
          const d = b.data as any;
          return (
            <div
              key={b.id}
              className="absolute border-2 border-amber-400 bg-amber-400/10"
              style={{ left: `${(d.x ?? 0) * 100}%`, top: `${(d.y ?? 0) * 100}%`, width: `${(d.w ?? 0) * 100}%`, height: `${(d.h ?? 0) * 100}%` }}
              title={`${d.label} (${Math.round((b.confidence ?? 0) * 100)}%)`}
            />
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {labels.map((l) => <span key={l.id} className="text-xs px-2 py-1 bg-zinc-800 rounded">{(l.data as any).label} ({Math.round((l.confidence ?? 0) * 100)}%)</span>)}
        {meta && <span className="text-xs px-2 py-1 bg-zinc-800 rounded">meta: {JSON.stringify(meta.data)}</span>}
      </div>
    </div>
  );
}

function TextView({ file, annotations }: { file: FileRow; annotations: Ann[] }) {
  const sentiment = annotations.find((a) => a.kind === "sentiment");
  const keywords = annotations.find((a) => a.kind === "keywords");
  const entities = annotations.filter((a) => a.kind === "entity");
  const summary = annotations.find((a) => a.kind === "summary");
  return (
    <div className="space-y-3">
      {sentiment && <div className="text-sm">Sentiment: <b>{(sentiment.data as any).sentiment}</b> (score {(sentiment.data as any).score})</div>}
      {keywords && (
        <div className="flex flex-wrap gap-1">
          {((keywords.data as any).terms ?? []).map((t: any, i: number) => (
            <span key={i} className="text-xs px-2 py-0.5 bg-zinc-800 rounded">{t.term} <span className="text-zinc-500">{t.count}</span></span>
          ))}
        </div>
      )}
      {entities.length > 0 && (
        <div>
          <div className="text-xs text-zinc-400 mb-1">Entities ({entities.length})</div>
          <div className="flex flex-wrap gap-1">
            {entities.map((e) => <span key={e.id} className="text-xs px-2 py-0.5 bg-indigo-900/40 rounded">{(e.data as any).text}</span>)}
          </div>
        </div>
      )}
      {summary && <pre className="text-xs bg-zinc-950 p-3 rounded max-h-40 overflow-auto whitespace-pre-wrap">{(summary.data as any).preview}</pre>}
    </div>
  );
}

function TabularView({ annotations }: { annotations: Ann[] }) {
  const dataset = annotations.find((a) => a.kind === "dataset");
  const cols = annotations.filter((a) => a.kind === "column");
  const labelCol = annotations.find((a) => a.kind === "label-column");
  return (
    <div className="space-y-3">
      {dataset && <div className="text-sm">Rows: {(dataset.data as any).rowCount} &middot; Columns: {(dataset.data as any).columnCount}</div>}
      {labelCol && <div className="text-xs text-emerald-400">Label column: {(labelCol.data as any).column}</div>}
      <div className="overflow-auto">
        <table className="w-full text-xs">
          <thead><tr className="text-left text-zinc-400"><th className="p-2">Column</th><th className="p-2">Type</th><th className="p-2">Nulls</th><th className="p-2">Unique</th><th className="p-2">Samples</th></tr></thead>
          <tbody>
            {cols.map((c) => (
              <tr key={c.id} className="border-t border-zinc-800">
                <td className="p-2 font-medium">{(c.data as any).name}</td>
                <td className="p-2">{(c.data as any).type}</td>
                <td className="p-2">{(c.data as any).nullCount}</td>
                <td className="p-2">{(c.data as any).uniqueCount}</td>
                <td className="p-2 truncate max-w-xs">{((c.data as any).sample ?? []).join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CodeView({ annotations }: { annotations: Ann[] }) {
  const m = annotations.find((a) => a.kind === "code-metrics");
  const t = annotations.find((a) => a.kind === "todos");
  return (
    <div className="space-y-2 text-sm">
      {m && <pre className="bg-zinc-950 p-3 rounded text-xs">{JSON.stringify(m.data, null, 2)}</pre>}
      {t && <div className="text-xs text-zinc-400">TODOs: {(t.data as any).count}</div>}
    </div>
  );
}

function GenericView({ file, annotations }: { file: FileRow; annotations: Ann[] }) {
  return (
    <div className="space-y-2">
      <div className="text-sm text-zinc-400">Type: {file.type}</div>
      <div className="text-xs">{annotations.length} annotations generated.</div>
    </div>
  );
}

function AnnotationList({ file, annotations }: { file: FileRow; annotations: Ann[] }) {
  return (
    <details className="mt-4">
      <summary className="cursor-pointer text-sm text-zinc-400">Raw annotations ({annotations.length})</summary>
      <pre className="mt-2 text-xs bg-zinc-950 p-3 rounded max-h-60 overflow-auto">{JSON.stringify(annotations, null, 2)}</pre>
    </details>
  );
}
