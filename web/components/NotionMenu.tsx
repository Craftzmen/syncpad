import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function NotionMenuPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "w-[280px] overflow-hidden rounded-xl border border-black/10 bg-white p-0 text-[#37352f] shadow-[0_8px_28px_rgba(0,0,0,0.12)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function NotionMenuLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-2 pt-1.5 pb-1 text-[11px] font-medium text-[#37352f]/45">
      {children}
    </p>
  );
}

export function NotionMenuItem({
  icon: Icon,
  label,
  hint,
  href,
  onClick,
  active,
  destructive,
  immediate,
}: {
  icon: LucideIcon;
  label: string;
  hint?: string;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  destructive?: boolean;
  immediate?: boolean;
}) {
  const className = cn(
    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-[#37352f]",
    destructive && "text-[#c44742]",
    active ? "bg-[#f1f1ef]" : "hover:bg-[#f1f1ef]",
  );
  const inner = (
    <>
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded border border-black/10 bg-white text-[#37352f]/70",
          destructive && "border-[#f0d4d2] text-[#c44742]",
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
      {hint ? (
        <span className="shrink-0 text-[11px] text-[#37352f]/35">{hint}</span>
      ) : null}
    </>
  );

  if (href) {
    return (
      <a href={href} className={className}>
        {inner}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={className}
      onPointerDown={
        immediate
          ? (event) => {
              if (event.button !== 0) return;
              event.preventDefault();
              onClick?.();
            }
          : undefined
      }
      onClick={immediate ? undefined : onClick}
    >
      {inner}
    </button>
  );
}