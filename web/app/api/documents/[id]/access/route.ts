import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { requireDb } from "@/db";
import { documentInvites, documentMembers, documents, users } from "@/db/schema";
import { getDocumentRole, invalidateDocumentList } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

async function editorRole(documentId: string) {
  const session = await auth();
  const role = await getDocumentRole(session?.user?.id ?? null, documentId);
  if (role !== "edit") return null;
  return session;
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  const role = await getDocumentRole(session?.user?.id ?? null, id);
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const database = requireDb();
  const [doc] = await database
    .select({ ownerId: documents.ownerId })
    .from(documents)
    .where(eq(documents.id, id))
    .limit(1);
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [owner] = await database
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
    })
    .from(users)
    .where(eq(users.id, doc.ownerId))
    .limit(1);

  const members = await database
    .select({
      userId: documentMembers.userId,
      role: documentMembers.role,
      name: users.name,
      email: users.email,
      image: users.image,
    })
    .from(documentMembers)
    .innerJoin(users, eq(users.id, documentMembers.userId))
    .where(eq(documentMembers.documentId, id));

  const invites = await database
    .select({
      email: documentInvites.email,
      role: documentInvites.role,
    })
    .from(documentInvites)
    .where(eq(documentInvites.documentId, id));

  return NextResponse.json({
    owner: owner ?? null,
    members: members.filter((member) => member.userId !== doc.ownerId),
    invites,
    canManage: role === "edit",
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const session = await editorRole(id);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    userId?: string;
    email?: string;
    role?: "view" | "edit";
  };
  if (body.role !== "view" && body.role !== "edit") {
    return NextResponse.json({ error: "Choose view or edit" }, { status: 400 });
  }

  const database = requireDb();
  const [doc] = await database
    .select({ ownerId: documents.ownerId })
    .from(documents)
    .where(eq(documents.id, id))
    .limit(1);
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (body.userId && body.userId === doc.ownerId) {
    return NextResponse.json({ error: "The owner keeps full access" }, { status: 400 });
  }

  if (body.userId) {
    const updated = await database
      .update(documentMembers)
      .set({ role: body.role })
      .where(
        and(eq(documentMembers.documentId, id), eq(documentMembers.userId, body.userId)),
      )
      .returning({ userId: documentMembers.userId });
    if (updated.length === 0) {
      return NextResponse.json({ error: "That person is not on this page" }, { status: 404 });
    }
    invalidateDocumentList(body.userId);
    return NextResponse.json({ ok: true });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Missing person" }, { status: 400 });
  }
  const updated = await database
    .update(documentInvites)
    .set({ role: body.role })
    .where(and(eq(documentInvites.documentId, id), eq(documentInvites.email, email)))
    .returning({ email: documentInvites.email });
  if (updated.length === 0) {
    return NextResponse.json({ error: "That invite was not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  const session = await editorRole(id);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    userId?: string;
    email?: string;
  };
  const database = requireDb();
  const [doc] = await database
    .select({ ownerId: documents.ownerId })
    .from(documents)
    .where(eq(documents.id, id))
    .limit(1);
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (body.userId && body.userId === doc.ownerId) {
    return NextResponse.json({ error: "The owner cannot be removed" }, { status: 400 });
  }

  if (body.userId) {
    await database
      .delete(documentMembers)
      .where(
        and(eq(documentMembers.documentId, id), eq(documentMembers.userId, body.userId)),
      );
    invalidateDocumentList(body.userId);
    return NextResponse.json({ ok: true });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Missing person" }, { status: 400 });
  }
  await database
    .delete(documentInvites)
    .where(and(eq(documentInvites.documentId, id), eq(documentInvites.email, email)));
  return NextResponse.json({ ok: true });
}
