import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { requireDb } from "@/db";
import { documents, yjsDocumentState } from "@/db/schema";
import { displayPageTitle } from "@/lib/page-title";
import { getDocumentRole, invalidateDocumentList } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = await getDocumentRole(session.user.id, id);
  if (role !== "edit") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const database = requireDb();
  const [source] = await database
    .select()
    .from(documents)
    .where(eq(documents.id, id))
    .limit(1);
  if (!source || source.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [stateRow] = await database
    .select({ state: yjsDocumentState.state })
    .from(yjsDocumentState)
    .where(eq(yjsDocumentState.documentId, id))
    .limit(1);

  const [copy] = await database
    .insert(documents)
    .values({
      ownerId: session.user.id,
      title: `${displayPageTitle(source.title)} (copy)`,
      icon: source.icon,
      coverColor: source.coverColor,
    })
    .returning();

  await database.insert(yjsDocumentState).values({
    documentId: copy.id,
    state: stateRow?.state ?? Buffer.from(new Uint8Array(0)).toString("base64"),
  });

  invalidateDocumentList(session.user.id);
  return NextResponse.json(copy, { status: 201 });
}