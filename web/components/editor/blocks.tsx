"use client";

import { Extension, mergeAttributes, Node, type Editor } from "@tiptap/core";
import { Plugin, TextSelection, type EditorState, type Transaction } from "@tiptap/pm/state";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type ReactNodeViewProps,
} from "@tiptap/react";
import { common, createLowlight } from "lowlight";
import { Check, ChevronRight, Copy } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import { cn } from "@/lib/utils";

export const lowlight = createLowlight(common);

const CODE_LANGUAGES = [
  ["plaintext", "Plain text"],
  ["javascript", "JavaScript"],
  ["typescript", "TypeScript"],
  ["python", "Python"],
  ["json", "JSON"],
  ["bash", "Bash"],
  ["html", "HTML"],
  ["css", "CSS"],
  ["sql", "SQL"],
  ["markdown", "Markdown"],
  ["go", "Go"],
  ["rust", "Rust"],
  ["java", "Java"],
  ["yaml", "YAML"],
  ["c", "C"],
  ["cpp", "C++"],
  ["xml", "XML"],
  ["ruby", "Ruby"],
  ["php", "PHP"],
  ["swift", "Swift"],
  ["kotlin", "Kotlin"],
] as const;

function languageLabel(id: string) {
  return CODE_LANGUAGES.find(([value]) => value === id)?.[1] ?? id;
}

export const DEFAULT_MERMAID = "graph TD\n  A[Start] --> B[Done]";

let mermaidInsertLock = false;

export function insertMermaid(
  editor: Editor,
  range?: { from: number; to: number },
) {
  if (mermaidInsertLock || !editor.isEditable) return;
  const type = editor.schema.nodes.mermaid;
  if (!type) return;
  mermaidInsertLock = true;
  try {
    const node = type.create({ source: DEFAULT_MERMAID });
    const tr = editor.state.tr;
    if (range) tr.delete(range.from, range.to);
    const $from = tr.doc.resolve(Math.max(0, Math.min(tr.selection.from, tr.doc.content.size)));
    if ($from.parent.isTextblock && $from.parent.content.size === 0 && $from.depth >= 1) {
      tr.replaceWith($from.before(), $from.after(), node);
    } else if ($from.depth >= 1) {
      tr.insert($from.after(1), node);
    } else {
      tr.insert($from.pos, node);
    }
    editor.view.dispatch(tr.scrollIntoView());
  } finally {
    queueMicrotask(() => {
      mermaidInsertLock = false;
    });
  }
}

function collapseDuplicateMermaids(
  transactions: readonly Transaction[],
  oldState: EditorState,
  newState: EditorState,
) {
  if (
    transactions.some((tr) => {
      const meta = tr.getMeta("y-sync$") as { isChangeOrigin?: boolean } | undefined;
      return Boolean(meta?.isChangeOrigin);
    })
  ) {
    return null;
  }
  if (!transactions.some((tr) => tr.docChanged)) return null;
  const before = new Map<string, number>();
  oldState.doc.forEach((node) => {
    if (node.type.name !== "mermaid") return;
    const source = String(node.attrs.source ?? "");
    before.set(source, (before.get(source) ?? 0) + 1);
  });
  const grouped = new Map<string, { pos: number; size: number }[]>();
  newState.doc.forEach((node, pos) => {
    if (node.type.name !== "mermaid") return;
    const source = String(node.attrs.source ?? "");
    const list = grouped.get(source) ?? [];
    list.push({ pos, size: node.nodeSize });
    grouped.set(source, list);
  });
  const remove: { pos: number; size: number }[] = [];
  for (const [source, items] of grouped) {
    const extra = items.length - (before.get(source) ?? 0);
    if (extra < 2) continue;
    remove.push(...items.slice(items.length - (extra - 1)));
  }
  if (remove.length === 0) return null;
  const tr = newState.tr;
  for (const item of [...remove].sort((a, b) => b.pos - a.pos)) {
    tr.delete(item.pos, item.pos + item.size);
  }
  return tr;
}

const CALLOUT_EMOJIS = ["💡", "⚠️", "✅", "❗", "📝", "🔥"];

function stopInteractiveEvent({ event }: { event: Event }) {
  const target = event.target;
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest("textarea, select, input, button, a"));
}

