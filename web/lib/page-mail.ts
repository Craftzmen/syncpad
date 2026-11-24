import { and, eq, inArray, sql } from "drizzle-orm";

import { requireDb } from "@/db";
import {
  documentInvites,
  documentMembers,
  documents,
  users,
} from "@/db/schema";
import { appOrigin, emailDocument, sendEmail } from "@/lib/email";
import { invalidateDocumentList } from "@/lib/permissions";
import { displayPageTitle } from "@/lib/page-title";
import { isMissingSchemaError } from "@/lib/db-errors";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function claimDocumentInvites(userId: string) {
  const database = requireDb();
  try {
    const [user] = await database
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user?.email) return;

    const email = normalizeEmail(user.email);
    const pending = await database
      .select()
      .from(documentInvites)
      .where(eq(documentInvites.email, email));
    if (pending.length === 0) return;

    for (const invite of pending) {
      await database
        .insert(documentMembers)
        .values({
          documentId: invite.documentId,
          userId,
          role: invite.role,
        })
        .onConflictDoUpdate({
          target: [documentMembers.documentId, documentMembers.userId],
          set: { role: invite.role },
        });
    }

    await database.delete(documentInvites).where(eq(documentInvites.email, email));
    invalidateDocumentList(userId);
  } catch (error) {
    if (!isMissingSchemaError(error)) throw error;
  }
}

export async function inviteToDocument(options: {
  documentId: string;
  email: string;
  role: "view" | "edit";
  invitedById: string;
  url: string;
}) {
  const email = normalizeEmail(options.email);
  const database = requireDb();

  await database
    .insert(documentInvites)
    .values({
      documentId: options.documentId,
      email,
      role: options.role,
      invitedById: options.invitedById,
    })
    .onConflictDoUpdate({
      target: [documentInvites.documentId, documentInvites.email],
      set: { role: options.role, invitedById: options.invitedById },
    });

  const [existing] = await database
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);

  const [doc] = await database
    .select({ title: documents.title, ownerId: documents.ownerId })
    .from(documents)
    .where(eq(documents.id, options.documentId))
    .limit(1);

  if (existing && existing.id !== doc?.ownerId) {
    await database
      .insert(documentMembers)
      .values({
        documentId: options.documentId,
        userId: existing.id,
        role: options.role,
      })
      .onConflictDoUpdate({
        target: [documentMembers.documentId, documentMembers.userId],
        set: { role: options.role },
      });
    await database
      .delete(documentInvites)
      .where(
        and(
          eq(documentInvites.documentId, options.documentId),
          eq(documentInvites.email, email),
        ),
      );
    invalidateDocumentList(existing.id);
  }

  const [inviter] = await database
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, options.invitedById))
    .limit(1);

  const who = inviter?.name?.trim() || inviter?.email || "Someone";
  const title = displayPageTitle(doc?.title);
  const access = options.role === "edit" ? "edit" : "view";
  const message = emailDocument({
    heading: `${who} invited you to ${title}`,
    paragraphs: [
      `${who} shared a SyncPad page with you. You can ${access} “${title}”.`,
      "The link opens the page. If you sign in with this email address, it also shows up in your sidebar.",
    ],
    actionLabel: "Open page",
    actionUrl: options.url,
  });

  return sendEmail({
    to: email,
    subject: `${who} invited you to ${title}`,
    ...message,
  });
}

export async function notifyNewComment(options: {
  documentId: string;
  authorId: string;
  body: string;
}) {
  const database = requireDb();
  const [doc] = await database
    .select({
      title: documents.title,
      ownerId: documents.ownerId,
    })
    .from(documents)
    .where(eq(documents.id, options.documentId))
    .limit(1);
  if (!doc) return;

  const members = await database
    .select({ userId: documentMembers.userId })
    .from(documentMembers)
    .where(eq(documentMembers.documentId, options.documentId));

  const recipientIds = new Set<string>([doc.ownerId, ...members.map((m) => m.userId)]);
  recipientIds.delete(options.authorId);
  if (recipientIds.size === 0) return;

  const people = await database
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(inArray(users.id, [...recipientIds]));

  const [author] = await database
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, options.authorId))
    .limit(1);

  const who = author?.name?.trim() || author?.email || "Someone";
  const title = displayPageTitle(doc.title);
  const excerpt = options.body.trim().slice(0, 500);
  const url = `${appOrigin()}/doc/${options.documentId}`;
  const message = emailDocument({
    heading: `${who} commented on ${title}`,
    paragraphs: [`“${excerpt}”`, "Open the page to reply."],
    actionLabel: "View comment",
    actionUrl: url,
  });

  await Promise.all(
    people
      .filter((person) => person.email)
      .map((person) =>
        sendEmail({
          to: person.email,
          subject: `${who} commented on ${title}`,
          ...message,
        }),
      ),
  );
}

