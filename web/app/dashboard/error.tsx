"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const needsMigration =
    error.message.includes("db:push") ||
    error.message.includes("out of date");

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-lg font-semibold">
          {needsMigration ? "Database needs a quick update" : "Something went wrong"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {needsMigration ? (
            <>
              New page fields (favorites, cover, trash) require a schema sync.
              In a terminal run:
              <code className="mt-3 block rounded-md bg-muted px-3 py-2 text-left text-xs text-foreground">
                cd web && npm run db:push
              </code>
              Then restart <code className="text-xs">npm run dev:web</code>.
            </>
          ) : (
            error.message || "An unexpected error occurred."
          )}
        </p>
        <button
          type="button"
          onClick={reset}
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Try again
        </button>
      </div>
    </div>
  );
}