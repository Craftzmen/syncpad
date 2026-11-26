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

let pageTitle = "";

export function publishPageTitle(title: string) {
  pageTitle = title;
}

export function readPageTitle() {
  return pageTitle;
}

type PendingText = {
  resolve: (value: string | null) => void;
  timer: number;
};

let stateWait: PendingText | null = null;
let textWait: PendingText | null = null;

function ask(eventName: string, slot: "state" | "text") {
  return new Promise<string | null>((resolve) => {
    const current = slot === "state" ? stateWait : textWait;
    if (current) {
      window.clearTimeout(current.timer);
      current.resolve(null);
    }
    const pending: PendingText = {
      resolve,
      timer: window.setTimeout(() => {
        if (slot === "state") stateWait = null;
        else textWait = null;
        resolve(null);
      }, 400),
    };
    if (slot === "state") stateWait = pending;
    else textWait = pending;
    window.dispatchEvent(new CustomEvent(eventName));
  });
}

export function requestDocumentState() {
  return ask("syncpad:request-document-state", "state");
}

export function deliverDocumentState(state: string | null) {
  if (!stateWait) return;
  window.clearTimeout(stateWait.timer);
  const resolve = stateWait.resolve;
  stateWait = null;
  resolve(state);
}

export function requestPageText() {
  return ask("syncpad:request-page-text", "text");
}

export function deliverPageText(text: string | null) {
  if (!textWait) return;
  window.clearTimeout(textWait.timer);
  const resolve = textWait.resolve;
  textWait = null;
  resolve(text);
}

export function requestRestoreState(state: string) {
  window.dispatchEvent(new CustomEvent("syncpad:restore-state", { detail: state }));
}