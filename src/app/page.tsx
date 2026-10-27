"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { nanoid } from "nanoid";

export default function Home() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["projects"], queryFn: async () => fetch("/api/projects").then((r) => r.json()) });
  const [name, setName] = useState("");
  const create = useMutation({
    mutationFn: async (n: string) => fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: n }) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["projects"] }); setName(""); },
  });
  const projects = data?.projects ?? [];

  return (
    <main className="max-w-6xl mx-auto p-8">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Autonomous Data Annotator</h1>
          <p className="text-zinc-400 text-sm mt-1">Upload any file. Get annotations automatically.</p>
        </div>
      </header>

      <section className="mb-8 flex gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && name.trim() && create.mutate(name.trim())}
          placeholder="New project name"
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-emerald-500"
        />
        <button
          onClick={() => name.trim() && create.mutate(name.trim())}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium"
        >
          Create project
        </button>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((p: any) => (
          <Link key={p.id} href={`/projects/${p.id}`} className="block bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-emerald-500 transition">
            <div className="text-lg font-semibold">{p.name}</div>
            {p.description && <div className="text-sm text-zinc-400 mt-1">{p.description}</div>}
            <div className="text-xs text-zinc-500 mt-3">{new Date(p.createdAt).toLocaleString()}</div>
          </Link>
        ))}
        {projects.length === 0 && (
          <div className="col-span-full text-center text-zinc-500 py-12 border border-dashed border-zinc-800 rounded-xl">
            No projects yet. Create one above.
          </div>
        )}
      </section>
    </main>
  );
}
