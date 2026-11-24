export function isMissingSchemaError(error: unknown): boolean {
  const cause = getErrorCause(error);
  if (!cause) return false;
  const message = String(cause);
  return (
    message.includes("does not exist") &&
    (message.includes("column") ||
      message.includes("relation") ||
      message.includes("42703"))
  );
}

export function getErrorCause(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const withCause = error as { cause?: unknown; message?: string };
  if (withCause.cause) {
    if (withCause.cause instanceof Error) {
      return withCause.cause.message;
    }
    return String(withCause.cause);
  }
  return withCause.message;
}

export const SCHEMA_MIGRATION_HINT =
  "Database schema is out of date. From the web folder run: npm run db:push — then restart the dev server.";