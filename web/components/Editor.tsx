"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Editor as TiptapEditor } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import { GapCursor } from "@tiptap/pm/gapcursor";
import { NodeSelection, TextSelection, type Transaction } from "@tiptap/pm/state";
import { BubbleMenu } from "@tiptap/react/menus";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { Mathematics } from "@tiptap/extension-mathematics";
import Placeholder from "@tiptap/extension-placeholder";
import { Table, TableRow } from "@tiptap/extension-table";
import { TaskList } from "@tiptap/extension-task-list";
import Underline from "@tiptap/extension-underline";
import Youtube from "@tiptap/extension-youtube";
import { ySyncPluginKey } from "@tiptap/y-tiptap";
import StarterKit from "@tiptap/starter-kit";
import "katex/dist/katex.min.css";

import {
  Bookmark,
  Callout,
  ImagePaste,
  insertMermaid,
  Mermaid,
  SyncCodeBlock,
  TableOfContents,
  ToggleBlock,
  Video,
} from "@/components/editor/blocks";
import { createSlashExtension } from "@/components/editor/slash-extension";
import { SelectionWash } from "@/components/editor/SelectionWash";
import { TableMenu } from "@/components/editor/TableMenu";
import { NotionTaskItem } from "@/components/editor/task-item";
import { NotionTableCell, NotionTableHeader } from "@/components/editor/table-nodes";
import { FormatMenu } from "@/components/editor/format-menu";
import { askText, EditorDialogs } from "@/components/editor/editor-prompt";
import { PresenceAvatars } from "@/components/PresenceAvatars";
import { SlashMenu } from "@/components/SlashMenu";
import {
  consumePendingInsert,
  emitEditorEmpty,
  type InsertKind,
} from "@/lib/editor-events";
import type { CollabRole } from "@/lib/collab-token";
import { EditorBodySkeleton } from "@/components/page-skeletons";
import { openSession, refreshCollabToken, type CollabSession } from "@/lib/collaboration";
import { localChangesMissing, patchLiveBinding, pushEditorToYjs } from "@/lib/sync-editor";
import { colorFromId } from "@/lib/user-color";
import type { SlashCommandItem } from "@/components/editor/slash-extension";

type InnerProps = {
  docId: string;
  session: CollabSession;
};

function blockBesideCaret(
  state: TiptapEditor["state"],
  dir: -1 | 1,
): { from: number; to: number } | null {
  const { selection } = state;
  if (selection instanceof GapCursor) {
    if (dir > 0) return null;
    const $pos = selection.$from;
    const index = $pos.index();
    const siblingIndex = index - 1;
    if (siblingIndex < 0) return null;
    const sibling = $pos.parent.child(siblingIndex);
    if (sibling.isTextblock) return null;
    const from = $pos.pos - sibling.nodeSize;
    return { from, to: $pos.pos };
  }
  if (selection instanceof NodeSelection && !selection.node.isTextblock) {
    return { from: selection.from, to: selection.to };
  }
  if (!(selection instanceof TextSelection) || !selection.empty) return null;
  const { $from } = selection;
  if (!$from.parent.isTextblock || $from.depth < 1) return null;
  if (dir < 0 && $from.parentOffset !== 0) return null;
  if (dir > 0 && $from.parentOffset !== $from.parent.content.size) return null;
  if (dir > 0) return null;
  const parent = $from.node($from.depth - 1);
  const index = $from.index($from.depth - 1);
  const siblingIndex = index - 1;
  if (siblingIndex < 0) return null;
  const sibling = parent.child(siblingIndex);
  if (sibling.isTextblock) return null;
  const to = $from.before();
  return { from: to - sibling.nodeSize, to };
}

function emptyLineAboveContent(state: TiptapEditor["state"]) {
  const { selection } = state;
  if (!(selection instanceof TextSelection) || !selection.empty) return null;
  const { $from } = selection;
  if (!$from.parent.isTextblock || $from.parent.content.size !== 0 || $from.depth < 1) return null;
  if ($from.index($from.depth - 1) !== 0) return null;
  if ($from.node($from.depth - 1).childCount < 2) return null;
  const from = $from.before();
  return { from, to: from + $from.parent.nodeSize };
}

