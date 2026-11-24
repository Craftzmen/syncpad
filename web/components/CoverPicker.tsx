"use client";

import { useRef, useState } from "react";
import { ImageIcon, ImagePlus, Link2 } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  COVER_COLORS,
  COVER_IMAGES,
  readCoverFile,
} from "@/lib/covers";
import { cn } from "@/lib/utils";

export function CoverPicker({
  coverColor,
  onChange,
  label,
  align = "end",
  triggerClassName,
}: {
  coverColor: string | null;
  onChange: (cover: string | null) => void;
  label: string;
  align?: "start" | "end";
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"gallery" | "upload" | "colors">("gallery");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function choose(next: string | null) {
    onChange(next);
    setOpen(false);
    setError("");
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file.");
      return;
    }
    try {
      const data = await readCoverFile(file);
      choose(data);
    } catch {
      setError("Could not use that image.");
    }
  }

  function applyUrl() {
    const next = url.trim();
    if (!next.startsWith("https://") && !next.startsWith("http://")) {
      setError("Paste a full image URL.");
      return;
    }
    choose(next);
  }

  const action = triggerClassName?.includes("cover-action");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              action
                ? "cover-action"
                : "cover-pill cursor-pointer bg-white whitespace-nowrap",
              triggerClassName,
            )}
          >
            {action ? <ImageIcon /> : null}
            {label}
          </button>
        }
      />
      <PopoverContent
        align={align}
        side="bottom"
        sideOffset={8}
        collisionPadding={16}
        className="flex w-[440px] max-h-[min(460px,var(--available-height))] flex-col gap-0 overflow-hidden rounded-xl border border-black/10 bg-white p-0 text-[#0d0d0d] shadow-[0_12px_40px_rgba(0,0,0,0.16)] ring-0"
      >
        <div className="flex items-end gap-4 px-3 pt-2">
          <CoverTab active={tab === "gallery"} onClick={() => setTab("gallery")}>
            Gallery
          </CoverTab>
          <CoverTab active={tab === "upload"} onClick={() => setTab("upload")}>
            Upload
          </CoverTab>
          <CoverTab active={tab === "colors"} onClick={() => setTab("colors")}>
            Colors
          </CoverTab>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {tab === "gallery" ? (
            <div className="grid grid-cols-2 gap-2">
              {COVER_IMAGES.map((image) => (
                <button
                  key={image.id}
                  type="button"
                  aria-label={image.name}
                  className={cn(
                    "h-20 overflow-hidden rounded-md",
                    coverColor === image.id && "ring-2 ring-[#2383e2] ring-offset-2",
                  )}
                  onClick={() => choose(image.id)}
                >
                  <img src={image.src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
          {tab === "upload" ? (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  void onFile(event.dataTransfer.files[0]);
                }}
                className="flex h-28 w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-black/15 bg-[#fafafa] text-sm text-[#5d5d5d] hover:bg-[#f4f4f4]"
              >
                <ImagePlus className="size-4" />
                Upload an image
                <span className="text-xs text-[#8e8e8e]">or drop one here</span>
              </button>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  void onFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
              <div className="flex items-center gap-2">
                <Link2 className="size-4 shrink-0 text-[#8e8e8e]" />
                <input
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") applyUrl();
                  }}
                  placeholder="Paste an image link"
                  className="h-8 min-w-0 flex-1 rounded-md bg-[#f4f4f4] px-2 text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={applyUrl}
                  className="h-8 rounded-md bg-[#0d0d0d] px-2.5 text-xs text-white"
                >
                  Use
                </button>
              </div>
              {error ? <p className="text-xs text-[#d44c47]">{error}</p> : null}
            </div>
          ) : null}
          {tab === "colors" ? (
            <div className="grid grid-cols-4 gap-2">
              {COVER_COLORS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  aria-label={preset.id}
                  className={cn(
                    "h-14 rounded-md",
                    coverColor === preset.id && "ring-2 ring-[#2383e2] ring-offset-2",
                  )}
                  style={{ background: preset.css }}
                  onClick={() => choose(preset.id)}
                />
              ))}
            </div>
          ) : null}
        </div>
        {coverColor ? (
          <button
            type="button"
            className="w-full shrink-0 border-t border-black/[0.06] py-2 text-sm text-[#5d5d5d] hover:bg-[#fafafa]"
            onClick={() => choose(null)}
          >
            Remove
          </button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

function CoverTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        "border-b-2 pb-1.5 text-sm",
        active
          ? "border-[#0d0d0d] font-medium text-[#0d0d0d]"
          : "border-transparent text-[#8e8e8e] hover:text-[#0d0d0d]",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
