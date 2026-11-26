"use client";

import { Extension, mergeAttributes, Node as TiptapNode, type Editor } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import Youtube, { getEmbedUrlFromYoutubeUrl } from "@tiptap/extension-youtube";
import { Plugin } from "@tiptap/pm/state";
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export const MAX_MEDIA_BYTES = 15 * 1024 * 1024;

export function mediaWidth(value: unknown) {
  const width = Number(value);
  if (!Number.isFinite(width) || width < 20 || width > 100) return 100;
  return Math.round(width);
}

export function mediaShift(value: unknown) {
  const shift = Number(value);
  if (!Number.isFinite(shift) || shift <= 0) return 0;
  return Math.min(80, Math.round(shift));
}

const CORNERS = ["top-left", "top-right", "bottom-left", "bottom-right"] as const;
type Corner = (typeof CORNERS)[number];

export function readMediaFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    if (file.size > MAX_MEDIA_BYTES) {
      reject(new Error("That file is larger than 15 MB."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

function videoEmbed(src: string) {
  const vimeo = src.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) {
    return { kind: "iframe" as const, src: `https://player.vimeo.com/video/${vimeo[1]}` };
  }
  return { kind: "file" as const, src };
}

function stopMediaEvent({ event }: { event: Event }) {
  const target = event.target;
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest(".media-handle, video, iframe, button"));
}

export function MediaFrame({
  width,
  shift,
  selected = false,
  editable = true,
  onResize,
  children,
}: {
  width: number;
  shift: number;
  selected?: boolean;
  editable?: boolean;
  onResize: (width: number, shift: number) => void;
  children: ReactNode;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState<{ width: number; shift: number } | null>(null);
  const [resizing, setResizing] = useState(false);
  const shown = live ?? { width, shift };

  function startResize(event: ReactPointerEvent, corner: Corner) {
    if (!editable || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const host = frame.current?.closest(".notion-editor");
    const shell = frame.current?.parentElement;
    if (!(host instanceof HTMLElement) || !frame.current || !(shell instanceof HTMLElement)) return;
    const dragRoot = frame.current.closest(".react-renderer");
    if (dragRoot instanceof HTMLElement) dragRoot.draggable = false;
    const bounds = host.getBoundingClientRect();
    const pad = Number.parseFloat(getComputedStyle(host).paddingLeft) || 0;
    const padRight = Number.parseFloat(getComputedStyle(host).paddingRight) || 0;
    const contentLeft = bounds.left + pad;
    const contentWidth = Math.max(1, bounds.width - pad - padRight);
    const box = frame.current.getBoundingClientRect();
    const origin = event.clientX;
    const startWidth = box.width;
    const startShift = box.left - contentLeft;
    const fromLeft = corner.endsWith("left");
    setResizing(true);

    const measure = (clientX: number) => {
      const delta = clientX - origin;
      let widthPx = fromLeft ? startWidth - delta : startWidth + delta;
      let shiftPx = fromLeft ? startShift + delta : startShift;
      widthPx = Math.max(120, Math.min(contentWidth, widthPx));
      shiftPx = Math.max(0, shiftPx);
      if (shiftPx + widthPx > contentWidth) {
        if (fromLeft) widthPx = Math.max(120, contentWidth - shiftPx);
        else shiftPx = Math.max(0, contentWidth - widthPx);
      }
      return {
        width: Math.min(100, Math.max(20, Math.round((widthPx / contentWidth) * 100))),
        shift: Math.min(80, Math.max(0, Math.round((shiftPx / contentWidth) * 100))),
      };
    };

    const paint = (nextSize: { width: number; shift: number }) => {
      shell.style.width = `${nextSize.width}%`;
      shell.style.marginLeft = nextSize.shift ? `${nextSize.shift}%` : "";
      setLive(nextSize);
    };
    const move = (next: PointerEvent) => paint(measure(next.clientX));
    const blockDrag = (drag: DragEvent) => drag.preventDefault();
    const end = (next: PointerEvent) => {
      const nextSize = measure(next.clientX);
      setLive(null);
      setResizing(false);
      if (dragRoot instanceof HTMLElement) dragRoot.draggable = true;
      onResize(nextSize.width, nextSize.shift);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      window.removeEventListener("dragstart", blockDrag, true);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    window.addEventListener("dragstart", blockDrag, true);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // The drag still follows the window listeners when capture is unavailable.
    }
  }

  return (
    <NodeViewWrapper
      className={cn("media-frame", selected && "is-selected", resizing && "is-resizing")}
      style={{ width: `${shown.width}%`, marginLeft: shown.shift ? `${shown.shift}%` : undefined }}
      data-media=""
    >
      <div ref={frame} className="media-frame-body">
        {children}
        {editable
          ? CORNERS.map((corner) => (
              <span
                key={corner}
                className={`media-handle media-handle-${corner}`}
                aria-label="Resize"
                onPointerDown={(event) => startResize(event, corner)}
                onMouseDown={(event) => event.preventDefault()}
              />
            ))
          : null}
      </div>
    </NodeViewWrapper>
  );
}

function ImageView({ node, updateAttributes, editor, selected }: ReactNodeViewProps) {
  return (
    <MediaFrame
      width={mediaWidth(node.attrs.width)}
      shift={mediaShift(node.attrs.shift)}
      selected={selected}
      editable={editor.isEditable}
      onResize={(width, shift) => updateAttributes({ width, shift: shift || null })}
    >
      <img src={String(node.attrs.src || "")} alt={String(node.attrs.alt || "")} draggable={false} />
    </MediaFrame>
  );
}

function VideoView({ node, updateAttributes, editor, selected }: ReactNodeViewProps) {
  const src = String(node.attrs.src || "");
  const embed = videoEmbed(src);
  const active = selected && editor.isEditable;
  return (
    <MediaFrame
      width={mediaWidth(node.attrs.width)}
      shift={mediaShift(node.attrs.shift)}
      selected={selected}
      editable={editor.isEditable}
      onResize={(width, shift) => updateAttributes({ width, shift: shift || null })}
    >
      {embed.kind === "iframe" ? (
        <iframe
          src={embed.src}
          title="Video"
          allow="fullscreen; picture-in-picture"
          allowFullScreen
          style={{ pointerEvents: active ? "auto" : "none" }}
        />
      ) : (
        <video src={embed.src} controls style={{ pointerEvents: active ? "auto" : "none" }} />
      )}
    </MediaFrame>
  );
}

function YoutubeView({ node, updateAttributes, editor, selected }: ReactNodeViewProps) {
  const src = getEmbedUrlFromYoutubeUrl({
    url: String(node.attrs.src || ""),
    nocookie: true,
    allowFullscreen: true,
    controls: true,
    startAt: Number(node.attrs.start) || 0,
  });
  const active = selected && editor.isEditable;
  return (
    <MediaFrame
      width={mediaWidth(node.attrs.width)}
      shift={mediaShift(node.attrs.shift)}
      selected={selected}
      editable={editor.isEditable}
      onResize={(width, shift) => updateAttributes({ width, shift: shift || null })}
    >
      {src ? (
        <iframe
          src={src}
          title="YouTube video"
          allow="fullscreen; picture-in-picture"
          allowFullScreen
          style={{ pointerEvents: active ? "auto" : "none" }}
        />
      ) : null}
    </MediaFrame>
  );
}

const shiftAttribute = {
  default: null,
  parseHTML: (element: HTMLElement) => {
    const value = mediaShift(element.getAttribute("data-shift"));
    return value || null;
  },
  renderHTML: (attributes: { shift?: number | null }) => {
    if (!attributes.shift) return {};
    return { "data-shift": String(attributes.shift) };
  },
};

export const NotionImage = Image.extend({
  draggable: true,
  addAttributes() {
    return {
      ...this.parent?.(),
      shift: shiftAttribute,
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageView, { stopEvent: stopMediaEvent });
  },
  renderHTML({ HTMLAttributes }) {
    const width = mediaWidth(HTMLAttributes.width);
    const shift = mediaShift(HTMLAttributes.shift);
    const { width: _width, height: _height, shift: _shift, ...rest } = HTMLAttributes;
    const style = `width: ${width}%;${shift ? ` margin-left: ${shift}%;` : ""}`;
    return ["img", mergeAttributes(this.options.HTMLAttributes, rest, { style })];
  },
});

export const NotionYoutube = Youtube.extend({
  draggable: true,
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const raw = element.getAttribute("data-width") ?? element.getAttribute("width");
          const value = Number(raw);
          if (!Number.isFinite(value) || value < 20 || value > 100) return null;
          return value;
        },
        renderHTML: (attributes: { width?: number | null }) => {
          if (!attributes.width) return {};
          return { "data-width": String(attributes.width) };
        },
      },
      shift: shiftAttribute,
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(YoutubeView, { stopEvent: stopMediaEvent });
  },
});

