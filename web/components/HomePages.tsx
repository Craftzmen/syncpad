"use client";

import Link from "next/link";
import { Clock, FileText, Pin, Star, Users } from "lucide-react";

import { PageIconView } from "@/components/PageIconView";
import { useWorkspace, type SidebarDoc } from "@/components/WorkspaceShell";
import { displayPageTitle } from "@/lib/page-title";

export function HomePages() {
  const workspace = useWorkspace();
  const documents = workspace?.docs ?? [];
  const pinned = documents.filter((doc) => doc.isPinned && !doc.shared);
  const shared = documents.filter((doc) => doc.shared);
  const favorites = documents.filter((doc) => doc.isFavorite && !doc.isPinned && !doc.shared);
  const recent = documents
    .filter((doc) => !doc.isPinned && !doc.isFavorite && !doc.shared)
    .slice(0, 8);

  return (
    <>
      {pinned.length > 0 ? (
        <section className="mt-10">
          <h3 className="mb-2 flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <Pin className="size-3.5" />
            Pinned
          </h3>
          <ul className="space-y-px">
            {pinned.map((doc) => (
              <PageRow key={doc.id} doc={doc} />
            ))}
          </ul>
        </section>
      ) : null}

      {shared.length > 0 ? (
        <section className="mt-10">
          <h3 className="mb-2 flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <Users className="size-3.5" />
            Shared
          </h3>
          <ul className="space-y-px">
            {shared.map((doc) => (
              <PageRow key={doc.id} doc={doc} />
            ))}
          </ul>
        </section>
      ) : null}

      {favorites.length > 0 ? (
        <section className="mt-10">
          <h3 className="mb-2 flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <Star className="size-3.5 fill-amber-400 text-amber-400" />
            Favorites
          </h3>
          <ul className="space-y-px">
            {favorites.map((doc) => (
              <PageRow key={doc.id} doc={doc} />
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-10">
        <h3 className="mb-2 flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          <Clock className="size-3.5 opacity-70" />
          Recent
        </h3>
        {recent.length > 0 ? (
          <ul className="space-y-px">
            {recent.map((doc) => (
              <PageRow key={doc.id} doc={doc} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No pages yet — use <span className="font-medium text-foreground">New page</span> in the
            sidebar or press{" "}
            <kbd className="rounded border border-border px-1 font-mono text-xs">⌘K</kbd>.
          </p>
        )}
      </section>
    </>
  );
}

function PageRow({ doc }: { doc: SidebarDoc }) {
  const edited = doc.updatedAt ? new Date(doc.updatedAt) : null;
  return (
    <li>
      <Link
        href={`/doc/${doc.id}`}
        className="group flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted/60"
      >
        {doc.icon ? (
          <span className="inline-flex size-4 items-center justify-center">
            <PageIconView value={doc.icon} />
          </span>
        ) : (
          <FileText className="size-4 text-muted-foreground group-hover:text-foreground" />
        )}
        <span className="min-w-0 flex-1 truncate font-medium">{displayPageTitle(doc.title)}</span>
        {edited && !Number.isNaN(edited.getTime()) ? (
          <time
            className="hidden shrink-0 text-xs text-muted-foreground sm:block"
            dateTime={edited.toISOString()}
          >
            {edited.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </time>
        ) : null}
      </Link>
    </li>
  );
}
