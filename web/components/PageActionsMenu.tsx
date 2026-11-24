"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Copy,
  Ellipsis,
  Files,
  History,
  Link2,
  Search,
  Trash2,
} from "lucide-react";

import {
  NotionMenuItem,
  NotionMenuLabel,
  NotionMenuPanel,
} from "@/components/NotionMenu";
import { useWorkspace } from "@/components/WorkspaceShell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type Action = {
  id: string;
  label: string;
  hint?: string;
  icon: typeof Link2;
  destructive?: boolean;
  run: () => void | Promise<void>;
};

export function PageActionsMenu({
  documentId,
  canEdit,
  updatedAt,
  editedBy,
}: {
  documentId: string;
  canEdit: boolean;
  updatedAt?: string | null;
  editedBy?: string | null;
}) {
  const router = useRouter();
  const workspace = useWorkspace();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [versions, setVersions] = useState<
    { id: string; label: string | null; createdAt: string }[]
  >([]);

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setNotice("Link copied");
  }

  async function copyContents() {
    const res = await fetch(`/api/documents/${documentId}/export?format=md`);
    if (!res.ok) return;
    await navigator.clipboard.writeText(await res.text());
    setNotice("Page contents copied");
  }

  async function duplicate() {
    const res = await fetch(`/api/documents/${documentId}/duplicate`, {
      method: "POST",
    });
    if (!res.ok) return;
    const doc = (await res.json()) as { id: string; title: string; icon: string | null };
    workspace?.rememberDoc({
      id: doc.id,
      title: doc.title,
      icon: doc.icon,
      isFavorite: false,
    });
    setOpen(false);
    router.push(`/doc/${doc.id}`);
  }

  async function saveVersion() {
    await fetch(`/api/documents/${documentId}/snapshots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: new Date().toLocaleString() }),
    });
    setNotice("Version saved");
  }

  async function openHistory() {
    const res = await fetch(`/api/documents/${documentId}/snapshots`);
    if (!res.ok) return;
    setVersions(await res.json());
    setHistoryOpen(true);
    setOpen(false);
  }

  async function moveToTrash() {
    const res = await fetch(`/api/documents/${documentId}`, { method: "DELETE" });
    if (!res.ok) return;
    workspace?.forgetDoc(documentId);
    setOpen(false);
    router.push("/dashboard");
  }

  const actions = useMemo<Action[]>(() => {
    const items: Action[] = [
      { id: "link", label: "Copy link", hint: "⌘L", icon: Link2, run: copyLink },
      {
        id: "contents",
        label: "Copy page contents",
        icon: Copy,
        run: copyContents,
      },
    ];
    if (canEdit) {
      items.push(
        { id: "dup", label: "Duplicate", hint: "⌘D", icon: Files, run: duplicate },
        {
          id: "history",
          label: "Version history",
          icon: History,
          run: openHistory,
        },
        {
          id: "save",
          label: "Save version",
          icon: History,
          run: saveVersion,
        },
        {
          id: "trash",
          label: "Move to Trash",
          icon: Trash2,
          destructive: true,
          run: moveToTrash,
        },
      );
    }
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEdit, documentId]);

  const filtered = actions.filter((action) =>
    action.label.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const edited = updatedAt ? new Date(updatedAt) : null;

  return (
    <>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setQuery("");
            setNotice(null);
          }
        }}
      >
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-[#37352f]/70 hover:bg-[#efefef] hover:text-[#37352f]"
              title="More"
            >
              <Ellipsis className="size-4" />
            </Button>
          }
        />
        <PopoverContent
          align="end"
          sideOffset={6}
          className="w-auto border-0 bg-transparent p-0 shadow-none ring-0"
        >
          <NotionMenuPanel>
          <div className="flex items-center gap-2 border-b border-black/5 px-3 py-2">
            <Search className="size-3.5 text-[#37352f]/40" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search actions…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-[#37352f]/35"
            />
          </div>
          <div className="p-1">
            <NotionMenuLabel>Actions</NotionMenuLabel>
            {filtered.map((action) => (
              <NotionMenuItem
                key={action.id}
                icon={action.icon}
                label={action.label}
                hint={action.hint}
                onClick={() => void action.run()}
              />
            ))}
            {filtered.length === 0 ? (
              <p className="px-2 py-3 text-sm text-[#37352f]/45">No actions</p>
            ) : null}
          </div>
          <div className="border-t border-black/5 px-3 py-2 text-[11px] leading-relaxed text-[#37352f]/45">
            {notice ? (
              <p className="text-[#37352f]/70">{notice}</p>
            ) : (
              <>
                <p>Last edited</p>
                <p>{editedBy ?? "You"}</p>
                <p>
                  {edited
                    ? edited.toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "Just now"}
                </p>
              </>
            )}
          </div>
          </NotionMenuPanel>
        </PopoverContent>
      </Popover>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Version history</DialogTitle>
          </DialogHeader>
          {versions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No saved versions yet. Use Save version from this menu.
            </p>
          ) : (
            <ul className="max-h-64 space-y-1 overflow-y-auto">
              {versions.map((version) => (
                <li
                  key={version.id}
                  className="rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <p className="font-medium">{version.label || "Snapshot"}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(version.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}