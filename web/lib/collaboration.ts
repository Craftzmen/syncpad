import type { HocuspocusProvider } from "@hocuspocus/provider";
import { HocuspocusProvider as Provider } from "@hocuspocus/provider";
import * as Y from "yjs";

import type { CollabRole } from "./collab-token";
import { ensureYjsAttributes } from "./sync-editor";

const hocuspocusUrl =
  process.env.NEXT_PUBLIC_HOCUSPOCUS_URL ?? "ws://localhost:1234";

export type CollabBootstrap = {
  token: string;
  role: CollabRole;
  userId: string;
  name: string;
  image?: string | null;
};

export type CollabSession = CollabBootstrap & {
  ydoc: Y.Doc;
  provider: HocuspocusProvider | null;
};

const sessions = new Map<string, CollabSession>();

function bytesFromBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function encodeDocumentState(ydoc: Y.Doc) {
  const bytes = Y.encodeStateAsUpdate(ydoc);
  let binary = "";
  const size = 0x8000;
  for (let index = 0; index < bytes.length; index += size) {
    binary += String.fromCharCode(...bytes.subarray(index, index + size));
  }
  return btoa(binary);
}

/** Replace the visible page with a saved Yjs snapshot without merging the two. */
export function replaceDocumentFragment(target: Y.Doc, state: string) {
  const source = new Y.Doc();
  try {
    Y.applyUpdate(source, bytesFromBase64(state));
    const from = source.getXmlFragment("default");
    const to = target.getXmlFragment("default");
    const clones: Array<Y.XmlElement | Y.XmlText> = [];
    for (let index = 0; index < from.length; index += 1) {
      const child = from.get(index);
      if (child instanceof Y.XmlElement || child instanceof Y.XmlText) {
        clones.push(child.clone());
      }
    }
    target.transact(() => {
      if (to.length > 0) to.delete(0, to.length);
      if (clones.length > 0) to.insert(0, clones);
    });
  } finally {
    source.destroy();
  }
}

export function openSession(
  documentId: string,
  bootstrap: CollabBootstrap,
  initialState?: string | null,
): CollabSession {
  ensureYjsAttributes();
  const existing = sessions.get(documentId);
  if (existing) {
    existing.name = bootstrap.name;
    existing.image = bootstrap.image ?? null;
    if (existing.token !== bootstrap.token) {
      existing.token = bootstrap.token;
      if (existing.provider) {
        existing.provider.configuration.token = bootstrap.token;
      }
    }
    return existing;
  }

  const ydoc = new Y.Doc();
  if (initialState) {
    try {
      Y.applyUpdate(ydoc, bytesFromBase64(initialState));
    } catch {
      // A bad snapshot still leaves the live session able to load the note.
    }
  }
  const provider = bootstrap.token
    ? new Provider({
        url: hocuspocusUrl,
        name: documentId,
        document: ydoc,
        token: bootstrap.token,
        onAuthenticationFailed: () => {},
      })
    : null;

  const session: CollabSession = { ydoc, provider, ...bootstrap };
  sessions.set(documentId, session);
  return session;
}

export async function refreshCollabToken(documentId: string, session: CollabSession) {
  const response = await fetch("/api/collab/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentId }),
  });
  if (!response.ok) return false;
  const body = (await response.json()) as { token?: string };
  if (!body.token || !session.provider) return false;
  session.token = body.token;
  session.provider.configuration.token = body.token;
  return true;
}