"use client";

import { PAGE_ICON_MAP, parsePageIcon } from "@/lib/page-icons";
import { cn } from "@/lib/utils";

export function PageIconView({
  value,
  variant = "small",
  className,
}: {
  value: string | null | undefined;
  variant?: "page" | "small";
  className?: string;
}) {
  const parsed = parsePageIcon(value);
  if (!parsed) return null;

  if (parsed.kind === "emoji") {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center overflow-visible leading-none",
          variant === "page" ? "size-[68px] text-[62px]" : "size-4 text-[15px]",
          className,
        )}
      >
        {parsed.emoji}
      </span>
    );
  }

  const Icon = PAGE_ICON_MAP[parsed.name];
  if (!Icon) return null;
  if (variant === "page") {
    return (
      <span
        className={cn(
          "flex size-[78px] items-center justify-center rounded-[22px] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]",
          className,
        )}
        style={{ backgroundColor: parsed.color }}
      >
        <Icon className="size-9" color="#ffffff" strokeWidth={2} aria-hidden />
      </span>
    );
  }
  return (
    <span className={cn("inline-flex size-4 items-center justify-center", className)}>
      <Icon className="size-4" color={parsed.color} strokeWidth={1.75} aria-hidden />
    </span>
  );
}
