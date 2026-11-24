import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-8 overflow-y-auto overscroll-contain px-6 py-24">
      <div className="max-w-lg text-center">
        <h1 className="text-4xl font-semibold tracking-tight">SyncPad</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Collaborative documents with a calm, Notion-like editor. Real-time
          sync, presence, and sharing.
        </p>
      </div>
      <Link href="/login">
        <Button size="lg">Sign in with GitHub</Button>
      </Link>
    </main>
  );
}