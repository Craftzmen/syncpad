"use client";

import { useEffect, useId, useRef, useState, type DragEvent } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { Film, ImageIcon, Link2 } from "lucide-react";
import { isValidYoutubeUrl } from "@tiptap/extension-youtube";

import { MAX_MEDIA_BYTES, readMediaFile } from "@/components/editor/media";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

type TextRequest = {
  id: number;
  kind: "text";
  title: string;
  description?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel: string;
  multiline?: boolean;
  allowEmpty?: boolean;
  preview?: "block" | "inline";
  resolve: (value: string | null) => void;
};

export type MediaChoice = {
  src: string;
  embed: "image" | "youtube" | "video";
};

type MediaRequest = {
  id: number;
  kind: "image" | "video";
  resolve: (value: MediaChoice | null) => void;
};

type ConfirmRequest = {
  id: number;
  kind: "confirm";
  title: string;
  description: string;
  confirmLabel: string;
  resolve: (value: boolean) => void;
};

type Request = TextRequest | MediaRequest | ConfirmRequest;

let sequence = 0;
const listeners = new Set<(request: Request) => void>();

function push(request: Request) {
  const listener = [...listeners].at(-1);
  if (!listener) {
    if (request.kind === "confirm") request.resolve(false);
    else request.resolve(null);
    return;
  }
  listener(request);
}

export function askText(options: {
  title: string;
  description?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  multiline?: boolean;
  allowEmpty?: boolean;
  preview?: "block" | "inline";
}) {
  return new Promise<string | null>((resolve) => {
    push({
      id: ++sequence,
      kind: "text",
      confirmLabel: options.confirmLabel ?? "Insert",
      ...options,
      resolve,
    });
  });
}

function askMedia(kind: "image" | "video") {
  return new Promise<MediaChoice | null>((resolve) => {
    push({ id: ++sequence, kind, resolve });
  });
}

export function askImage() {
  return askMedia("image");
}

export function askVideo() {
  return askMedia("video");
}

export function askConfirm(options: {
  title: string;
  description: string;
  confirmLabel?: string;
}) {
  return new Promise<boolean>((resolve) => {
    push({
      id: ++sequence,
      kind: "confirm",
      confirmLabel: options.confirmLabel ?? "Confirm",
      ...options,
      resolve,
    });
  });
}

function latexHtml(source: string, display: boolean) {
  const value = source.trim();
  if (!value) return "";
  try {
    return katex.renderToString(value, { throwOnError: false, displayMode: display });
  } catch {
    return "";
  }
}

export function EditorDialogs() {
  const [request, setRequest] = useState<Request | null>(null);
  const titleId = useId();
  const settled = useRef(false);

  useEffect(() => {
    listeners.add(setRequest);
    return () => {
      listeners.delete(setRequest);
    };
  }, []);

  useEffect(() => {
    settled.current = false;
  }, [request]);

  function finish(result: string | boolean | MediaChoice | null) {
    if (settled.current) return;
    settled.current = true;
    const current = request;
    setRequest(null);
    if (!current) return;
    if (current.kind === "confirm") current.resolve(result === true);
    else if (current.kind === "text") current.resolve(typeof result === "string" ? result : null);
    else current.resolve(result && typeof result === "object" ? result : null);
  }

  return (
    <Dialog
      open={request !== null}
      onOpenChange={(open) => {
        if (!open) finish(request?.kind === "confirm" ? false : null);
      }}
    >
      {request?.kind === "text" ? (
        <TextDialog key={request.id} request={request} titleId={titleId} onFinish={finish} />
      ) : null}
      {request?.kind === "image" || request?.kind === "video" ? (
        <MediaDialog key={request.id} kind={request.kind} titleId={titleId} onFinish={finish} />
      ) : null}
      {request?.kind === "confirm" ? (
        <ConfirmDialog key={request.id} request={request} titleId={titleId} onFinish={finish} />
      ) : null}
    </Dialog>
  );
}

