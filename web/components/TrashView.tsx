"use client";

import Link from "next/link";
import { useState } from "react";
import { FileText } from "lucide-react";

import { PageIconView } from "@/components/PageIconView";
import { useWorkspace } from "@/components/WorkspaceShell";
import { displayPageTitle } from "@/lib/page-title";

export type TrashedPage = {
  id: string;
  title: string;
  icon: string | null;
  deletedAt: string | null;
};

export function TrashView({ initial }: { initial: TrashedPage[] }) {
  const workspace = useWorkspace();
  const [docs, setDocs] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function restore(doc: TrashedPage) {
    if (busyId) return;
    setBusyId(doc.id);
    const res = await fetch(`/api/documents/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restore: true }),
    });
    setBusyId(null);
    if (!res.ok) return;
    setDocs((current) => current.filter((item) => item.id !== doc.id));
    workspace?.rememberDoc({
      id: doc.id,
      title: doc.title,
      icon: doc.icon,
      isFavorite: false,
    });
  }

  async function removeForever(doc: TrashedPage) {
    if (busyId) return;
    setBusyId(doc.id);
    const res = await fetch(`/api/documents/${doc.id}?permanent=1`, { method: "DELETE" });
    setBusyId(null);
    if (!res.ok) return;
    setConfirmId(null);
    setDocs((current) => current.filter((item) => item.id !== doc.id));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white text-[#0d0d0d]">
      <header className="flex h-11 shrink-0 items-center border-b border-black/[0.06] px-4">
        <h1 className="text-[13px] font-medium">Trash</h1>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-2xl px-6 py-12 sm:px-10">
          <h2 className="text-2xl font-semibold tracking-tight">Trash</h2>
          <p className="mt-1 text-sm text-[#6f6f6f]">
            Deleted pages stay here. Open one to read it, restore it, or delete it permanently.
          </p>
          {docs.length === 0 ? (
            <p className="mt-10 text-sm text-[#8e8e8e]">Trash is empty.</p>
          ) : (
            <ul className="mt-8 overflow-hidden rounded-xl border border-black/[0.08]">
              {docs.map((doc) => {
                const when = doc.deletedAt ? new Date(doc.deletedAt) : null;
                const confirming = confirmId === doc.id;
                return (
                  <li
                    key={doc.id}
                    className="flex items-center gap-3 border-b border-black/[0.06] px-4 py-3 last:border-b-0"
                  >
                    <span className="inline-flex size-5 shrink-0 items-center justify-center text-[#8e8e8e]">
                      {doc.icon ? <PageIconView value={doc.icon} /> : <FileText className="size-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/doc/${doc.id}`}
                        className="block truncate text-sm font-medium hover:underline"
                      >
                        {displayPageTitle(doc.title)}
                      </Link>
                      <p className="truncate text-[12px] text-[#8e8e8e]">
                        {when
                          ? `Deleted ${when.toLocaleString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}`
                          : "Deleted"}
                      </p>
                    </div>
                    {confirming ? (
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          className="h-8 rounded-md px-2.5 text-[13px] hover:bg-black/[0.04]"
                          onClick={() => setConfirmId(null)}
                          disabled={busyId === doc.id}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="h-8 rounded-md bg-[#c44742] px-2.5 text-[13px] font-medium text-white disabled:opacity-50"
                          onClick={() => void removeForever(doc)}
                          disabled={busyId === doc.id}
                        >
                          {busyId === doc.id ? "Deleting…" : "Delete permanently"}
                        </button>
                      </div>
                    ) : (
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          className="h-8 rounded-md border border-black/10 bg-white px-2.5 text-[13px] font-medium hover:bg-[#fafafa] disabled:opacity-50"
                          onClick={() => void restore(doc)}
                          disabled={busyId === doc.id}
                        >
                          {busyId === doc.id ? "Restoring…" : "Restore"}
                        </button>
                        <button
                          type="button"
                          className="h-8 rounded-md px-2.5 text-[13px] text-[#c44742] hover:bg-[#fdf8f7]"
                          onClick={() => setConfirmId(doc.id)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
