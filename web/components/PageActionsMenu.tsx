"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Copy,
  Ellipsis,
  FileCode,
  FileDown,
  FileText,
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { writeClipboard } from "@/lib/clipboard";
import { readPageTitle, requestPageExport, requestPageText } from "@/lib/editor-events";
import {
  downloadText,
  exportFileName,
  katexCssFromDocument,
  openPrintWindow,
  pageIsEmpty,
  pageToHtml,
  pageToMarkdown,
  printHtml,
} from "@/lib/export-page";
import { parsePageIcon } from "@/lib/page-icons";
import { isGhostTitle } from "@/lib/page-title";

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
  historyOpen = false,
  onOpenHistory,
  onSaveVersion,
}: {
  documentId: string;
  canEdit: boolean;
  updatedAt?: string | null;
  editedBy?: string | null;
  historyOpen?: boolean;
  onOpenHistory: () => void;
  onSaveVersion: () => Promise<boolean>;
}) {
  const router = useRouter();
  const workspace = useWorkspace();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const exporting = useRef(false);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function copyLink() {
    const ok = await writeClipboard(window.location.href);
    setToast(ok ? "Link copied" : "Couldn't copy the link");
    setOpen(false);
  }

  async function copyContents() {
    const body = (await requestPageText())?.trim() ?? "";
    const rawTitle = readPageTitle().trim();
    const heading = isGhostTitle(rawTitle) ? "" : rawTitle;
    const text = [heading, body].filter(Boolean).join("\n\n");
    if (!text.trim()) {
      setToast("This page is empty");
      setOpen(false);
      return;
    }
    const ok = await writeClipboard(text);
    setToast(ok ? "Page contents copied" : "Couldn't copy this page");
    setOpen(false);
  }

  async function exportPage(kind: "pdf" | "html" | "md") {
    if (exporting.current) return;
    exporting.current = true;
    setOpen(false);
    const preview = kind === "pdf" ? openPrintWindow() : null;
    if (kind === "pdf" && !preview) {
      exporting.current = false;
      setToast("Allow pop-ups to export a PDF");
      return;
    }
    try {
      const doc = await requestPageExport();
      const title = readPageTitle();
      if (!doc || (pageIsEmpty(doc) && isGhostTitle(title))) {
        preview?.close();
        setToast(doc ? "This page is empty" : "This page is still opening");
        return;
      }
      const icon = parsePageIcon(
        workspace?.docs.find((item) => item.id === documentId)?.icon,
      );
      const emoji = icon?.kind === "emoji" ? icon.emoji : null;
      if (kind === "md") {
        const name = exportFileName(title, "md");
        downloadText(name, "text/markdown", pageToMarkdown(doc, title));
        setToast(`Downloaded ${name}`);
        return;
      }
      const html = await pageToHtml(doc, title, {
        emoji,
        extraCss: katexCssFromDocument(),
      });
      if (kind === "html") {
        const name = exportFileName(title, "html");
        downloadText(name, "text/html", html);
        setToast(`Downloaded ${name}`);
        return;
      }
      if (preview) {
        await printHtml(preview, html);
        setToast("Choose Save as PDF");
      }
    } catch {
      preview?.close();
      setToast("Couldn't export this page");
    } finally {
      exporting.current = false;
    }
  }

  async function duplicate() {
    setOpen(false);
    const res = await fetch(`/api/documents/${documentId}/duplicate`, { method: "POST" });
    if (!res.ok) {
      setToast("Couldn't duplicate this page");
      return;
    }
    const doc = (await res.json()) as { id: string; title: string; icon: string | null };
    workspace?.rememberDoc({
      id: doc.id,
      title: doc.title,
      icon: doc.icon,
      isFavorite: false,
      isPinned: false,
    });
    router.push(`/doc/${doc.id}`);
  }

  async function saveVersion() {
    setOpen(false);
    const ok = await onSaveVersion();
    setToast(ok ? "Version saved" : "Couldn't save this version");
  }

  function openHistory() {
    setOpen(false);
    onOpenHistory();
  }

  async function moveToTrash() {
    setOpen(false);
    workspace?.forgetDoc(documentId);
    router.push("/dashboard");
    const res = await fetch(`/api/documents/${documentId}`, { method: "DELETE" });
    if (!res.ok) {
      workspace?.rememberDoc({
        id: documentId,
        title: "New page",
        icon: null,
        isFavorite: false,
        isPinned: false,
      });
      router.push(`/doc/${documentId}`);
      setToast("Couldn't move this page to Trash");
    }
  }

  const shortcuts = useRef({ copyLink, duplicate, canEdit });
  shortcuts.current = { copyLink, duplicate, canEdit };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.shiftKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === "l") {
        event.preventDefault();
        void shortcuts.current.copyLink();
      } else if (key === "d" && shortcuts.current.canEdit) {
        event.preventDefault();
        void shortcuts.current.duplicate();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const actions: Action[] = [
    { id: "link", label: "Copy link", hint: "⌘L", icon: Link2, run: copyLink },
    { id: "contents", label: "Copy page contents", icon: Copy, run: copyContents },
    { id: "export-pdf", label: "Export as PDF", icon: FileDown, run: () => exportPage("pdf") },
    { id: "export-html", label: "Export as HTML", icon: FileCode, run: () => exportPage("html") },
    { id: "export-md", label: "Export as Markdown", icon: FileText, run: () => exportPage("md") },
  ];
  const owned = workspace?.docs.find((doc) => doc.id === documentId)?.owned !== false;
  if (canEdit) {
    actions.push(
      { id: "dup", label: "Duplicate", hint: "⌘D", icon: Files, run: duplicate },
      { id: "history", label: "Version history", icon: History, run: openHistory },
      { id: "save", label: "Save version", icon: History, run: saveVersion },
    );
    if (owned) {
      actions.push({
        id: "trash",
        label: "Move to Trash",
        icon: Trash2,
        destructive: true,
        run: moveToTrash,
      });
    }
  }

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
          if (!next) setQuery("");
        }}
      >
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-[#37352f]/70 hover:bg-[#efefef] hover:text-[#37352f] data-[popup-open]:bg-[#efefef]"
              title="More"
              aria-pressed={historyOpen}
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
              {filtered.map((action, index) => (
                <Fragment key={action.id}>
                  {action.id.startsWith("export") &&
                  !filtered[index - 1]?.id.startsWith("export") ? (
                    <NotionMenuLabel>Export</NotionMenuLabel>
                  ) : null}
                  <NotionMenuItem
                    icon={action.icon}
                    label={action.label}
                    hint={action.hint}
                    destructive={action.destructive}
                    immediate
                    onClick={() => void action.run()}
                  />
                </Fragment>
              ))}
              {filtered.length === 0 ? (
                <p className="px-2 py-3 text-sm text-[#37352f]/45">No actions</p>
              ) : null}
            </div>
            <div className="border-t border-black/5 px-3 py-2 text-[11px] leading-relaxed text-[#37352f]/45">
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
            </div>
          </NotionMenuPanel>
        </PopoverContent>
      </Popover>
      {toast ? (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-[#37352f] px-3 py-1.5 text-[13px] text-white shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
          {toast}
        </div>
      ) : null}
    </>
  );
}
