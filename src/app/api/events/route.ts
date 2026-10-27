import { subscribeAll } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (data: unknown) => {
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)); } catch {}
      };
      send({ event: "connected", ts: Date.now() });
      const unsub = subscribeAll((payload) => send(payload));
      const timer = setInterval(() => {
        try { controller.enqueue(encoder.encode(": ping\n\n")); } catch {}
      }, 15000);
      const cleanup = () => { unsub(); clearInterval(timer); try { controller.close(); } catch {} };
      req.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      // handled by abort
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
