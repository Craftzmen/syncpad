"use client";

import { useRouter } from "next/navigation";
import {
  Download,
  Ellipsis,
  History,
  Trash2,
} from "lucide-react";

import { askConfirm } from "@/components/editor/editor-prompt";
import { useWorkspace } from "@/components/WorkspaceShell";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function DocToolbar({
  documentId,
  canEdit,
}: {
  documentId: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const workspace = useWorkspace();

  async function saveSnapshot() {
    await fetch(`/api/documents/${documentId}/snapshots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: new Date().toLocaleString() }),
    });
  }

  function exportDoc(format: "html" | "md") {
    window.open(`/api/documents/${documentId}/export?format=${format}`, "_blank");
  }

  async function moveToTrash() {
    const ok = await askConfirm({
      title: "Move this page to trash?",
      description: "You can restore it later from the sidebar.",
      confirmLabel: "Move to trash",
    });
    if (!ok) return;
    workspace?.forgetDoc(documentId);
    router.push("/dashboard");
    const res = await fetch(`/api/documents/${documentId}`, {
      method: "DELETE",
    });
    if (!res.ok) router.push(`/doc/${documentId}`);
  }

  return (
    <div className="flex items-center gap-0.5">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground"
            >
              <Ellipsis className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-48">
          {canEdit ? (
            <DropdownMenuItem
              className="gap-2"
              onClick={saveSnapshot}
            >
              <History className="size-4 opacity-70" />
              Save version
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            className="gap-2"
            onClick={() => exportDoc("html")}
          >
            <Download className="size-4 opacity-70" />
            Export HTML
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2" onClick={() => exportDoc("md")}>
            <Download className="size-4 opacity-70" />
            Export Markdown
          </DropdownMenuItem>
          {canEdit ? (
            <DropdownMenuItem
              variant="destructive"
              className="gap-2"
              onClick={moveToTrash}
            >
              <Trash2 className="size-4 opacity-70" />
              Move to trash
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}