function CodeBlockView({ node, updateAttributes }: ReactNodeViewProps) {
  const language = (node.attrs.language as string | null) || "plaintext";
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => searchRef.current?.focus());
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || !menuRef.current?.contains(target)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const languages = CODE_LANGUAGES.filter(([id, label]) => {
    const needle = query.trim().toLowerCase();
    return !needle || label.toLowerCase().includes(needle) || id.includes(needle);
  });

  const chip: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    height: 24,
    margin: 0,
    border: 0,
    borderRadius: 6,
    color: "rgba(55, 53, 47, 0.62)",
    fontFamily: "inherit",
    fontSize: 12,
    fontWeight: 500,
    lineHeight: 1,
    padding: "0 8px",
    whiteSpace: "nowrap",
  };

  return (
    <NodeViewWrapper className="code-block" style={{ position: "relative", display: "block", whiteSpace: "normal" }}>
      <div
        className="code-toolbar"
        contentEditable={false}
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          zIndex: 2,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 2,
          whiteSpace: "nowrap",
        }}
      >
        <button
          type="button"
          className="code-copy"
          aria-label={copied ? "Copied" : "Copy code"}
          title={copied ? "Copied" : "Copy"}
          style={{ ...chip, width: 24, padding: 0, opacity: copied ? 1 : undefined }}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            void navigator.clipboard.writeText(node.textContent).then(
              () => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1200);
              },
              () => undefined,
            );
          }}
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </button>
        <div className="code-lang-wrap" ref={menuRef} style={{ position: "relative" }}>
          <button
            type="button"
            className="code-lang"
            aria-haspopup="listbox"
            aria-expanded={open}
            style={chip}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setOpen((current) => !current);
              setQuery("");
            }}
          >
            {languageLabel(language)}
          </button>
          {open ? (
            <div
              className="code-lang-menu"
              role="listbox"
              aria-label="Code language"
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                right: 0,
                zIndex: 30,
                display: "flex",
                width: 220,
                maxHeight: 280,
                flexDirection: "column",
                overflow: "hidden",
                border: "1px solid rgba(0, 0, 0, 0.08)",
                borderRadius: 10,
                background: "#fff",
                padding: 6,
                boxShadow: "0 8px 28px rgba(15, 15, 15, 0.12)",
                whiteSpace: "normal",
              }}
            >
              <input
                ref={searchRef}
                value={query}
                placeholder="Search languages"
                aria-label="Search languages"
                style={{
                  height: 30,
                  width: "100%",
                  flex: "none",
                  border: 0,
                  borderRadius: 6,
                  background: "rgba(55, 53, 47, 0.06)",
                  padding: "0 8px",
                  color: "#37352f",
                  fontSize: 13,
                  outline: "none",
                }}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" || !languages[0]) return;
                  event.preventDefault();
                  updateAttributes({ language: languages[0][0] });
                  setOpen(false);
                }}
              />
              <div className="code-lang-list">
                {languages.length === 0 ? (
                  <p className="code-lang-empty">No matches</p>
                ) : (
                  languages.map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      role="option"
                      aria-selected={id === language}
                      className={id === language ? "is-active" : undefined}
                      style={{
                        display: "flex",
                        width: "100%",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        border: 0,
                        borderRadius: 6,
                        padding: "6px 8px",
                        color: "#37352f",
                        fontSize: 13,
                        textAlign: "left",
                        whiteSpace: "nowrap",
                      }}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        updateAttributes({ language: id });
                        setOpen(false);
                      }}
                    >
                      <span>{label}</span>
                      {id === language ? <Check className="size-3.5" /> : null}
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <pre>
        <NodeViewContent className="code-content" />
      </pre>
    </NodeViewWrapper>
  );
}

export const SyncCodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView, {
      stopEvent: stopInteractiveEvent,
    });
  },
}).configure({
  lowlight,
  defaultLanguage: "plaintext",
});

function CalloutView({ node, updateAttributes }: ReactNodeViewProps) {
  const emoji = (node.attrs.emoji as string) || "💡";
  return (
    <NodeViewWrapper className="callout" data-callout="">
      <button
        type="button"
        className="callout-emoji"
        contentEditable={false}
        aria-label="Change callout icon"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          const index = CALLOUT_EMOJIS.indexOf(emoji);
          const next = CALLOUT_EMOJIS[(index + 1) % CALLOUT_EMOJIS.length] ?? "💡";
          updateAttributes({ emoji: next });
        }}
      >
        {emoji}
      </button>
      <NodeViewContent className="callout-body" />
    </NodeViewWrapper>
  );
}

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      emoji: { default: "💡" },
    };
  },

  parseHTML() {
    return [{ tag: "aside[data-callout]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "aside",
      mergeAttributes(HTMLAttributes, { "data-callout": "" }),
      ["div", 0],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutView, {
      stopEvent: stopInteractiveEvent,
    });
  },
});

