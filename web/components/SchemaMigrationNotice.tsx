import Link from "next/link";

export function SchemaMigrationNotice({ detail }: { detail?: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center overflow-y-auto bg-background p-8">
      <div className="max-w-lg space-y-4 rounded-lg border border-border bg-card p-6 shadow-sm">
        <h1 className="text-lg font-semibold tracking-tight">
          Database schema update required
        </h1>
        <p className="text-sm text-muted-foreground">
          SyncPad added page metadata (favorites, cover, trash). Your Neon
          database needs a one-time sync.
        </p>
        <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs text-foreground">
          cd web{"\n"}npm run db:push
        </pre>
        <p className="text-sm text-muted-foreground">
          Restart the dev server after pushing. See{" "}
          <Link href="/settings" className="underline-offset-2 hover:underline">
            settings
          </Link>{" "}
          once you&apos;re back in.
        </p>
        {detail && process.env.NODE_ENV === "development" ? (
          <pre className="max-h-32 overflow-auto rounded-md border border-border p-2 text-[10px] text-muted-foreground">
            {detail}
          </pre>
        ) : null}
      </div>
    </div>
  );
}