import { mapSidebarDocs } from "@/lib/sidebar-docs";
import { isMissingSchemaError, getErrorCause } from "@/lib/db-errors";
import { claimDocumentInvites } from "@/lib/page-mail";
import { invalidateDocumentList, listDocumentsForUser } from "@/lib/permissions";

const claimedAt = new Map<string, number>();
const CLAIM_TTL_MS = 60_000;

export type WorkspaceDocsResult =
  | { ok: true; documents: ReturnType<typeof mapSidebarDocs> }
  | { ok: false; schemaMismatch: true; detail?: string }
  | { ok: false; schemaMismatch: false; detail: string };

export async function loadWorkspaceDocs(
  userId: string,
): Promise<WorkspaceDocsResult> {
  try {
    const lastClaim = claimedAt.get(userId) ?? 0;
    if (Date.now() - lastClaim > CLAIM_TTL_MS) {
      await claimDocumentInvites(userId);
      claimedAt.set(userId, Date.now());
      invalidateDocumentList(userId);
    }
    const documents = await listDocumentsForUser(userId);
    return { ok: true, documents: mapSidebarDocs(documents) };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return {
        ok: false,
        schemaMismatch: true,
        detail: getErrorCause(error),
      };
    }
    return {
      ok: false,
      schemaMismatch: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}