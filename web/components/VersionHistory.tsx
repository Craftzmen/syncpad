"use client";

import { useCallback, useEffect, useState } from "react";
import { History, X } from "lucide-react";

import { requestDocumentState, requestRestoreState } from "@/lib/editor-events";

export type PageVersion = {
  id: string;
  label: string | null;
  createdAt: string;
};

function versionLabel(version: PageVersion) {
  if (version.label?.trim()) return version.label.trim();
  return new Date(version.createdAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function useVersionHistory(documentId: string) {
  const [versions, setVersions] = useState<PageVersion[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/documents/${documentId}/snapshots`);
    setReady(true);
    if (!res.ok) return false;
    setVersions((await res.json()) as PageVersion[]);
    return true;
  }, [documentId]);

  const save = useCallback(async () => {
    const state = await requestDocumentState();
    const res = await fetch(`/api/documents/${documentId}/snapshots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: new Date().toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }),
        state: state ?? undefined,
      }),
    });
    if (!res.ok) return false;
    const row = (await res.json()) as PageVersion;
    setVersions((current) => [row, ...current.filter((item) => item.id !== row.id)]);
    setReady(true);
    return true;
  }, [documentId]);

  const restore = useCallback(
    async (versionId: string) => {
      const res = await fetch(`/api/documents/${documentId}/snapshots/${versionId}`, {
        method: "POST",
      });
      if (!res.ok) return false;
      const body = (await res.json()) as { state?: string };
      if (!body.state) return false;
      requestRestoreState(body.state);
      return true;
    },
    [documentId],
  );

  return { versions, ready, refresh, save, restore };
}

export function VersionHistoryDrawer({
  versions,
  ready,
  onSave,
  onRestore,
  onClose,
}: {
  versions: PageVersion[];
  ready: boolean;
  onSave: () => Promise<boolean>;
  onRestore: (id: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function save() {
    if (saving) return;
    setSaving(true);
    setNote(null);
    const ok = await onSave();
    setSaving(false);
    setNote(ok ? "Version saved" : "Couldn't save this version");
  }

  async function restore(id: string) {
    if (restoringId) return;
    setRestoringId(id);
    setNote(null);
    const ok = await onRestore(id);
    setRestoringId(null);
    setConfirmId(null);
    setNote(ok ? "Version restored" : "Couldn't restore this version");
  }

  return (
    <aside
      data-version-history
      className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[22.5rem] min-h-0 flex-col overflow-hidden border-l border-black/[0.08] bg-white sm:static sm:z-auto sm:w-[22.5rem] sm:max-w-none sm:shrink-0"
    >
      <div className="flex h-12 shrink-0 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <History className="size-4 text-[#37352f]/70" />
          <h2 className="text-[14px] font-medium text-[#37352f]">Version history</h2>
        </div>
        <button
          type="button"
          aria-label="Close version history"
          className="flex size-7 items-center justify-center rounded-md text-[#37352f]/55 hover:bg-[#f1f1ef] hover:text-[#37352f]"
          onClick={onClose}
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="flex h-8 w-full items-center justify-center rounded-lg bg-[#37352f] text-[13px] font-medium text-white hover:bg-[#2f2d2a] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save current version"}
        </button>
        <p className="mt-2 px-1 text-[12px] leading-5 text-[#37352f]/45">
          Restoring replaces the page with that saved copy.
        </p>
        {note ? <p className="mt-2 px-1 text-[12px] font-medium text-[#37352f]/75">{note}</p> : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {!ready ? (
          <p className="px-1 text-[13px] text-[#37352f]/45">Loading versions…</p>
        ) : versions.length === 0 ? (
          <p className="px-1 text-[13px] leading-5 text-[#37352f]/45">
            No saved versions yet.
          </p>
        ) : (
          <ul className="space-y-1">
            {versions.map((version) => {
              const confirming = confirmId === version.id;
              const restoring = restoringId === version.id;
              return (
                <li key={version.id} className="rounded-xl px-2 py-2 hover:bg-[#f7f7f5]">
                  <p className="text-[13px] font-medium text-[#37352f]">{versionLabel(version)}</p>
                  <p className="mt-0.5 text-[12px] text-[#37352f]/45">
                    {new Date(version.createdAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    {confirming ? (
                      <>
                        <button
                          type="button"
                          disabled={Boolean(restoringId)}
                          onClick={() => void restore(version.id)}
                          className="h-7 rounded-md bg-[#37352f] px-2 text-[12px] font-medium text-white disabled:opacity-50"
                        >
                          {restoring ? "Restoring…" : "Restore this version"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmId(null)}
                          className="h-7 rounded-md px-2 text-[12px] text-[#37352f]/70 hover:bg-[#efefef]"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmId(version.id)}
                        className="h-7 rounded-md px-2 text-[12px] font-medium text-[#37352f] shadow-[0_0_0_1px_rgba(0,0,0,0.08)] hover:bg-white"
                      >
                        Restore
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
