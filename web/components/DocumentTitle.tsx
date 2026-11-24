"use client";

import { useEffect, useState } from "react";

import { requestTitleEnter } from "@/lib/editor-events";
import { isGhostTitle } from "@/lib/page-title";
import { cn } from "@/lib/utils";

export function DocumentTitle({
  documentId,
  initialTitle,
  canEdit,
  onTitleChange,
}: {
  documentId: string;
  initialTitle: string;
  canEdit: boolean;
  onTitleChange?: (title: string) => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle]);

  useEffect(() => {
    const onClear = () => {
      if (!canEdit) return;
      setTitle("New page");
      onTitleChange?.("New page");
      void fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New page" }),
      });
    };
    window.addEventListener("syncpad:clear-title", onClear);
    return () => window.removeEventListener("syncpad:clear-title", onClear);
  }, [canEdit, documentId, onTitleChange]);

  const ghost = isGhostTitle(title) && !focused;

  async function save(next: string) {
    if (!canEdit) return;
    const trimmed = next.trim();
    const stored = trimmed && !isGhostTitle(trimmed) ? trimmed : "New page";
    setTitle(stored);
    onTitleChange?.(stored);
    await fetch(`/api/documents/${documentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: stored }),
    });
  }

  return (
    <input
      value={ghost ? "" : isGhostTitle(title) ? "" : title}
      readOnly={!canEdit}
      onFocus={() => setFocused(true)}
      onChange={(event) => {
        setTitle(event.target.value);
        onTitleChange?.(event.target.value || "New page");
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" || !canEdit || event.nativeEvent.isComposing) return;
        event.preventDefault();
        requestTitleEnter();
      }}
      onBlur={() => {
        setFocused(false);
        void save(title);
      }}
      placeholder="New page"
      className={cn(
        "w-full border-0 bg-transparent text-[40px] leading-[1.2] font-bold tracking-[-0.02em] text-[#37352f] outline-none placeholder:font-bold placeholder:text-[#37352f]/25",
      )}
    />
  );
}