function focusPageTitle(view: TiptapEditor["view"]) {
  const input = view.dom.closest("article")?.querySelector("input");
  if (!(input instanceof HTMLInputElement)) return;
  input.focus();
  const end = input.value.length;
  input.setSelectionRange(end, end);
}

function focusTitleLine(editor: TiptapEditor) {
  if (!editor.isEditable) return;
  const { doc, schema } = editor.state;
  const paragraph = schema.nodes.paragraph;
  if (!paragraph) return;
  const first = doc.firstChild;
  const canType = first?.type.name === "paragraph" || first?.type.name === "heading";
  if (canType) {
    editor.view.dispatch(
      editor.state.tr.setSelection(TextSelection.create(doc, 1)).scrollIntoView(),
    );
  } else {
    const tr = editor.state.tr.insert(0, paragraph.create());
    tr.setSelection(TextSelection.create(tr.doc, 1));
    editor.view.dispatch(tr.scrollIntoView());
  }
  const active = document.activeElement;
  if (
    (active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement) &&
    editor.view.dom.contains(active)
  ) {
    active.blur();
  }
  editor.view.focus();
}

function applyInsert(editor: TiptapEditor, kind: InsertKind) {
  const chain = editor.chain().focus("start");
  if (kind === "h1") chain.setHeading({ level: 1 }).run();
  else if (kind === "h2") chain.setHeading({ level: 2 }).run();
  else if (kind === "bullet") chain.toggleBulletList().run();
  else if (kind === "todo") chain.toggleTaskList().run();
  else if (kind === "quote") chain.toggleBlockquote().run();
  else if (kind === "divider") chain.setHorizontalRule().run();
  else if (kind === "code") chain.toggleCodeBlock({ language: "javascript" }).run();
  else if (kind === "toggle") {
    chain
      .insertContent({
        type: "toggle",
        attrs: { open: true },
        content: [{ type: "paragraph" }, { type: "paragraph" }],
      })
      .run();
  } else if (kind === "callout") {
    chain
      .insertContent({
        type: "callout",
        attrs: { emoji: "💡" },
        content: [{ type: "paragraph" }],
      })
      .run();
  } else if (kind === "table") {
    chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  } else if (kind === "mermaid") {
    insertMermaid(editor);
  } else if (kind === "toc") chain.insertContent({ type: "toc" }).run();
  else chain.setParagraph().run();
}