function TextDialog({
  request,
  titleId,
  onFinish,
}: {
  request: TextRequest;
  titleId: string;
  onFinish: (result: string | null) => void;
}) {
  const [value, setValue] = useState(request.defaultValue ?? "");
  const preview = request.preview ? latexHtml(value, request.preview === "block") : "";

  function submit() {
    const next = value.trim();
    if (!next && !request.allowEmpty) return;
    onFinish(next);
  }

  return (
    <DialogContent className="sm:max-w-[440px]" aria-labelledby={titleId}>
      <DialogTitle id={titleId} className="pr-8 text-[15px] text-[#37352f]">
        {request.title}
      </DialogTitle>
      {request.description ? (
        <DialogDescription className="text-[13px] text-[#37352f]/60">
          {request.description}
        </DialogDescription>
      ) : (
        <DialogDescription className="sr-only">{request.title}</DialogDescription>
      )}
      {request.multiline ? (
        <textarea
          autoFocus
          value={value}
          placeholder={request.placeholder}
          rows={4}
          spellCheck={false}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) submit();
          }}
          className="w-full resize-y rounded-lg border border-black/10 bg-[#f7f6f3] px-3 py-2 font-mono text-[13px] text-[#37352f] outline-none focus:border-black/20"
        />
      ) : (
        <input
          autoFocus
          value={value}
          placeholder={request.placeholder}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          }}
          className="h-9 w-full rounded-lg border border-black/10 bg-[#f7f6f3] px-3 text-[13px] text-[#37352f] outline-none focus:border-black/20"
        />
      )}
      {request.preview ? (
        <div className="min-h-12 overflow-x-auto rounded-lg bg-[#f7f6f3] px-3 py-3 text-center text-[#37352f]">
          {preview ? (
            <div dangerouslySetInnerHTML={{ __html: preview }} />
          ) : (
            <p className="text-[13px] text-[#37352f]/40">Preview appears as you type</p>
          )}
        </div>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => onFinish(null)}>
          Cancel
        </Button>
        <Button type="button" onClick={submit} disabled={!request.allowEmpty && !value.trim()}>
          {request.confirmLabel}
        </Button>
      </div>
    </DialogContent>
  );
}

function youtubeId(src: string) {
  const match = src.match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([\w-]{6,})/);
  return match?.[1] ?? null;
}

