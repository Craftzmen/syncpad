import type { Editor } from "@tiptap/core";
import { ySyncPluginKey } from "@tiptap/y-tiptap";
import { ProsemirrorBinding, updateYFragment } from "@tiptap/y-tiptap";
import type { Node } from "@tiptap/pm/model";
import * as Y from "yjs";

const patched = Symbol.for("syncpad.prosemirrorBinding");

type PatchedBinding = ProsemirrorBinding & { [patched]?: boolean };

/**
 * The collaboration binding writes the editor into the shared document, then
 * reads the caret back. If that read throws, the error escapes the editor
 * update and the note never leaves the page. Keep the document write.
 */
export function patchProsemirrorBinding(binding?: ProsemirrorBinding) {
  const proto = (
    binding ? Object.getPrototypeOf(binding) : ProsemirrorBinding.prototype
  ) as PatchedBinding;
  if (proto[patched]) return;
  const original = proto._prosemirrorChanged;
  proto._prosemirrorChanged = function (this: ProsemirrorBinding, doc: Node) {
    try {
      original.call(this, doc);
    } catch {
      try {
        writeFragment(this.doc, this.type, doc, this);
      } catch (error) {
        console.error("Could not save the document", error);
      }
    }
  };
  proto[patched] = true;
}

let attributesPatched = false;

/** Yjs only stores plain attribute values. Anything else aborts the whole save. */
export function ensureYjsAttributes() {
  if (attributesPatched) return;
  attributesPatched = true;
  const proto = Y.XmlElement.prototype as unknown as {
    setAttribute: (name: string, value: unknown) => void;
  };
  const original = proto.setAttribute;
  proto.setAttribute = function (this: Y.XmlElement, name: string, value: unknown) {
    original.call(this, name, coerceAttribute(value));
  };
}

function coerceAttribute(value: unknown): unknown {
  if (value == null) return value;
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return value;
  }
  if (value instanceof Uint8Array || value instanceof Date) return value;
  if (Array.isArray(value)) return value.map((item) => coerceAttribute(item));
  if (typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype === Object.prototype || prototype === null) {
      const plain: Record<string, unknown> = {};
      for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
        const next = coerceAttribute(item);
        if (next !== undefined) plain[key] = next;
      }
      return plain;
    }
    try {
      return coerceAttribute(JSON.parse(JSON.stringify(value)));
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function sameBytes(left: Uint8Array, right: Uint8Array) {
  if (left.byteLength !== right.byteLength) return false;
  for (let index = 0; index < left.byteLength; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

function writeFragment(
  ydoc: Y.Doc,
  fragment: Y.XmlFragment,
  doc: Node,
  meta: Parameters<typeof updateYFragment>[3],
) {
  ydoc.transact((transaction) => {
    transaction.meta.set("addToHistory", true);
    updateYFragment(ydoc, fragment, doc, meta);
  }, ySyncPluginKey);
}

function nestedTextLength(node: Y.XmlFragment | Y.XmlElement) {
  let total = 0;
  node.toArray().forEach((child) => {
    if (child instanceof Y.XmlText) total += child.length;
    else if (child instanceof Y.XmlElement) total += nestedTextLength(child);
  });
  return total;
}

/** The open editor has blocks or text that are not in the shared document yet. */
export function localChangesMissing(editor: Editor, ydoc: Y.Doc) {
  const fragment = ydoc.getXmlFragment("default");
  const localBlocks = editor.state.doc.childCount;
  if (localBlocks > fragment.length) return true;
  if (localBlocks < fragment.length) return false;
  return editor.state.doc.textContent.length > nestedTextLength(fragment);
}

/** Copies the open note into the shared document. Returns true when the document changed. */
export function pushEditorToYjs(editor: Editor, ydoc: Y.Doc) {
  if (editor.isDestroyed) return false;
  ensureYjsAttributes();
  const fragment = ydoc.getXmlFragment("default");
  const binding = ySyncPluginKey.getState(editor.state)?.binding;
  if (binding) patchProsemirrorBinding(binding);
  const meta = (binding ?? {
    mapping: new Map(),
    isOMark: new Map(),
  }) as Parameters<typeof updateYFragment>[3];
  const doc = editor.state.doc;
  const before = Y.encodeStateVector(ydoc);
  const write = () => writeFragment(ydoc, fragment, doc, meta);
  try {
    if (binding) binding.mux(write);
    else write();
  } catch {
    binding?.mapping.clear();
    try {
      if (binding) binding.mux(write);
      else write();
    } catch (retryError) {
      console.error("Could not save the document", retryError);
      return false;
    }
  }
  return !sameBytes(before, Y.encodeStateVector(ydoc));
}

export function patchLiveBinding(editor: Editor) {
  ensureYjsAttributes();
  const binding = ySyncPluginKey.getState(editor.state)?.binding;
  if (binding) patchProsemirrorBinding(binding);
}

patchProsemirrorBinding();
ensureYjsAttributes();
