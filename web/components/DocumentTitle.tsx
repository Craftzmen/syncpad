"use client";

import { useEffect, useState } from "react";

import { publishPageTitle, requestTitleEnter } from "@/lib/editor-events";
import { isGhostTitle } from "@/lib/page-title";
import { cn } from "@/lib/utils";

export function DocumentTitle({
  title,
  canEdit,
  onChange,
  onFlush,
}: {
  title: string;
  canEdit: boolean;
  onChange: (title: string) => void;
  onFlush: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const ghost = isGhostTitle(title) && !focused;

  useEffect(() => {
    publishPageTitle(ghost ? "" : title);
  }, [ghost, title]);

  useEffect(() => {
    const onClear = () => {
      if (!canEdit) return;
      onChange("New page");
      onFlush();
    };
    window.addEventListener("syncpad:clear-title", onClear);
    return () => window.removeEventListener("syncpad:clear-title", onClear);
  }, [canEdit, onChange, onFlush]);

  return (
    <input
      value={ghost || isGhostTitle(title) ? "" : title}
      readOnly={!canEdit}
      onFocus={() => setFocused(true)}
      onChange={(event) => {
        if (!canEdit) return;
        onChange(event.target.value);
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" || !canEdit || event.nativeEvent.isComposing) return;
        event.preventDefault();
        onFlush();
        requestTitleEnter();
      }}
      onBlur={() => {
        setFocused(false);
        if (canEdit) onFlush();
      }}
      placeholder="New page"
      className={cn(
        "w-full border-0 bg-transparent text-[40px] leading-[1.2] font-bold tracking-[-0.02em] text-[#37352f] outline-none placeholder:font-bold placeholder:text-[#37352f]/25",
      )}
    />
  );
}
