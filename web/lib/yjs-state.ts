import * as Y from "yjs";

function bytesFromBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const size = 0x8000;
  for (let index = 0; index < bytes.length; index += size) {
    binary += String.fromCharCode(...bytes.subarray(index, index + size));
  }
  return btoa(binary);
}

/** Keeps edits from the open page and from the collaboration server together. */
export function mergeYjsStates(existing: string | null, incoming: string) {
  const doc = new Y.Doc();
  try {
    if (existing) Y.applyUpdate(doc, bytesFromBase64(existing));
    Y.applyUpdate(doc, bytesFromBase64(incoming));
    return bytesToBase64(Y.encodeStateAsUpdate(doc));
  } finally {
    doc.destroy();
  }
}
