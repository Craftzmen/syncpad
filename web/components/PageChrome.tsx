"use client";

import { useMemo, useState, type ReactElement } from "react";
import {
  Code,
  Heading1,
  List,
  MessageSquare,
  Shuffle,
  SquareCheck,
  Table,
  Type,
  Workflow,
} from "lucide-react";

import { PageIconView } from "@/components/PageIconView";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { requestInsert, type InsertKind } from "@/lib/editor-events";
import {
  EMOJI_GROUPS,
  ICON_COLORS,
  PAGE_ICON_MAP,
  PAGE_ICONS,
  SKIN_TONES,
  emojiWithTone,
  pageIconValue,
  parsePageIcon,
  type EmojiItem,
} from "@/lib/page-icons";
import { cn } from "@/lib/utils";

export function IconPicker({
  icon,
  onChange,
  trigger,
}: {
  icon: string | null;
  onChange: (icon: string | null) => void;
  trigger: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"emoji" | "icons">("emoji");
  const [query, setQuery] = useState("");
  const [tone, setTone] = useState<(typeof SKIN_TONES)[number]>("");
  const current = parsePageIcon(icon);
  const [color, setColor] = useState(
    current?.kind === "icon" ? current.color : ICON_COLORS[5],
  );

  const needle = query.trim().toLowerCase();
  const emojiGroups = useMemo(() => {
    return EMOJI_GROUPS.map((group) => ({
      label: group.label,
      items: group.items.filter((item) => !needle || item.name.includes(needle)),
    })).filter((group) => group.items.length > 0);
  }, [needle]);
  const icons = useMemo(
    () => PAGE_ICONS.filter((name) => !needle || name.includes(needle)),
    [needle],
  );

  function choose(next: string | null) {
    onChange(next);
    setOpen(false);
  }

  function randomize() {
    if (tab === "icons") {
      const name = PAGE_ICONS[Math.floor(Math.random() * PAGE_ICONS.length)] ?? "file-text";
      const nextColor = ICON_COLORS[Math.floor(Math.random() * ICON_COLORS.length)] ?? color;
      setColor(nextColor);
      choose(pageIconValue(name, nextColor));
      return;
    }
    const pool = EMOJI_GROUPS.flatMap((group) => group.items);
    const item = pool[Math.floor(Math.random() * pool.length)];
    if (item) choose(emojiWithTone(item, tone));
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setQuery("");
          setTab(current?.kind === "icon" ? "icons" : "emoji");
          if (current?.kind === "icon") setColor(current.color);
        }
      }}
    >
      <PopoverTrigger render={trigger} />
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={8}
        collisionPadding={16}
        className="flex h-[min(448px,var(--available-height))] w-[416px] max-h-[min(448px,var(--available-height))] flex-col gap-0 overflow-hidden rounded-xl border border-black/10 bg-white p-0 text-[#37352f] shadow-[0_8px_28px_rgba(0,0,0,0.16)] ring-0"
      >
        <div className="flex items-end gap-4 px-3 pt-2">
          <PickerTab active={tab === "emoji"} onClick={() => setTab("emoji")}>
            Emoji
          </PickerTab>
          <PickerTab active={tab === "icons"} onClick={() => setTab("icons")}>
            Icons
          </PickerTab>
          <button
            type="button"
            className="mb-2 ml-auto rounded p-1 text-[#37352f]/55 hover:bg-[#f1f1ef]"
            aria-label="Random icon"
            onClick={randomize}
          >
            <Shuffle className="size-4" />
          </button>
        </div>
        <div className="px-3 pb-2">
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => event.stopPropagation()}
            placeholder="Filter…"
            className="w-full rounded-md bg-[#f6f5f4] px-2.5 py-1.5 text-sm outline-none placeholder:text-[#37352f]/35"
          />
        </div>
        {tab === "emoji" ? (
          <div className="flex items-center gap-1 px-3 pb-2">
            {SKIN_TONES.map((swatch) => (
              <button
                key={swatch || "default"}
                type="button"
                aria-label={swatch ? `Skin tone ${swatch}` : "Default skin tone"}
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-sm",
                  tone === swatch && "ring-2 ring-[#37352f]/30",
                )}
                onClick={() => setTone(swatch)}
              >
                {swatch ? `👍${swatch}` : "👍"}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 pb-2">
            {ICON_COLORS.map((swatch) => (
              <button
                key={swatch}
                type="button"
                aria-label={`Icon color ${swatch}`}
                className={cn(
                  "size-5 rounded-full",
                  color === swatch && "ring-2 ring-[#37352f]/25 ring-offset-2",
                )}
                style={{ background: swatch }}
                onClick={() => setColor(swatch)}
              />
            ))}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {tab === "emoji" ? (
            emojiGroups.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-[#37352f]/45">No emoji</p>
            ) : (
              emojiGroups.map((group) => (
                <div key={group.label} className="mb-2">
                  <p className="px-1 py-1 text-[11px] font-medium text-[#37352f]/45">
                    {group.label}
                  </p>
                  <div className="grid grid-cols-12">
                    {group.items.map((item) => (
                      <EmojiButton
                        key={`${group.label}-${item.emoji}`}
                        item={item}
                        tone={tone}
                        onChoose={choose}
                      />
                    ))}
                  </div>
                </div>
              ))
            )
          ) : icons.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-[#37352f]/45">No icons</p>
          ) : (
            <div className="grid grid-cols-12">
              {icons.map((name) => {
                const Icon = PAGE_ICON_MAP[name];
                if (!Icon) return null;
                const selected = current?.kind === "icon" && current.name === name && current.color === color;
                return (
                  <button
                    key={name}
                    type="button"
                    aria-label={name}
                    className={cn(
                      "flex size-8 items-center justify-center rounded-md hover:bg-[#f1f1ef]",
                      selected && "bg-[#f1f1ef]",
                    )}
                    onClick={() => choose(pageIconValue(name, color))}
                  >
                    <Icon className="size-[18px]" color={color} strokeWidth={1.75} />
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {icon ? (
          <button
            type="button"
            className="w-full shrink-0 border-t border-black/6 py-2 text-sm text-[#37352f]/70 hover:bg-[#f7f7f5]"
            onClick={() => choose(null)}
          >
            Remove
          </button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

function PickerTab({
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
          ? "border-[#37352f] font-medium text-[#37352f]"
          : "border-transparent text-[#37352f]/45 hover:text-[#37352f]/70",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function EmojiButton({
  item,
  tone,
  onChoose,
}: {
  item: EmojiItem;
  tone: string;
  onChoose: (value: string) => void;
}) {
  const emoji = emojiWithTone(item, tone);
  return (
    <button
      type="button"
      aria-label={item.name}
      className="flex size-8 items-center justify-center rounded-md text-[18px] leading-none hover:bg-[#f1f1ef]"
      onClick={() => onChoose(emoji)}
    >
      {emoji}
    </button>
  );
}

const STARTERS: { kind: InsertKind; label: string; icon: typeof Type }[] = [
  { kind: "text", label: "Text", icon: Type },
  { kind: "h1", label: "Heading", icon: Heading1 },
  { kind: "todo", label: "To-do", icon: SquareCheck },
  { kind: "bullet", label: "Bulleted list", icon: List },
  { kind: "callout", label: "Callout", icon: MessageSquare },
  { kind: "code", label: "Code", icon: Code },
  { kind: "table", label: "Table", icon: Table },
  { kind: "mermaid", label: "Mermaid", icon: Workflow },
];

export function GetStarted() {
  return (
    <div className="mt-auto w-full pt-16 pb-6">
      <p className="mb-2.5 text-sm text-[#37352f]/45">Get started with</p>
      <div className="flex flex-wrap items-center gap-2">
        {STARTERS.map((item) => (
          <button
            key={item.kind}
            type="button"
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 text-sm text-[#37352f]/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition duration-200 hover:bg-[#f7f7f5] active:scale-[0.98]"
            onClick={() => requestInsert(item.kind)}
          >
            <item.icon className="size-3.5 text-[#37352f]/55" />
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}