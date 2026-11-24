import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock, FileText, Star } from "lucide-react";

export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { CreatePageClient } from "@/components/CreatePageClient";
import { PageIconView } from "@/components/PageIconView";
import { displayPageTitle } from "@/lib/page-title";
import { listDocumentsForUser } from "@/lib/permissions";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const documents = await listDocumentsForUser(session.user.id);
  const favorites = documents.filter((d) => d.isFavorite);
  const recent = documents.filter((d) => !d.isFavorite).slice(0, 8);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex h-11 shrink-0 items-center border-b border-border/60 px-4">
        <h1 className="text-[13px] font-medium text-foreground/90">Home</h1>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-2xl px-6 py-12 sm:px-10 sm:py-16">
          <p className="text-sm text-muted-foreground">
            {session.user.name
              ? `Good to see you, ${session.user.name.split(" ")[0]}`
              : "Welcome back"}
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            Pick up where you left off
          </h2>

          <div className="mt-8">
            <CreatePageClient />
          </div>

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
                No pages yet — use{" "}
                <span className="font-medium text-foreground">New page</span>{" "}
                in the sidebar or press{" "}
                <kbd className="rounded border border-border px-1 font-mono text-xs">
                  ⌘K
                </kbd>
                .
              </p>
            )}
          </section>

          <p className="mt-12 text-xs text-muted-foreground">
            <Link
              href="/settings"
              className="underline-offset-2 hover:underline"
            >
              Workspace settings
            </Link>{" "}
            — share invites and comment emails are on.
          </p>
        </div>
      </main>
    </div>
  );
}

function PageRow({
  doc,
}: {
  doc: {
    id: string;
    title: string;
    icon: string | null;
    updatedAt: Date;
  };
}) {
  return (
    <li>
      <Link
        href={`/doc/${doc.id}`}
        prefetch={false}
        className="group flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted/60"
      >
        {doc.icon ? (
          <span className="inline-flex size-4 items-center justify-center">
            <PageIconView value={doc.icon} />
          </span>
        ) : (
          <FileText className="size-4 text-muted-foreground group-hover:text-foreground" />
        )}
        <span className="min-w-0 flex-1 truncate font-medium">
          {displayPageTitle(doc.title)}
        </span>
        <time
          className="hidden shrink-0 text-xs text-muted-foreground sm:block"
          dateTime={doc.updatedAt.toISOString()}
        >
          {doc.updatedAt.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </time>
      </Link>
    </li>
  );
}