function ToggleView({ node, updateAttributes }: ReactNodeViewProps) {
  const open = node.attrs.open !== false;
  return (
    <NodeViewWrapper
      className={cn("toggle-block", open && "is-open")}
      data-toggle=""
      data-open={open ? "true" : "false"}
    >
      <button
        type="button"
        className="toggle-chevron"
        contentEditable={false}
        aria-label={open ? "Collapse toggle" : "Expand toggle"}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => updateAttributes({ open: !open })}
      >
        <ChevronRight className={cn("size-4", open && "rotate-90")} />
      </button>
      <NodeViewContent className="toggle-body" />
    </NodeViewWrapper>
  );
}

export const ToggleBlock = Node.create({
  name: "toggle",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      open: {
        default: true,
        parseHTML: (element) => element.getAttribute("data-open") !== "false",
        renderHTML: (attributes) => ({
          "data-open": attributes.open ? "true" : "false",
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-toggle]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-toggle": "" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ToggleView, {
      stopEvent: stopInteractiveEvent,
    });
  },
});

function hostOf(href: string) {
  try {
    return new URL(href).host;
  } catch {
    return href;
  }
}

function BookmarkView({ node }: ReactNodeViewProps) {
  const href = String(node.attrs.href || "");
  const title = String(node.attrs.title || hostOf(href) || "Bookmark");
  return (
    <NodeViewWrapper className="bookmark-block" data-bookmark="">
      <a href={href} target="_blank" rel="noreferrer">
        <span className="bookmark-title">{title}</span>
        <span className="bookmark-host">{hostOf(href)}</span>
      </a>
    </NodeViewWrapper>
  );
}

export const Bookmark = Node.create({
  name: "bookmark",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      href: { default: "" },
      title: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-bookmark]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-bookmark": "" }),
      [
        "a",
        { href: HTMLAttributes.href, target: "_blank", rel: "noreferrer" },
        HTMLAttributes.title || HTMLAttributes.href,
      ],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(BookmarkView, {
      stopEvent: stopInteractiveEvent,
    });
  },
});

function videoEmbed(src: string) {
  const vimeo = src.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) {
    return { kind: "iframe" as const, src: `https://player.vimeo.com/video/${vimeo[1]}` };
  }
  return { kind: "file" as const, src };
}

function VideoView({ node }: ReactNodeViewProps) {
  const src = String(node.attrs.src || "");
  const embed = videoEmbed(src);
  return (
    <NodeViewWrapper className="video-block" data-video="">
      {embed.kind === "iframe" ? (
        <iframe
          src={embed.src}
          title="Video"
          allow="fullscreen; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <video src={embed.src} controls />
      )}
    </NodeViewWrapper>
  );
}

export const Video = Node.create({
  name: "video",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      src: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-video]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-video": "", "data-src": HTMLAttributes.src })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoView);
  },
});

function MermaidView({ node, updateAttributes, editor, getPos }: ReactNodeViewProps) {
  const source = String(node.attrs.source ?? DEFAULT_MERMAID);
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const handle = window.setTimeout(() => {
      void (async () => {
        const id = `syncpad-mermaid-${Math.random().toString(36).slice(2, 10)}`;
        const host = document.createElement("div");
        host.style.cssText =
          "position:fixed;left:-10000px;top:0;visibility:hidden;pointer-events:none;";
        document.body.appendChild(host);
        try {
          const mermaid = (await import("mermaid")).default;
          mermaid.initialize({
            startOnLoad: false,
            securityLevel: "strict",
            theme: "default",
            fontFamily: "inherit",
            flowchart: { useMaxWidth: false, htmlLabels: true },
          });
          const rendered = await mermaid.render(id, source.trim() || DEFAULT_MERMAID, host);
          if (!cancelled) {
            setSvg(rendered.svg);
            setError("");
          }
        } catch (err) {
          document.getElementById(id)?.remove();
          if (!cancelled) {
            setSvg("");
            setError(err instanceof Error ? err.message : "Could not render diagram");
          }
        } finally {
          host.remove();
        }
      })();
    }, 160);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [source]);

  function leave(where: "before" | "after") {
    const pos = getPos();
    const paragraph = editor.schema.nodes.paragraph;
    if (pos == null || !paragraph) return;
    const at = where === "before" ? pos : pos + node.nodeSize;
    const tr = editor.state.tr.insert(at, paragraph.create());
    tr.setSelection(TextSelection.create(tr.doc, at + 1));
    editor.view.dispatch(tr.scrollIntoView());
    editor.view.focus();
  }

  return (
    <NodeViewWrapper
      className="mermaid-block"
      contentEditable={false}
      style={{ display: "block", width: "100%" }}
    >
      <textarea
        spellCheck={false}
        aria-label="Mermaid source"
        value={source}
        onChange={(event) => updateAttributes({ source: event.target.value })}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
          if (!event.metaKey && !event.ctrlKey) return;
          event.preventDefault();
          leave("after");
        }}
      />
      {error ? <p className="mermaid-error">{error}</p> : null}
      {svg ? (
        <div className="mermaid-preview" dangerouslySetInnerHTML={{ __html: svg }} />
      ) : null}
    </NodeViewWrapper>
  );
}

