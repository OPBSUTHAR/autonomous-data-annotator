type Listener = (payload: Record<string, unknown>) => void;

const g = globalThis as unknown as { __annotatorEmitter?: Map<string, Set<Listener>> };

if (!g.__annotatorEmitter) g.__annotatorEmitter = new Map();

const channels = g.__annotatorEmitter;

export function emit(event: string, payload: Record<string, unknown> = {}) {
  const set = channels.get(event);
  if (set) for (const cb of set) cb(payload);
  // also broadcast on wildcard
  const all = channels.get("*");
  if (all) for (const cb of all) cb({ event, ...payload });
}

export function subscribe(event: string, cb: Listener) {
  if (!channels.has(event)) channels.set(event, new Set());
  channels.get(event)!.add(cb);
  return () => channels.get(event)?.delete(cb);
}

export function subscribeAll(cb: Listener) {
  return subscribe("*", cb);
}
