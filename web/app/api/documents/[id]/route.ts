import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { requireDb } from "@/db";
import { documents } from "@/db/schema";
import { getDocumentRole, invalidateDocumentList } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const database = requireDb();
  const session = await auth();
  const role = await getDocumentRole(session?.user?.id ?? null, id);
  if (!role) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [doc] = await database
    .select()
    .from(documents)
    .where(eq(documents.id, id))
    .limit(1);

  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ...doc, role });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const database = requireDb();
  const session = await auth();
  const role = await getDocumentRole(session?.user?.id ?? null, id);
  if (role !== "edit") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as {
    title?: string;
    icon?: string | null;
    coverColor?: string | null;
    isFavorite?: boolean;
    isPinned?: boolean;
    restore?: boolean;
  };

  const updates: Partial<typeof documents.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (body.title !== undefined) {
    updates.title = body.title.trim() || "Untitled";
  }
  if (body.icon !== undefined) {
    updates.icon = body.icon;
  }
  if (body.coverColor !== undefined) {
    updates.coverColor = body.coverColor;
  }
  if (body.isFavorite !== undefined) {
    updates.isFavorite = body.isFavorite;
  }
  if (body.isPinned !== undefined) {
    updates.isPinned = body.isPinned;
  }
  if (body.restore === true) {
    const [existing] = await database
      .select({ ownerId: documents.ownerId })
      .from(documents)
      .where(eq(documents.id, id))
      .limit(1);
    const userId = session?.user?.id;
    if (!existing || !userId || existing.ownerId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const [restored] = await database
      .update(documents)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(eq(documents.id, id))
      .returning();
    invalidateDocumentList(userId);
    return NextResponse.json(restored);
  }

  if (
    body.title === undefined &&
    body.icon === undefined &&
    body.coverColor === undefined &&
    body.isFavorite === undefined &&
    body.isPinned === undefined
  ) {
    return NextResponse.json({ error: "No updates" }, { status: 400 });
  }

  const [doc] = await database
    .update(documents)
    .set(updates)
    .where(eq(documents.id, id))
    .returning();

  if (session?.user?.id) {
    invalidateDocumentList(session.user.id);
  }
  return NextResponse.json(doc);
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  const database = requireDb();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [doc] = await database
    .select({ ownerId: documents.ownerId })
    .from(documents)
    .where(eq(documents.id, id))
    .limit(1);

  if (!doc || doc.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const permanent = new URL(request.url).searchParams.get("permanent") === "1";
  if (permanent) {
    await database
      .delete(documents)
      .where(and(eq(documents.id, id), eq(documents.ownerId, session.user.id)));
  } else {
    await database
      .update(documents)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(documents.id, id));
  }
  invalidateDocumentList(session.user.id);
  return NextResponse.json({ ok: true });
}