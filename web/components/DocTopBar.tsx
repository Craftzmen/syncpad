"use client";

import { useState } from "react";
import {
  ChevronDown,
  Link2,
  Lock,
  MessageSquare,
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
  showComments,
  commentsOpen,
  shared = false,
  updatedAt,
  editedBy,
  onFavoriteToggle,
  onCommentsToggle,
  onShare,
}: {
  documentId: string;
  title: string;
  icon?: string | null;
  canEdit: boolean;
  isFavorite: boolean;
  favoriteLoading?: boolean;
  showComments: boolean;
  commentsOpen: boolean;
  shared?: boolean;
  updatedAt?: string | null;
  editedBy?: string | null;
  onFavoriteToggle: () => void;
  onCommentsToggle: () => void;
  onShare: () => void;
}) {
  const label = displayPageTitle(title);
  const [pageMenu, setPageMenu] = useState(false);
  const [accessMenu, setAccessMenu] = useState(false);

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
                  icon={Link2}
                  label="Copy link"
                  hint="⌘L"
                  onClick={() => {
                    void navigator.clipboard.writeText(window.location.href);
                    setPageMenu(false);
                  }}
                />
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
          title="Copy link"
          className="text-[#37352f]/70 hover:bg-[#efefef]"
          onClick={() => void navigator.clipboard.writeText(window.location.href)}
        >
          <Link2 className="size-4" />
        </Button>
        {canEdit ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
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
        />
      </div>
    </header>
  );
}