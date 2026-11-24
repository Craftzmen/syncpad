"use client";

import type { Editor } from "@tiptap/core";
import {
  Bold,
  Code,
  Highlighter,
  Italic,
  Link,
  Strikethrough,
  Underline,
} from "lucide-react";

import { askText } from "@/components/editor/editor-prompt";
import { Toggle } from "@/components/ui/toggle";

const TURN_INTO = [
  { value: "text", label: "Text" },
  { value: "h1", label: "Heading 1" },
  { value: "h2", label: "Heading 2" },
  { value: "h3", label: "Heading 3" },
  { value: "bullet", label: "Bulleted list" },
  { value: "ordered", label: "Numbered list" },
  { value: "quote", label: "Quote" },
  { value: "code", label: "Code" },
  { value: "callout", label: "Callout" },
] as const;

function currentBlock(editor: Editor) {
  if (editor.isActive("codeBlock")) return "code";
  if (editor.isActive("callout")) return "callout";
  if (editor.isActive("blockquote")) return "quote";
  if (editor.isActive("bulletList")) return "bullet";
  if (editor.isActive("orderedList")) return "ordered";
  if (editor.isActive("heading", { level: 1 })) return "h1";
  if (editor.isActive("heading", { level: 2 })) return "h2";
  if (editor.isActive("heading", { level: 3 })) return "h3";
  return "text";
}

function turnInto(editor: Editor, value: string) {
  const chain = editor.chain().focus();
  if (value === "text") {
    if (editor.isActive("bulletList")) chain.toggleBulletList();
    if (editor.isActive("orderedList")) chain.toggleOrderedList();
    if (editor.isActive("taskList")) chain.toggleTaskList();
    if (editor.isActive("blockquote")) chain.toggleBlockquote();
    if (editor.isActive("codeBlock")) chain.toggleCodeBlock();
    chain.setParagraph().run();
    return;
  }
  if (value === "h1" || value === "h2" || value === "h3") {
    const level = value === "h1" ? 1 : value === "h2" ? 2 : 3;
    chain.setHeading({ level }).run();
    return;
  }
  if (value === "bullet") {
    chain.toggleBulletList().run();
    return;
  }
  if (value === "ordered") {
    chain.toggleOrderedList().run();
    return;
  }
  if (value === "quote") {
    chain.toggleBlockquote().run();
    return;
  }
  if (value === "code") {
    chain.toggleCodeBlock({ language: "javascript" }).run();
    return;
  }
  const text = editor.state.doc.textBetween(
    editor.state.selection.from,
    editor.state.selection.to,
    " ",
  );
  chain
    .insertContent({
      type: "callout",
      attrs: { emoji: "💡" },
      content: [
        {
          type: "paragraph",
          content: text ? [{ type: "text", text }] : [],
        },
      ],
    })
    .run();
}

function setLink(editor: Editor) {
  const previous = String(editor.getAttributes("link").href || "");
  const editing = editor.isActive("link") && previous;
  void askText({
    title: editing ? "Edit link" : "Add a link",
    defaultValue: previous || "https://",
    placeholder: "https://",
    confirmLabel: editing ? "Update" : "Add link",
    allowEmpty: Boolean(editing),
  }).then((next) => {
    if (next == null) return;
    if (!next.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: next.trim() }).run();
  });
}

export function FormatMenu({ editor }: { editor: Editor }) {
  return (
    <div className="flex max-w-[calc(100vw-24px)] flex-wrap items-center gap-0.5 rounded-lg border border-black/10 bg-white p-1 text-[#37352f] shadow-[0_8px_28px_rgba(0,0,0,0.12)]">
      <Toggle
        size="sm"
        pressed={editor.isActive("bold")}
        onPressedChange={() => editor.chain().focus().toggleBold().run()}
        aria-label="Bold"
      >
        <Bold className="size-3.5" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("italic")}
        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
        aria-label="Italic"
      >
        <Italic className="size-3.5" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("underline")}
        onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
        aria-label="Underline"
      >
        <Underline className="size-3.5" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("strike")}
        onPressedChange={() => editor.chain().focus().toggleStrike().run()}
        aria-label="Strikethrough"
      >
        <Strikethrough className="size-3.5" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("code")}
        onPressedChange={() => editor.chain().focus().toggleCode().run()}
        aria-label="Inline code"
      >
        <Code className="size-3.5" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("link")}
        onPressedChange={() => setLink(editor)}
        aria-label="Link"
      >
        <Link className="size-3.5" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("highlight")}
        onPressedChange={() => editor.chain().focus().toggleHighlight().run()}
        aria-label="Highlight"
      >
        <Highlighter className="size-3.5" />
      </Toggle>
      <span className="mx-0.5 h-4 w-px bg-black/10" />
      <select
        aria-label="Turn into"
        className="h-7 rounded-md bg-transparent px-1 text-xs text-[#37352f]/80 outline-none hover:bg-[#f1f1ef]"
        value={currentBlock(editor)}
        onChange={(event) => turnInto(editor, event.target.value)}
      >
        {TURN_INTO.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
