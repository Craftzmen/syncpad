import { and, desc, eq, isNotNull, isNull, or } from "drizzle-orm";

import { requireDb } from "@/db";
import {
  documentMembers,
  documents,
  shareLinks,
} from "@/db/schema";

import type { CollabRole } from "./collab-token";
import { isMissingSchemaError, SCHEMA_MIGRATION_HINT } from "./db-errors";

export async function getDocumentRole(
  userId: string | null,
  documentId: string,
): Promise<CollabRole | null> {
  const database = requireDb();
  const [doc] = await database
    .select({ ownerId: documents.ownerId })
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);
  if (!doc) {
    return null;
  }
  if (userId && doc.ownerId === userId) {
    return "edit";
  }
  if (userId) {
    const [member] = await database
      .select({ role: documentMembers.role })
      .from(documentMembers)
      .where(
        and(
          eq(documentMembers.documentId, documentId),
          eq(documentMembers.userId, userId),
        ),
      )
      .limit(1);
    if (member) {
      return member.role;
    }
  }
  return null;
}

export async function getRoleFromShareToken(
  token: string,
  documentId: string,
): Promise<CollabRole | null> {
  const database = requireDb();
  const [link] = await database
    .select()
    .from(shareLinks)
    .where(
      and(
        eq(shareLinks.token, token),
        eq(shareLinks.documentId, documentId),
      ),
    )
    .limit(1);
  if (!link) {
    return null;
  }
  if (link.expiresAt && link.expiresAt < new Date()) {
    return null;
  }
  return link.role;
}

const documentListCache = new Map<
  string,
  { at: number; value: Awaited<ReturnType<typeof queryDocumentsForUser>> }
>();
const DOCUMENT_LIST_TTL_MS = 20_000;

export function invalidateDocumentList(userId: string) {
  documentListCache.delete(userId);
}

async function queryDocumentsForUser(userId: string) {
  const database = requireDb();
  const rows = await database
    .select({ document: documents })
    .from(documents)
    .leftJoin(
      documentMembers,
      and(
        eq(documentMembers.documentId, documents.id),
        eq(documentMembers.userId, userId),
      ),
    )
    .where(
      and(
        isNull(documents.deletedAt),
        or(eq(documents.ownerId, userId), eq(documentMembers.userId, userId)),
      ),
    )
    .orderBy(desc(documents.updatedAt));

  const byId = new Map<string, (typeof rows)[0]["document"]>();
  for (const row of rows) {
    byId.set(row.document.id, row.document);
  }
  return Array.from(byId.values());
}

export async function listTrashedDocuments(userId: string) {
  const database = requireDb();
  return database
    .select()
    .from(documents)
    .where(and(eq(documents.ownerId, userId), isNotNull(documents.deletedAt)))
    .orderBy(desc(documents.deletedAt));
}

export async function listDocumentsForUser(userId: string) {
  const cached = documentListCache.get(userId);
  if (cached && Date.now() - cached.at < DOCUMENT_LIST_TTL_MS) {
    return cached.value;
  }

  try {
    const value = await queryDocumentsForUser(userId);
    documentListCache.set(userId, { at: Date.now(), value });
    return value;
  } catch (error) {
    if (isMissingSchemaError(error)) {
      throw new Error(`${SCHEMA_MIGRATION_HINT}\n\n${String(error)}`, {
        cause: error,
      });
    }
    throw error;
  }
}