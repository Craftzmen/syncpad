"use client";

import { useEffect, useId, useRef, useState, type DragEvent } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

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

type ImageRequest = {
  id: number;
  kind: "image";
  resolve: (value: string | null) => void;
};

type ConfirmRequest = {
  id: number;
  kind: "confirm";
  title: string;
  description: string;
  confirmLabel: string;
  resolve: (value: boolean) => void;
};

type Request = TextRequest | ImageRequest | ConfirmRequest;

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

export function askImage() {
  return new Promise<string | null>((resolve) => {
    push({ id: ++sequence, kind: "image", resolve });
  });
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

  function finish(result: string | boolean | null) {
    if (settled.current) return;
    settled.current = true;
    const current = request;
    setRequest(null);
    if (!current) return;
    if (current.kind === "confirm") current.resolve(result === true);
    else current.resolve(typeof result === "string" ? result : null);
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
      {request?.kind === "image" ? (
        <ImageDialog key={request.id} titleId={titleId} onFinish={finish} />
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

function ImageDialog({
  titleId,
  onFinish,
}: {
  titleId: string;
  onFinish: (result: string | null) => void;
}) {
  const [url, setUrl] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const src = fileUrl || url.trim();

  function onFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Drop an image file.");
      return;
    }
    setError("");
    const reader = new FileReader();
    reader.onload = () => {
      setFileUrl(String(reader.result || ""));
      setUrl("");
    };
    reader.readAsDataURL(file);
  }

  function hasFiles(event: DragEvent) {
    return [...event.dataTransfer.types].includes("Files");
  }

  function onDragOver(event: DragEvent) {
    if (!hasFiles(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function onZoneDragOver(event: DragEvent<HTMLLabelElement>) {
    onDragOver(event);
    if (hasFiles(event)) setDragging(true);
  }

  function onDragLeave(event: DragEvent<HTMLLabelElement>) {
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) return;
    setDragging(false);
  }

  function onDrop(event: DragEvent) {
    if (!hasFiles(event)) return;
    event.preventDefault();
    setDragging(false);
    const file = [...event.dataTransfer.files].find((item) => item.type.startsWith("image/"));
    if (file) onFile(file);
    else if (event.dataTransfer.files.length) setError("Drop an image file.");
  }

  return (
    <DialogContent
      className="sm:max-w-[440px]"
      aria-labelledby={titleId}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <DialogTitle id={titleId} className="pr-8 text-[15px] text-[#37352f]">
        Add an image
      </DialogTitle>
      <DialogDescription className="text-[13px] text-[#37352f]/60">
        Paste a link or upload a file from your computer.
      </DialogDescription>
      <input
        autoFocus
        value={url}
        placeholder="https://"
        onChange={(event) => {
          setUrl(event.target.value);
          setFileUrl("");
          setError("");
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && src) {
            event.preventDefault();
            onFinish(src);
          }
        }}
        className="h-9 w-full rounded-lg border border-black/10 bg-[#f7f6f3] px-3 text-[13px] text-[#37352f] outline-none focus:border-black/20"
      />
      <label
        onDragOver={onZoneDragOver}
        onDragLeave={onDragLeave}
        className={
          dragging
            ? "flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#337ea9] bg-[#e7f3f8] px-4 py-5 text-center"
            : "flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-black/15 bg-[#f7f6f3] px-4 py-5 text-center hover:border-black/25"
        }
      >
        {src ? (
          <>
            <img src={src} alt="" className="max-h-32 w-full object-contain" />
            {dragging ? (
              <span className="text-[12px] text-[#337ea9]">Drop to replace this image</span>
            ) : null}
          </>
        ) : (
          <>
            <span className="text-[13px] font-medium text-[#37352f]">
              {dragging ? "Drop to add the image" : "Drop an image here"}
            </span>
            <span className="text-[12px] text-[#37352f]/50">or click to upload from your computer</span>
          </>
        )}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => {
            onFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </label>
      {error ? <p className="text-[12px] text-[#c4554d]">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => onFinish(null)}>
          Cancel
        </Button>
        <Button type="button" onClick={() => onFinish(src)} disabled={!src}>
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
