import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

import { auth, signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { isDatabaseConfigured } from "@/db";
import { isGitHubOAuthConfigured } from "@/lib/github-auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  if (session?.user) {
    const callback = (await searchParams).callbackUrl;
    redirect(
      callback?.startsWith("/") && !callback.startsWith("//")
        ? callback
        : "/dashboard",
    );
  }

  const githubReady = isGitHubOAuthConfigured();
  const databaseReady = isDatabaseConfigured();

  return (
    <main className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-6 overflow-y-auto overscroll-contain px-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to create and edit documents.
        </p>
      </div>

      {!databaseReady ? (
        <div className="max-w-md rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-left text-sm">
          <p className="font-medium">Database not connected</p>
          <p className="mt-1 text-muted-foreground">
            Add your Neon <code className="text-xs">DATABASE_URL</code> to{" "}
            <code className="text-xs">web/.env.local</code>, then run{" "}
            <code className="text-xs">npm run db:push</code> in{" "}
            <code className="text-xs">web/</code>. GitHub login can work without
            it, but saving users/documents requires Postgres.
          </p>
        </div>
      ) : null}

      {githubReady ? (
        <form
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: "/dashboard" });
          }}
        >
          <Button type="submit" size="lg">
            Continue with GitHub
          </Button>
        </form>
      ) : (
        <div className="max-w-md space-y-3 rounded-lg border bg-muted/30 p-4 text-left text-sm">
          <p className="font-medium">GitHub sign-in is not configured yet</p>
          <p className="text-muted-foreground">
            The OAuth URL had an empty <code className="text-xs">client_id</code>{" "}
            because <code className="text-xs">AUTH_GITHUB_ID</code> and{" "}
            <code className="text-xs">AUTH_GITHUB_SECRET</code> are missing in{" "}
            <code className="text-xs">web/.env.local</code>.
          </p>
          <ol className="list-decimal space-y-1 pl-4 text-muted-foreground">
            <li>
              Open{" "}
              <a
                href="https://github.com/settings/developers"
                className="text-foreground underline"
                target="_blank"
                rel="noreferrer"
              >
                GitHub → Developer settings → OAuth Apps
              </a>{" "}
              → <strong>New OAuth App</strong>
            </li>
            <li>
              Homepage URL: <code className="text-xs">http://localhost:3000</code>
            </li>
            <li>
              Callback URL:{" "}
              <code className="text-xs">
                http://localhost:3000/api/auth/callback/github
              </code>
            </li>
            <li>Copy Client ID and Client Secret into <code className="text-xs">web/.env.local</code></li>
            <li>Restart <code className="text-xs">npm run dev</code> in <code className="text-xs">web/</code></li>
          </ol>
        </div>
      )}

      <Link href="/" className="text-sm text-muted-foreground hover:underline">
        Back home
      </Link>
    </main>
  );
}