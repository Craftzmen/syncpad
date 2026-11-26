import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { CreatePageClient } from "@/components/CreatePageClient";
import { HomePages } from "@/components/HomePages";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

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

          <HomePages />

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