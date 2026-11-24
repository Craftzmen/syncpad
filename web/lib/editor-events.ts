export type InsertKind =
  | "text"
  | "h1"
  | "h2"
  | "bullet"
  | "todo"
  | "quote"
  | "divider"
  | "code"
  | "toggle"
  | "callout"
  | "table"
  | "mermaid"
  | "toc";

let pendingInsert: InsertKind | null = null;

export function requestInsert(kind: InsertKind) {
  pendingInsert = kind;
  window.dispatchEvent(new CustomEvent("syncpad:insert", { detail: kind }));
}

export function consumePendingInsert() {
  const kind = pendingInsert;
  pendingInsert = null;
  return kind;
}

export function emitEditorEmpty(empty: boolean) {
  window.dispatchEvent(new CustomEvent("syncpad:empty", { detail: empty }));
}

export function requestTitleEnter() {
  window.dispatchEvent(new CustomEvent("syncpad:title-enter"));
}

export function requestClearTitle() {
  window.dispatchEvent(new CustomEvent("syncpad:clear-title"));
}