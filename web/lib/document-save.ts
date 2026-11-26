import { canonicalTitle } from "@/lib/page-title";

type Queue = {
  next: string | null;
  sent: string | null;
  running: boolean;
};

const titles = new Map<string, Queue>();
const states = new Map<string, Queue>();

function queueFor(map: Map<string, Queue>, id: string) {
  const existing = map.get(id);
  if (existing) return existing;
  const created: Queue = { next: null, sent: null, running: false };
  map.set(id, created);
  return created;
}

async function drain(
  queue: Queue,
  send: (value: string) => Promise<boolean>,
) {
  if (queue.running) return;
  queue.running = true;
  let failedValue: string | null = null;
  try {
    while (queue.next != null && queue.next !== queue.sent) {
      const value = queue.next;
      queue.next = null;
      let ok = false;
      try {
        ok = await send(value);
      } catch {
        ok = false;
      }
      if (ok) {
        queue.sent = value;
        continue;
      }
      failedValue = value;
      if (queue.next == null) queue.next = value;
      break;
    }
  } finally {
    queue.running = false;
    if (queue.next != null && queue.next !== queue.sent && queue.next !== failedValue) {
      void drain(queue, send);
    }
  }
}

/** Saves the latest title. Older requests cannot overwrite a newer one. */
export function saveDocumentTitle(documentId: string, title: string) {
  const stored = canonicalTitle(title);
  const queue = queueFor(titles, documentId);
  queue.next = stored;
  void drain(queue, async (value) => {
    const res = await fetch(`/api/documents/${documentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: value }),
      keepalive: true,
    });
    return res.ok;
  });
}

/** Saves the latest note. A slow response cannot replace a newer copy. */
export function persistDocumentState(documentId: string, state: string) {
  if (!state || state.length > 12_000_000) return;
  const queue = queueFor(states, documentId);
  queue.next = state;
  void drain(queue, async (value) => {
    const res = await fetch(`/api/documents/${documentId}/state`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: value }),
      keepalive: value.length < 60_000,
    });
    return res.ok;
  });
}
