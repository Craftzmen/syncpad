import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

import { auth, signIn } from "@/auth";
import { GitHubButton, GoogleButton, ProductPreview, Wordmark } from "@/components/auth-pages";
import { isDatabaseConfigured } from "@/db";
import { isGitHubOAuthConfigured } from "@/lib/github-auth";
import { isGoogleOAuthConfigured } from "@/lib/google-auth";

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
  const googleReady = isGoogleOAuthConfigured();
  const databaseReady = isDatabaseConfigured();

  return (
    <main className="grid h-full min-h-0 flex-1 bg-white lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)] lg:overflow-hidden">
      <section className="hidden h-full min-h-0 flex-col overflow-y-auto overscroll-contain bg-[#f6f6f4] px-10 py-8 lg:flex xl:px-14">
        <Wordmark />
        <div className="flex min-h-0 flex-1 flex-col justify-center py-10">
          <h1 className="max-w-md text-[36px] leading-[1.1] font-semibold tracking-[-0.035em] text-[#191919]">
            Your pages, ready when you are.
          </h1>
          <p className="mt-3 max-w-sm text-[15px] leading-6 text-black/55">
            Sign in to write with the people already on the document.
          </p>
          <div className="mt-8 max-w-xl">
            <ProductPreview compact />
          </div>
        </div>
      </section>

      <section className="flex h-full min-h-0 flex-col overflow-y-auto overscroll-contain bg-white px-6 py-8 sm:px-10">
        <div className="lg:hidden">
          <Wordmark />
        </div>
        <div className="mx-auto flex w-full max-w-[380px] flex-1 flex-col justify-center py-12">
          <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-[#191919]">Welcome back</h1>
          <p className="mt-2 text-[14px] leading-6 text-black/55">
            Sign in with Google or GitHub to open your pages.
          </p>

          <div className="mt-8 space-y-3">
            {googleReady ? (
              <form
                action={async () => {
                  "use server";
                  await signIn("google", { redirectTo: "/dashboard" });
                }}
              >
                <GoogleButton type="submit" full>
                  Continue with Google
                </GoogleButton>
              </form>
            ) : null}
            {githubReady ? (
              <form
                action={async () => {
                  "use server";
                  await signIn("github", { redirectTo: "/dashboard" });
                }}
              >
                <GitHubButton type="submit" full>
                  Continue with GitHub
                </GitHubButton>
              </form>
            ) : null}
            {!githubReady && !googleReady ? <SetupNotice /> : null}
            {githubReady && !googleReady ? (
              <p className="text-[12px] leading-5 text-black/45">
                Google sign-in appears after <code>AUTH_GOOGLE_ID</code> and{" "}
                <code>AUTH_GOOGLE_SECRET</code> are set.
              </p>
            ) : null}
          </div>

          {!databaseReady ? (
            <div className="mt-4 rounded-xl border border-[#ead9a8] bg-[#fbf6e8] px-4 py-3 text-left text-[13px] leading-5 text-[#5c4b16]">
              <p className="font-medium">Database not connected</p>
              <p className="mt-1 text-[#6d5a24]">
                Add <code className="text-[12px]">DATABASE_URL</code> to{" "}
                <code className="text-[12px]">web/.env.local</code>, then run{" "}
                <code className="text-[12px]">npm run db:push</code> in{" "}
                <code className="text-[12px]">web/</code>. Sign-in can work before that.
                Saving pages needs Postgres.
              </p>
            </div>
          ) : null}

          <Link
            href="/"
            className="mt-6 text-[13px] text-black/45 underline-offset-4 hover:text-black/70 hover:underline"
          >
            Back home
          </Link>
        </div>
      </section>
    </main>
  );
}

function SetupNotice() {
  return (
    <div className="rounded-xl border border-black/[0.08] bg-[#f7f7f5] px-4 py-4 text-left text-[13px] leading-5 text-[#37352f]">
      <p className="font-medium">Sign-in is not configured yet</p>
      <p className="mt-1 text-black/55">
        Add GitHub keys (<code className="text-[12px]">AUTH_GITHUB_ID</code>,{" "}
        <code className="text-[12px]">AUTH_GITHUB_SECRET</code>) or Google keys (
        <code className="text-[12px]">AUTH_GOOGLE_ID</code>,{" "}
        <code className="text-[12px]">AUTH_GOOGLE_SECRET</code>) to{" "}
        <code className="text-[12px]">web/.env.local</code>.
      </p>
      <ol className="mt-3 list-decimal space-y-1.5 pl-4 text-black/55">
        <li>
          Open{" "}
          <a
            href="https://github.com/settings/developers"
            className="text-[#191919] underline underline-offset-2"
            target="_blank"
            rel="noreferrer"
          >
            GitHub developer settings
          </a>{" "}
          and create an OAuth app.
        </li>
        <li>
          Homepage URL: <code className="text-[12px]">http://localhost:3000</code>
        </li>
        <li>
          Callback URL:{" "}
          <code className="text-[12px]">http://localhost:3000/api/auth/callback/github</code>
        </li>
        <li>Restart the dev server after saving the keys.</li>
      </ol>
    </div>
  );
}
