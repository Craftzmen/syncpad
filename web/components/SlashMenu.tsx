"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bookmark,
  ChevronRight,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Image,
  List,
  ListOrdered,
  ListTree,
  MessageSquare,
  Minus,
  Quote,
  Sigma,
  SquareCheck,
  Table,
  Type,
  Video,
  Workflow,
} from "lucide-react";

import {
  setSlashKeyHandler,
  type SlashCommandItem,
} from "@/components/editor/slash-extension";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof Type> = {
  Text: Type,
  "Heading 1": Heading1,
  "Heading 2": Heading2,
  "Heading 3": Heading3,
  "Bulleted list": List,
  "Numbered list": ListOrdered,
  "To-do list": SquareCheck,
  Toggle: ChevronRight,
  Quote,
  Callout: MessageSquare,
  Divider: Minus,
  Code,
  Image,
  Video,
  Bookmark,
  Table,
  "Inline equation": Sigma,
  "Block equation": Sigma,
  Mermaid: Workflow,
  "Table of contents": ListTree,
};

export function SlashMenu({
  open,
  position,
  items,
  query,
  onSelect,
  onClose,
}: {
  open: boolean;
  position: { top: number; bottom: number; left: number } | null;
  items: SlashCommandItem[];
  query: string;
  onSelect: (item: SlashCommandItem) => void;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const chosen = useRef(false);

  useEffect(() => {
    setIndex(0);
  }, [items, query, open]);

  useEffect(() => {
    if (open) chosen.current = false;
  }, [open]);

  useEffect(() => {
    if (!open) {
      setSlashKeyHandler(null);
      return;
    }
    setSlashKeyHandler((event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setIndex((current) => (items.length ? (current + 1) % items.length : 0));
        return true;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setIndex((current) =>
          items.length ? (current - 1 + items.length) % items.length : 0,
        );
        return true;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        if (event.repeat || chosen.current) return true;
        const item = items[index];
        if (item) {
          chosen.current = true;
          onSelect(item);
        }
        return true;
      }
      return false;
    });
    return () => setSlashKeyHandler(null);
  }, [open, items, index, onSelect]);

  const groups = useMemo(() => {
    const order = ["Suggested", "Basic blocks", "Media", "Advanced"] as const;
    return order
      .map((label) => ({
        label,
        items: items.filter((item) => item.group === label),
      }))
      .filter((group) => group.items.length > 0);
  }, [items]);

  useEffect(() => {
    const active = listRef.current?.querySelector<HTMLElement>("[data-active='true']");
    active?.scrollIntoView({ block: "nearest" });
  }, [index, open]);

  if (!open || !position) return null;

  const margin = 8;
  const width = 320;
  const left = Math.min(
    Math.max(margin, position.left),
    window.innerWidth - width - margin,
  );
  const spaceBelow = window.innerHeight - position.bottom - margin;
  const spaceAbove = position.top - margin;
  const openAbove = spaceBelow < 240 && spaceAbove > spaceBelow;
  const maxHeight = Math.max(160, Math.min(440, openAbove ? spaceAbove : spaceBelow));
  const top = openAbove
    ? Math.max(margin, position.top - maxHeight - 6)
    : position.bottom + 6;

  let cursor = -1;

  return (
    <div
      className="fixed z-50 flex w-[320px] flex-col overflow-hidden rounded-xl border border-black/10 bg-white text-[#37352f] shadow-[0_8px_28px_rgba(0,0,0,0.12)]"
      style={{ top, left, maxHeight }}
    >
      <div className="shrink-0 border-b border-black/5 px-3 py-2">
        <p className="text-sm text-[#37352f]/80">
          <span className="text-[#37352f]/40">/</span>
          {query || <span className="text-[#37352f]/35">Type to search</span>}
        </p>
      </div>
      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-1">
        {items.length === 0 ? (
          <p className="px-2 py-3 text-sm text-[#37352f]/50">No results</p>
        ) : (
          groups.map((group) => (
            <div key={group.label} className="mb-1">
              <p className="px-2 pt-1.5 pb-1 text-[11px] font-medium text-[#37352f]/45">
                {group.label}
              </p>
              {group.items.map((item) => {
                cursor += 1;
                const itemIndex = cursor;
                const active = itemIndex === index;
                const Icon = ICONS[item.title] ?? Type;
                return (
                  <button
                    key={item.title}
                    type="button"
                    data-active={active ? "true" : "false"}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
                      active ? "bg-[#f1f1ef]" : "hover:bg-[#f7f7f5]",
                    )}
                    onMouseEnter={() => setIndex(itemIndex)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      if (chosen.current) return;
                      chosen.current = true;
                      onSelect(item);
                    }}
                  >
                    <span className="flex size-6 items-center justify-center rounded border border-black/10 bg-white text-[#37352f]/70">
                      <Icon className="size-3.5" />
                    </span>
                    <span className="font-medium">{item.title}</span>
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>
      <button
        type="button"
        className="flex w-full shrink-0 items-center justify-between border-t border-black/5 px-3 py-1.5 text-xs text-[#37352f]/45 hover:bg-[#f7f7f5]"
        onClick={onClose}
      >
        Close menu
        <kbd className="rounded border border-black/10 px-1 py-px text-[10px]">esc</kbd>
      </button>
    </div>
  );
}