export const Video = TiptapNode.create({
  name: "video",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: "" },
      width: { default: null },
      shift: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-video]",
        getAttrs: (element) => {
          if (!(element instanceof HTMLElement)) return false;
          return {
            src: element.getAttribute("data-src") || "",
            width: mediaWidth(element.getAttribute("data-width")),
            shift: mediaShift(element.getAttribute("data-shift")) || null,
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-video": "",
        "data-src": HTMLAttributes.src,
        "data-width": mediaWidth(HTMLAttributes.width),
        ...(mediaShift(HTMLAttributes.shift) ? { "data-shift": mediaShift(HTMLAttributes.shift) } : {}),
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoView, { stopEvent: stopMediaEvent });
  },
});

function fileOf(data: DataTransfer | null, kind: "image" | "video") {
  if (!data) return null;
  const prefix = kind === "image" ? "image/" : "video/";
  const file = Array.from(data.files).find((item) => item.type.startsWith(prefix));
  if (file) return file;
  for (const item of Array.from(data.items)) {
    if (item.kind === "file" && item.type.startsWith(prefix)) return item.getAsFile();
  }
  return null;
}

function insertFile(editor: Editor, file: File, pos: number | null) {
  const type = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : null;
  if (!type) return;
  void readMediaFile(file)
    .then((src) => {
      if (!src) return;
      const node = { type, attrs: { src } };
      const chain = editor.chain().focus();
      if (pos == null) chain.insertContent(node).run();
      else chain.insertContentAt(pos, node).run();
    })
    .catch(() => {});
}

