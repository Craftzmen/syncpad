import type { SidebarDoc } from "@/components/WorkspaceShell";

const added = new Map<string, SidebarDoc>();
const removed = new Set<string>();
const patches = new Map<string, Partial<SidebarDoc>>();
const acceptedAt = new Map<string, string>();
const accepted = new Map<string, SidebarDoc>();

function caughtUp(doc: SidebarDoc, patch: Partial<SidebarDoc>) {
  const keys = Object.keys(patch) as (keyof SidebarDoc)[];
  return keys.every((key) => doc[key] === patch[key]);
}

function applyPatch(doc: SidebarDoc) {
  const patch = patches.get(doc.id);
  if (!patch) return doc;
  return { ...doc, ...patch };
}

function stale(doc: SidebarDoc) {
  const seen = acceptedAt.get(doc.id);
  return Boolean(seen && doc.updatedAt && doc.updatedAt < seen);
}

/** Keeps a title, icon, pin, or favorite until the server agrees. */
export function rememberPatch(id: string, partial: Partial<SidebarDoc>) {
  patches.set(id, { ...patches.get(id), ...partial });
  const current = accepted.get(id);
  if (current) accepted.set(id, { ...current, ...partial });
  const optimistic = added.get(id);
  if (optimistic) added.set(id, { ...optimistic, ...partial });
}

export function rememberAdded(doc: SidebarDoc) {
  removed.delete(doc.id);
  added.set(doc.id, doc);
  accepted.set(doc.id, doc);
}

export function rememberRemoved(id: string) {
  added.delete(id);
  removed.add(id);
  patches.delete(id);
  accepted.delete(id);
  acceptedAt.delete(id);
}

/**
 * Combines the server list with edits that have not been confirmed.
 * A list older than one already applied cannot put the previous title back.
 */
export function mergeServerDocs(serverDocs: SidebarDoc[]) {
  const serverIds = new Set(serverDocs.map((doc) => doc.id));
  for (const id of removed) {
    if (!serverIds.has(id)) removed.delete(id);
  }
  for (const id of [...added.keys()]) {
    if (serverIds.has(id)) added.delete(id);
  }

  const extras = [...added.values()]
    .filter((doc) => !removed.has(doc.id))
    .map((doc) => {
      const next = applyPatch(doc);
      accepted.set(doc.id, next);
      return next;
    });

  const rows = serverDocs
    .filter((doc) => !removed.has(doc.id) && !added.has(doc.id))
    .map((doc) => {
      if (stale(doc)) {
        const next = applyPatch(accepted.get(doc.id) ?? doc);
        accepted.set(doc.id, next);
        return next;
      }
      if (doc.updatedAt) acceptedAt.set(doc.id, doc.updatedAt);
      const patch = patches.get(doc.id);
      if (patch && caughtUp(doc, patch)) patches.delete(doc.id);
      const next = applyPatch(doc);
      accepted.set(doc.id, next);
      return next;
    });

  return [...extras, ...rows];
}