function CollabEditor({ docId, session }: InnerProps) {
  const editorRef = useRef<TiptapEditor | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);
  const [formatTick, setFormatTick] = useState(0);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashItems, setSlashItems] = useState<SlashCommandItem[]>([]);
  const [slashPosition, setSlashPosition] = useState<{
    top: number;
    bottom: number;
    left: number;
  } | null>(null);
  const [slashQuery, setSlashQuery] = useState("");
  const [slashCommand, setSlashCommand] = useState<
    ((item: SlashCommandItem) => void) | null
  >(null);

  const role: CollabRole = session.role;
  const userName = session.name;
  const userColor = colorFromId(session.userId);

  const onSlashOpen = useCallback(
    (props: {
      clientRect?: (() => DOMRect | null) | null;
      items: SlashCommandItem[];
      query: string;
      command: (item: SlashCommandItem) => void;
    }) => {
      const rect = props.clientRect?.();
      if (rect) {
        setSlashPosition({ top: rect.top, bottom: rect.bottom, left: rect.left });
      }
      setSlashItems(props.items);
      setSlashQuery(props.query);
      setSlashCommand(() => props.command);
      setSlashOpen(true);
    },
    [],
  );

  const extensions = useMemo(() => {
    const editMath = (kind: "inline" | "block", latex: string, pos: number) => {
      const current = editorRef.current;
      if (!current) return;
      void askText({
        title: kind === "block" ? "Edit block equation" : "Edit inline equation",
        defaultValue: latex,
        multiline: true,
        preview: kind === "block" ? "block" : "inline",
        confirmLabel: "Update",
      }).then((next) => {
        if (!next) return;
        const editorNow = editorRef.current;
        if (!editorNow) return;
        if (kind === "inline") editorNow.commands.updateInlineMath({ latex: next, pos });
        else editorNow.commands.updateBlockMath({ latex: next, pos });
      });
    };

    return [
      StarterKit.configure({
        undoRedo: false,
        codeBlock: false,
        link: false,
        underline: false,
      }),
      SyncCodeBlock,
      TaskList,
      NotionTaskItem.configure({ nested: true }),
      Table.configure({
        resizable: true,
        cellMinWidth: 72,
        lastColumnResizable: true,
        handleWidth: 8,
      }),
      TableRow,
      NotionTableHeader,
      NotionTableCell,
      Image.configure({ allowBase64: true }),
      ImagePaste,
      Youtube.configure({ nocookie: true, width: 640, height: 360 }),
      Video,
      Bookmark,
      Callout,
      ToggleBlock,
      Mermaid,
      TableOfContents,
      Link.configure({ openOnClick: false, autolink: true }),
      Underline,
      Highlight,
      Mathematics.configure({
        katexOptions: { throwOnError: false },
        inlineOptions: {
          onClick: (node, pos) => editMath("inline", String(node.attrs.latex ?? ""), pos),
        },
        blockOptions: {
          onClick: (node, pos) => editMath("block", String(node.attrs.latex ?? ""), pos),
        },
      }),
      Collaboration.configure({ document: session.ydoc }),
      CollaborationCaret.configure({
        provider: session.provider,
        user: {
          id: session.userId,
          name: userName,
          color: userColor,
          image: session.image ?? undefined,
        },
      }),
      Placeholder.configure({
        placeholder: role === "edit" ? "Press '/' to insert blocks" : "View only",
      }),
      createSlashExtension(onSlashOpen, () => setSlashOpen(false)),
    ];
  }, [onSlashOpen, role, session.image, session.provider, session.userId, session.ydoc, userColor, userName]);

  const editor = useEditor(
    {
      immediatelyRender: true,
      editable: role === "edit",
      autofocus: role === "edit" ? "end" : false,
      extensions,
      editorProps: {
        attributes: {
          class:
            "tiptap notion-editor font-sans max-w-none focus:outline-none min-h-[8rem]",
        },
        handleKeyDown(view, event) {
          if (event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) return false;
          if (event.key === "Backspace") {
            const empty = emptyLineAboveContent(view.state);
            if (empty) {
              view.dispatch(view.state.tr.delete(empty.from, empty.to));
              focusPageTitle(view);
              return true;
            }
          }
          if (event.key === "Backspace" || event.key === "Delete") {
            const range = blockBesideCaret(view.state, event.key === "Backspace" ? -1 : 1);
            if (!range) return false;
            const tr = view.state.tr.delete(range.from, range.to);
            const paragraph = view.state.schema.nodes.paragraph;
            if (tr.doc.childCount === 0 && paragraph) tr.insert(0, paragraph.create());
            const pos = Math.max(1, Math.min(range.from, tr.doc.content.size));
            try {
              tr.setSelection(TextSelection.near(tr.doc.resolve(pos)));
            } catch {
              // The block is already gone.
            }
            view.dispatch(tr.scrollIntoView());
            return true;
          }
          if (event.key !== "Enter") return false;
          const { selection, schema } = view.state;
          const paragraph = schema.nodes.paragraph;
          if (!paragraph) return false;
          const at =
            selection instanceof GapCursor
              ? selection.from
              : selection instanceof NodeSelection && !selection.node.isTextblock
                ? selection.to
                : null;
          if (at == null) return false;
          const tr = view.state.tr.insert(at, paragraph.create());
          tr.setSelection(TextSelection.create(tr.doc, at + 1));
          view.dispatch(tr.scrollIntoView());
          return true;
        },
      },
    },
    [extensions, role],
  );
  editorRef.current = editor;

  useEffect(() => {
    setFrame(frameRef.current);
  }, []);

  useEffect(() => {
    editor?.commands.updateUser({
      id: session.userId,
      name: userName,
      color: userColor,
      image: session.image ?? undefined,
    });
  }, [editor, session.image, session.userId, userColor, userName]);

  useEffect(() => {
    if (!editor) return;
    const bump = () => setFormatTick((value) => value + 1);
    editor.on("selectionUpdate", bump);
    return () => {
      editor.off("selectionUpdate", bump);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const emit = () => emitEditorEmpty(editor.isEmpty);
    emit();
    editor.on("update", emit);
    return () => {
      editor.off("update", emit);
    };
  }, [editor]);

  useLayoutEffect(() => {
    if (!editor || role !== "edit") return;
    patchLiveBinding(editor);
    let syncTimer = 0;
    let edited = false;
    const save = () => {
      if (editor.isDestroyed) return;
      if (!pushEditorToYjs(editor, session.ydoc)) return;
      edited = true;
      window.clearTimeout(syncTimer);
      syncTimer = window.setTimeout(() => session.provider.forceSync(), 300);
    };
    const saveIfAhead = () => {
      if (!session.provider.synced || editor.isDestroyed) return;
      if (!localChangesMissing(editor, session.ydoc)) return;
      save();
    };
    saveIfAhead();
    session.provider.on("synced", saveIfAhead);
    const onUpdate = ({ transaction }: { transaction: Transaction }) => {
      if (!transaction.docChanged) return;
      const meta = transaction.getMeta(ySyncPluginKey) as { isChangeOrigin?: boolean } | undefined;
      if (meta?.isChangeOrigin) return;
      edited = true;
      save();
    };
    const flush = () => {
      if (!edited || editor.isDestroyed) return;
      if (pushEditorToYjs(editor, session.ydoc)) session.provider.forceSync();
    };
    editor.on("update", onUpdate);
    window.addEventListener("pagehide", flush);
    return () => {
      flush();
      session.provider.off("synced", saveIfAhead);
      editor.off("update", onUpdate);
      window.removeEventListener("pagehide", flush);
      window.clearTimeout(syncTimer);
    };
  }, [editor, role, session]);

  useEffect(() => {
    if (role !== "edit") return;
    let stopped = false;
    let retrying = false;
    const refresh = () => refreshCollabToken(docId, session);
    const onFail = () => {
      if (stopped || retrying) return;
      retrying = true;
      void refresh()
        .then((ok) => {
          if (stopped || !ok) return;
          session.provider.disconnect();
          void session.provider.connect();
        })
        .finally(() => {
          window.setTimeout(() => {
            retrying = false;
          }, 15000);
        });
    };
    session.provider.on("authenticationFailed", onFail);
    const interval = window.setInterval(() => {
      void refresh();
    }, 30 * 60 * 1000);
    return () => {
      stopped = true;
      session.provider.off("authenticationFailed", onFail);
      window.clearInterval(interval);
    };
  }, [docId, role, session]);

  useEffect(() => {
    if (!editor || role !== "edit") return;
    const onInsert = (event: Event) => {
      consumePendingInsert();
      applyInsert(editor, (event as CustomEvent<InsertKind>).detail);
    };
    const queued = consumePendingInsert();
    if (queued) applyInsert(editor, queued);
    const onTitleEnter = () => focusTitleLine(editor);
    window.addEventListener("syncpad:insert", onInsert);
    window.addEventListener("syncpad:title-enter", onTitleEnter);
    return () => {
      window.removeEventListener("syncpad:insert", onInsert);
      window.removeEventListener("syncpad:title-enter", onTitleEnter);
    };
  }, [editor, role]);

  return (
    <>
      <SlashMenu
        open={slashOpen}
        position={slashPosition}
        items={slashItems}
        query={slashQuery}
        onClose={() => setSlashOpen(false)}
        onSelect={(item) => {
          slashCommand?.(item);
          setSlashOpen(false);
        }}
      />
      <PresenceAvatars provider={session.provider} />
      <div className="relative w-full text-left" ref={frameRef}>
        {editor && role === "edit" ? (
          <BubbleMenu editor={editor} data-tick={formatTick}>
            <FormatMenu editor={editor} />
          </BubbleMenu>
        ) : null}
        {editor && role === "edit" ? <TableMenu editor={editor} frame={frame} /> : null}
        <EditorContent editor={editor} />
        {editor ? <SelectionWash editor={editor} frame={frame} /> : null}
      </div>
    </>
  );
}

export default function Editor({
  docId,
  token,
  role,
  userId,
  name,
  image = null,
  initialState = null,
}: {
  docId: string;
  token: string;
  role: CollabRole;
  userId: string;
  name: string;
  image?: string | null;
  initialState?: string | null;
}) {
  const [session, setSession] = useState<CollabSession | null>(null);

  useLayoutEffect(() => {
    setSession(openSession(docId, { token, role, userId, name, image }, initialState));
  }, [docId, token, role, userId, name, image, initialState]);

  if (!session) {
    return <EditorBodySkeleton />;
  }

  return <CollabEditor key={docId} docId={docId} session={session} />;
}
