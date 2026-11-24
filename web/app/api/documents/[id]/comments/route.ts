import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { requireDb } from "@/db";
import { comments, users } from "@/db/schema";
import { notifyNewComment } from "@/lib/page-mail";
import { getDocumentRole } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  const role = await getDocumentRole(session?.user?.id ?? null, id);
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const database = requireDb();
  const rows = await database
    .select({
      id: comments.id,
      body: comments.body,
      createdAt: comments.createdAt,
      userId: comments.userId,
      authorName: users.name,
      authorImage: users.image,
    })
    .from(comments)
    .leftJoin(users, eq(comments.userId, users.id))
    .where(eq(comments.documentId, id))
    .orderBy(desc(comments.createdAt));

  return NextResponse.json(rows);
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = await getDocumentRole(session.user.id, id);
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as { body?: string; anchor?: string };
  if (!body.body?.trim()) {
    return NextResponse.json({ error: "body required" }, { status: 400 });
  }

  const database = requireDb();
  const [row] = await database
    .insert(comments)
    .values({
      documentId: id,
      userId: session.user.id,
      body: body.body.trim(),
      anchor: body.anchor,
    })
    .returning();

  void notifyNewComment({
    documentId: id,
    authorId: session.user.id,
    body: row.body,
  }).catch((error) => {
    console.error("comment email failed", error instanceof Error ? error.message : error);
  });

  return NextResponse.json(
    {
      ...row,
      authorName: session.user.name ?? null,
      authorImage: session.user.image ?? null,
    },
    { status: 201 },
  );
}