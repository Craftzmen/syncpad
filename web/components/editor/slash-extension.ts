import { Extension } from "@tiptap/core";
import type { Editor, JSONContent, Range } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";

import { insertMermaid } from "@/components/editor/blocks";
import { askImage, askText, askVideo } from "@/components/editor/editor-prompt";

export type SlashGroup = "Suggested" | "Basic blocks" | "Media" | "Advanced";

export type SlashCommandItem = {
  title: string;
  description?: string;
  group: SlashGroup;
  command: (editor: Editor, range: Range) => void;
};

let slashKeyHandler: ((event: KeyboardEvent) => boolean) | null = null;
let slashCommandLock = false;

export function setSlashKeyHandler(
  handler: ((event: KeyboardEvent) => boolean) | null,
) {
  slashKeyHandler = handler;
}

function placeContent(editor: Editor, range: Range, node: JSONContent, block: boolean) {
  if (!block) {
    editor.chain().focus().insertContentAt(range, node).run();
    return;
  }
  editor.chain().focus().deleteRange(range).run();
  const { $from } = editor.state.selection;
  if ($from.parent.type.name === "paragraph" && $from.parent.textContent.length === 0) {
    editor
      .chain()
      .focus()
      .insertContentAt({ from: $from.before(), to: $from.after() }, node)
      .run();
    return;
  }
  editor.chain().focus().insertContentAt($from.after(), node).run();
}

function blockContent(text = ""): { type: "paragraph"; content?: { type: "text"; text: string }[] } {
  return text
    ? { type: "paragraph", content: [{ type: "text", text }] }
    : { type: "paragraph" };
}

export const defaultSlashItems: SlashCommandItem[] = [
  {
    title: "Text",
    description: "Plain paragraph",
    group: "Suggested",
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setParagraph().run();
    },
  },
  {
    title: "To-do list",
    group: "Suggested",
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    title: "Heading 1",
    group: "Suggested",
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
    },
  },
  {
    title: "Bulleted list",
    group: "Suggested",
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: "Callout",
    group: "Suggested",
    command: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({ type: "callout", attrs: { emoji: "💡" }, content: [blockContent()] })
        .run();
    },
  },
  {
    title: "Heading 2",
    group: "Basic blocks",
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
    },
  },
  {
    title: "Heading 3",
    group: "Basic blocks",
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
    },
  },
  {
    title: "Numbered list",
    group: "Basic blocks",
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: "Toggle",
    group: "Basic blocks",
    command: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: "toggle",
          attrs: { open: true },
          content: [blockContent(), blockContent()],
        })
        .run();
    },
  },
  {
    title: "Quote",
    group: "Basic blocks",
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: "Divider",
    group: "Basic blocks",
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
  {
    title: "Code",
    group: "Basic blocks",
    command: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleCodeBlock({ language: "javascript" })
        .run();
    },
  },
  {
    title: "Image",
    group: "Media",
    command: (editor, range) => {
      void askImage().then((media) => {
        if (!media) return;
        placeContent(editor, range, { type: "image", attrs: { src: media.src } }, true);
      });
    },
  },
  {
    title: "Video",
    group: "Media",
    command: (editor, range) => {
      void askVideo().then((media) => {
        if (!media) return;
        placeContent(
          editor,
          range,
          {
            type: media.embed === "youtube" ? "youtube" : "video",
            attrs: { src: media.src },
          },
          true,
        );
      });
    },
  },
  {
    title: "Bookmark",
    group: "Media",
    command: (editor, range) => {
      void askText({
        title: "Add a bookmark",
        placeholder: "https://",
        confirmLabel: "Insert",
      }).then((href) => {
        if (!href) return;
        let title = href;
        try {
          title = new URL(href).host;
        } catch {
          title = href;
        }
        placeContent(editor, range, { type: "bookmark", attrs: { href, title } }, true);
      });
    },
  },
  {
    title: "Table",
    group: "Advanced",
    command: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run();
    },
  },
  {
    title: "Inline equation",
    group: "Advanced",
    command: (editor, range) => {
      void askText({
        title: "Inline equation",
        description: "Write the formula in LaTeX.",
        defaultValue: "E = mc^2",
        placeholder: "E = mc^2",
        multiline: true,
        preview: "inline",
        confirmLabel: "Insert",
      }).then((latex) => {
        if (!latex) return;
        placeContent(editor, range, { type: "inlineMath", attrs: { latex } }, false);
      });
    },
  },
  {
    title: "Block equation",
    group: "Advanced",
    command: (editor, range) => {
      void askText({
        title: "Block equation",
        description: "Write the formula in LaTeX. It is centered on its own line.",
        defaultValue: "\\sum_{i=1}^{n} x_i",
        placeholder: "\\sum_{i=1}^{n} x_i",
        multiline: true,
        preview: "block",
        confirmLabel: "Insert",
      }).then((latex) => {
        if (!latex) return;
        placeContent(editor, range, { type: "blockMath", attrs: { latex } }, true);
      });
    },
  },
  {
    title: "Mermaid",
    group: "Advanced",
    command: (editor, range) => {
      insertMermaid(editor, range);
    },
  },
  {
    title: "Table of contents",
    group: "Advanced",
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).insertContent({ type: "toc" }).run();
    },
  },
];

export type SlashMenuProps = {
  items: SlashCommandItem[];
  query: string;
  command: (item: SlashCommandItem) => void;
};

export function createSlashExtension(
  onOpen: (props: {
    clientRect?: (() => DOMRect | null) | null;
    items: SlashCommandItem[];
    query: string;
    command: (item: SlashCommandItem) => void;
  }) => void,
  onClose: () => void,
) {
  return Extension.create({
    name: "slashCommand",

    addProseMirrorPlugins() {
      return [
        Suggestion({
          editor: this.editor,
          char: "/",
          allow: ({ state, range }) => {
            const $from = state.doc.resolve(range.from);
            return $from.parent.type.name !== "codeBlock";
          },
          items: ({ query }) =>
            defaultSlashItems.filter((item) =>
              item.title.toLowerCase().includes(query.toLowerCase()),
            ),
          command: ({ editor, range, props }) => {
            if (slashCommandLock) return;
            slashCommandLock = true;
            try {
              props.command(editor, range);
            } finally {
              queueMicrotask(() => {
                slashCommandLock = false;
              });
            }
          },
          render: () => {
            let dismissed = false;
            return {
              onStart: (props) => {
                dismissed = false;
                onOpen({
                  clientRect: props.clientRect,
                  items: props.items as SlashCommandItem[],
                  query: props.query,
                  command: (item) => {
                    props.command(item);
                  },
                });
              },
              onUpdate: (props) => {
                if (dismissed) return;
                onOpen({
                  clientRect: props.clientRect,
                  items: props.items as SlashCommandItem[],
                  query: props.query,
                  command: (item) => {
                    props.command(item);
                  },
                });
              },
              onExit: () => {
                dismissed = true;
                onClose();
              },
              onKeyDown: (props) => {
                if (props.event.key === "Escape") {
                  onClose();
                  return true;
                }
                return slashKeyHandler?.(props.event) ?? false;
              },
            };
          },
        }),
      ];
    },
  });
}