function MediaDialog({
  kind,
  titleId,
  onFinish,
}: {
  kind: "image" | "video";
  titleId: string;
  onFinish: (result: MediaChoice | null) => void;
}) {
  const [url, setUrl] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const src = fileUrl || url.trim();
  const image = kind === "image";

  function acceptFile(file: File) {
    const ok = image ? file.type.startsWith("image/") : file.type.startsWith("video/");
    if (!ok) {
      setError(image ? "Drop an image file." : "Drop a video file.");
      return;
    }
    if (file.size > MAX_MEDIA_BYTES) {
      setError("That file is larger than 15 MB.");
      return;
    }
    void readMediaFile(file)
      .then((value) => {
        setFileUrl(value);
        setFileName(file.name);
        setUrl("");
        setError("");
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "Could not read that file.");
      });
  }

  function hasFiles(event: DragEvent) {
    return [...event.dataTransfer.types].includes("Files");
  }

  function onDragOver(event: DragEvent) {
    if (!hasFiles(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setDragging(true);
  }

  function onDragLeave(event: DragEvent) {
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) return;
    setDragging(false);
  }

  function onDrop(event: DragEvent) {
    if (!hasFiles(event)) return;
    event.preventDefault();
    setDragging(false);
    const prefix = image ? "image/" : "video/";
    const file = [...event.dataTransfer.files].find((item) => item.type.startsWith(prefix));
    if (file) acceptFile(file);
    else if (event.dataTransfer.files.length) setError(image ? "Drop an image file." : "Drop a video file.");
  }

  function submit() {
    if (!src) return;
    if (image && isValidYoutubeUrl(src)) {
      setError("That is a video link. Add it with the video block.");
      return;
    }
    const embed: MediaChoice["embed"] = image ? "image" : isValidYoutubeUrl(src) ? "youtube" : "video";
    onFinish({ src, embed });
  }

  const thumb = !image && !fileUrl ? youtubeId(src) : null;

  return (
    <DialogContent
      className="gap-3 sm:max-w-[480px]"
      aria-labelledby={titleId}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <DialogTitle id={titleId} className="pr-8 text-[15px] text-[#37352f]">
        {image ? "Add an image" : "Add a video"}
      </DialogTitle>
      <DialogDescription className="text-[13px] text-[#37352f]/60">
        {image
          ? "Drop a file, or paste a link."
          : "Drop a video file, or paste a YouTube, Vimeo, or file link."}
      </DialogDescription>
      <label
        className={
          dragging
            ? "block cursor-pointer rounded-xl border border-dashed border-[#337ea9] bg-[#e7f3f8] p-2"
            : "block cursor-pointer rounded-xl border border-dashed border-black/15 bg-[#f7f6f3] p-2 hover:border-black/25"
        }
      >
        {src ? (
          <div className="px-1 py-1">
            {image ? (
              <img src={src} alt="" className="max-h-52 w-full rounded-lg object-contain" />
            ) : fileUrl || src.startsWith("data:video") ? (
              <video src={src} className="max-h-52 w-full rounded-lg bg-black" muted />
            ) : thumb ? (
              <img
                src={`https://i.ytimg.com/vi/${thumb}/hqdefault.jpg`}
                alt=""
                className="max-h-52 w-full rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-28 items-center justify-center rounded-lg bg-[#111] text-[13px] text-white/80">
                Video link ready
              </div>
            )}
            {dragging ? (
              <p className="mt-2 text-center text-[12px] text-[#337ea9]">Drop to replace</p>
            ) : null}
          </div>
        ) : (
          <span className="flex min-h-40 flex-col items-center justify-center gap-2 px-4 py-6 text-center">
            <span className="flex size-10 items-center justify-center rounded-xl bg-white text-[#37352f]/70 shadow-[0_0_0_1px_rgba(0,0,0,0.06)]">
              {image ? <ImageIcon className="size-5" /> : <Film className="size-5" />}
            </span>
            <span className="text-[13px] font-medium text-[#37352f]">
              {dragging ? "Drop to add" : image ? "Drop an image here" : "Drop a video here"}
            </span>
            <span className="text-[12px] text-[#37352f]/50">or click to browse</span>
          </span>
        )}
        <input
          type="file"
          accept={image ? "image/*" : "video/*"}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) acceptFile(file);
            event.target.value = "";
          }}
        />
      </label>
      {fileName ? (
        <div className="flex items-center justify-between gap-3 text-[12px] text-[#37352f]/70">
          <span className="truncate">{fileName}</span>
          <button
            type="button"
            className="shrink-0 text-[#37352f] underline-offset-2 hover:underline"
            onClick={() => {
              setFileUrl("");
              setFileName("");
            }}
          >
            Remove
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Link2 className="size-3.5 shrink-0 text-[#37352f]/40" />
          <input
            autoFocus
            value={url}
            placeholder={image ? "Paste an image link" : "Paste a YouTube, Vimeo, or video link"}
            onChange={(event) => {
              setUrl(event.target.value);
              setFileUrl("");
              setFileName("");
              setError("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && src) {
                event.preventDefault();
                submit();
              }
            }}
            className="h-9 min-w-0 flex-1 rounded-lg border border-black/10 bg-white px-3 text-[13px] text-[#37352f] outline-none focus:border-black/20"
          />
        </div>
      )}
      {error ? <p className="text-[12px] text-[#c4554d]">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => onFinish(null)}>
          Cancel
        </Button>
        <Button type="button" onClick={submit} disabled={!src}>
          Insert
        </Button>
      </div>
    </DialogContent>
  );
}

function ConfirmDialog({
  request,
  titleId,
  onFinish,
}: {
  request: ConfirmRequest;
  titleId: string;
  onFinish: (result: boolean) => void;
}) {
  return (
    <DialogContent className="sm:max-w-[400px]" aria-labelledby={titleId}>
      <DialogTitle id={titleId} className="pr-8 text-[15px] text-[#37352f]">
        {request.title}
      </DialogTitle>
      <DialogDescription className="text-[13px] text-[#37352f]/70">
        {request.description}
      </DialogDescription>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => onFinish(false)}>
          Cancel
        </Button>
        <Button type="button" variant="destructive" onClick={() => onFinish(true)}>
          {request.confirmLabel}
        </Button>
      </div>
    </DialogContent>
  );
}
