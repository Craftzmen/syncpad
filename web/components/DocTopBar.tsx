"use client";

import { useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Link2,
  Lock,
  MessageSquare,
  Pin,
  Share,
  Star,
} from "lucide-react";

import {
  NotionMenuItem,
  NotionMenuLabel,
  NotionMenuPanel,
} from "@/components/NotionMenu";
import { PageActionsMenu } from "@/components/PageActionsMenu";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PageIconView } from "@/components/PageIconView";
import { displayPageTitle } from "@/lib/page-title";
import { cn } from "@/lib/utils";

export function DocTopBar({
  documentId,
  title,
  icon,
  canEdit,
  isFavorite,
  favoriteLoading,
  isPinned,
  pinLoading,
  showComments,
  commentsOpen,
  shared = false,
  updatedAt,
  editedBy,
  onFavoriteToggle,
  onPinToggle,
  onCommentsToggle,
  onShare,
  historyOpen,
  onOpenHistory,
  onSaveVersion,
}: {
  documentId: string;
  title: string;
  icon?: string | null;
  canEdit: boolean;
  isFavorite: boolean;
  favoriteLoading?: boolean;
  isPinned: boolean;
  pinLoading?: boolean;
  showComments: boolean;
  commentsOpen: boolean;
  shared?: boolean;
  updatedAt?: string | null;
  editedBy?: string | null;
  onFavoriteToggle: () => void;
  onPinToggle: () => void;
  onCommentsToggle: () => void;
  onShare: () => void;
  historyOpen: boolean;
  onOpenHistory: () => void;
  onSaveVersion: () => Promise<boolean>;
}) {
  const label = displayPageTitle(title);
  const [pageMenu, setPageMenu] = useState(false);
  const [accessMenu, setAccessMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef(0);

  async function copyLink() {
    const url = window.location.href;
    let copiedOk = false;
    try {
      await navigator.clipboard.writeText(url);
      copiedOk = true;
    } catch {
      const field = document.createElement("textarea");
      field.value = url;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.left = "-9999px";
      document.body.appendChild(field);
      field.select();
      copiedOk = document.execCommand("copy");
      field.remove();
    }
    if (!copiedOk) return;
    setCopied(true);
    window.clearTimeout(copiedTimer.current);
    copiedTimer.current = window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <header className="sticky top-0 z-20 flex h-11 shrink-0 items-center gap-1 bg-white px-2 sm:px-3">
      <nav className="flex min-w-0 flex-1 items-center gap-0.5 text-sm text-[#37352f]/80">
        {icon ? (
          <span className="mr-1 inline-flex size-4 items-center justify-center">
            <PageIconView value={icon} />
          </span>
        ) : null}
        <Popover open={pageMenu} onOpenChange={setPageMenu}>
          <PopoverTrigger className="flex max-w-[220px] items-center gap-0.5 rounded px-1.5 py-0.5 hover:bg-[#efefef]">
            <span className="truncate">{label}</span>
            <ChevronDown className="size-3.5 shrink-0 text-[#37352f]/35" />
          </PopoverTrigger>
          <PopoverContent
            align="start"
            sideOffset={6}
            className="w-auto border-0 bg-transparent p-0 shadow-none ring-0"
          >
            <NotionMenuPanel>
              <div className="p-1">
                <NotionMenuLabel>Page</NotionMenuLabel>
                <NotionMenuItem
                  icon={copied ? Check : Link2}
                  label={copied ? "Link copied" : "Copy link"}
                  hint="⌘L"
                  onClick={() => {
                    void copyLink();
                    setPageMenu(false);
                  }}
                />
                {canEdit ? (
                  <NotionMenuItem
                    icon={Pin}
                    label={isPinned ? "Unpin page" : "Pin page"}
                    onClick={() => {
                      onPinToggle();
                      setPageMenu(false);
                    }}
                  />
                ) : null}
                {canEdit ? (
                  <NotionMenuItem
                    icon={Star}
                    label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                    onClick={() => {
                      onFavoriteToggle();
                      setPageMenu(false);
                    }}
                  />
                ) : null}
                <NotionMenuItem
                  icon={Lock}
                  label="Settings"
                  href="/settings"
                />
              </div>
            </NotionMenuPanel>
          </PopoverContent>
        </Popover>
        <Popover open={accessMenu} onOpenChange={setAccessMenu}>
          <PopoverTrigger className="ml-1 hidden items-center gap-1 rounded px-1.5 py-0.5 text-[13px] text-[#37352f]/55 hover:bg-[#efefef] sm:inline-flex">
            <Lock className="size-3.5" />
            {shared ? "Shared" : "Private"}
            <ChevronDown className="size-3 text-[#37352f]/35" />
          </PopoverTrigger>
          <PopoverContent
            align="start"
            sideOffset={6}
            className="w-auto border-0 bg-transparent p-0 shadow-none ring-0"
          >
            <NotionMenuPanel className="w-[240px]">
              <div className="p-1">
                <NotionMenuLabel>Access</NotionMenuLabel>
                <NotionMenuItem icon={Lock} label={shared ? "Shared" : "Private"} active />
                {canEdit ? (
                  <NotionMenuItem
                    icon={Share}
                    label="Share"
                    onClick={() => {
                      setAccessMenu(false);
                      onShare();
                    }}
                  />
                ) : null}
              </div>
            </NotionMenuPanel>
          </PopoverContent>
        </Popover>
      </nav>

      <div className="flex items-center gap-0.5">
        <div id="syncpad-presence" className="flex items-center" />
        {canEdit ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 rounded-md border-black/10 bg-white px-2 text-[13px] font-medium text-[#37352f] shadow-none hover:bg-[#f7f7f5]"
            onClick={onShare}
          >
            <Share className="size-3.5" />
            Share
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          title={copied ? "Link copied" : "Copy link"}
          aria-label={copied ? "Link copied" : "Copy link"}
          className={cn(
            "text-[#37352f]/70 hover:bg-[#efefef]",
            copied && "text-[#1f7a45]",
          )}
          onClick={() => void copyLink()}
        >
          {copied ? <Check className="size-4" /> : <Link2 className="size-4" />}
        </Button>
        {canEdit ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            title={isPinned ? "Unpin page" : "Pin page"}
            aria-pressed={isPinned}
            disabled={pinLoading}
            className="text-[#37352f]/70 hover:bg-[#efefef]"
            onClick={onPinToggle}
          >
            <Pin
              className={cn("size-4", isPinned && "fill-[#37352f] text-[#37352f]")}
            />
          </Button>
        ) : null}
        {canEdit ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            aria-pressed={isFavorite}
            disabled={favoriteLoading}
            className="text-[#37352f]/70 hover:bg-[#efefef]"
            onClick={onFavoriteToggle}
          >
            <Star
              className={cn(
                "size-4",
                isFavorite && "fill-amber-400 text-amber-500",
              )}
            />
          </Button>
        ) : null}
        {showComments ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            title="Comments"
            className={cn(
              "text-[#37352f]/70 hover:bg-[#efefef]",
              commentsOpen && "bg-[#efefef] text-[#37352f]",
            )}
            onClick={onCommentsToggle}
          >
            <MessageSquare className="size-4" />
          </Button>
        ) : null}
        <PageActionsMenu
          documentId={documentId}
          canEdit={canEdit}
          updatedAt={updatedAt}
          editedBy={editedBy}
          historyOpen={historyOpen}
          onOpenHistory={onOpenHistory}
          onSaveVersion={onSaveVersion}
        />
      </div>
    </header>
  );
}