export const Mermaid = Node.create({
  name: "mermaid",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      source: { default: DEFAULT_MERMAID },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-mermaid]",
        getAttrs: (element) => {
          if (!(element instanceof HTMLElement)) return false;
          return { source: element.getAttribute("data-source") || DEFAULT_MERMAID };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-mermaid": "",
        "data-source": node.attrs.source,
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidView, {
      stopEvent: stopInteractiveEvent,
    });
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction(transactions, oldState, newState) {
          return collapseDuplicateMermaids(transactions, oldState, newState);
        },
      }),
    ];
  },
});

type TocItem = { level: number; text: string; pos: number };

function sameToc(left: TocItem[], right: TocItem[]) {
  if (left.length !== right.length) return false;
  return left.every(
    (item, index) =>
      item.pos === right[index]?.pos &&
      item.text === right[index]?.text &&
      item.level === right[index]?.level,
  );
}

function collectHeadings(editor: Editor): TocItem[] {
  const items: TocItem[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "heading") {
      items.push({
        level: Number(node.attrs.level) || 1,
        text: node.textContent,
        pos,
      });
    }
  });
  return items;
}

function TocView({ editor }: ReactNodeViewProps) {
  const [items, setItems] = useState<TocItem[]>(() => collectHeadings(editor));

  useEffect(() => {
    const sync = () => {
      const next = collectHeadings(editor);
      setItems((current) => (sameToc(current, next) ? current : next));
    };
    sync();
    editor.on("update", sync);
    return () => {
      editor.off("update", sync);
    };
  }, [editor]);

  return (
    <NodeViewWrapper className="toc-block" data-toc="" contentEditable={false}>
      <p className="toc-label">On this page</p>
      {items.length === 0 ? (
        <p className="toc-empty">Add a heading to fill this list.</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.pos} style={{ paddingLeft: (item.level - 1) * 12 }}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  editor.chain().focus().setTextSelection(item.pos + 1).run();
                  const dom = editor.view.nodeDOM(item.pos);
                  if (dom instanceof HTMLElement) {
                    dom.scrollIntoView({ block: "center" });
                  }
                }}
              >
                {item.text || "Untitled"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </NodeViewWrapper>
  );
}

function imageFromClipboard(data: DataTransfer | null) {
  if (!data) return null;
  const file = Array.from(data.files).find((item) => item.type.startsWith("image/"));
  if (file) return file;
  for (const item of Array.from(data.items)) {
    if (item.kind === "file" && item.type.startsWith("image/")) return item.getAsFile();
  }
  return null;
}

export const ImagePaste = Extension.create({
  name: "imagePaste",
  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        props: {
          handlePaste(_view, event) {
            const file = imageFromClipboard(event.clipboardData);
            if (!file) return false;
            const reader = new FileReader();
            reader.onload = () => {
              const src = String(reader.result || "");
              if (src) editor.chain().focus().setImage({ src }).run();
            };
            reader.readAsDataURL(file);
            return true;
          },
        },
      }),
    ];
  },
});

export const TableOfContents = Node.create({
  name: "toc",
  group: "block",
  atom: true,

  parseHTML() {
    return [{ tag: "nav[data-toc]" }];
  },

  renderHTML() {
    return ["nav", { "data-toc": "" }];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TocView, {
      stopEvent: stopInteractiveEvent,
    });
  },
});