export const MediaDrop = Extension.create({
  name: "mediaDrop",
  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        props: {
          handlePaste(_view, event) {
            const file = fileOf(event.clipboardData, "image") ?? fileOf(event.clipboardData, "video");
            if (!file) return false;
            insertFile(editor, file, null);
            return true;
          },
          handleDrop(view, event) {
            const file = fileOf(event.dataTransfer, "image") ?? fileOf(event.dataTransfer, "video");
            if (!file) return false;
            event.preventDefault();
            view.dom.classList.remove("is-file-drop");
            const found = view.posAtCoords({ left: event.clientX, top: event.clientY });
            insertFile(editor, file, found?.pos ?? null);
            return true;
          },
          handleDOMEvents: {
            dragover(_view, event) {
              const types = event.dataTransfer?.types;
              if (!types || ![...types].includes("Files")) return false;
              event.preventDefault();
              _view.dom.classList.add("is-file-drop");
              return false;
            },
            dragleave(_view, event) {
              const next = event.relatedTarget;
              if (next instanceof globalThis.Node && _view.dom.contains(next)) return false;
              _view.dom.classList.remove("is-file-drop");
              return false;
            },
            drop(view) {
              view.dom.classList.remove("is-file-drop");
              return false;
            },
          },
        },
      }),
    ];
  },
});
