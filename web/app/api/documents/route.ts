import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { requireDb } from "@/db";
import { documents, yjsDocumentState } from "@/db/schema";
import {
  invalidateDocumentList,
  listDocumentsForUser,
} from "@/lib/permissions";

export async function GET() {
  const database = requireDb();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const docs = await listDocumentsForUser(session.user.id);
  return NextResponse.json(docs);
}

export async function POST() {
  const database = requireDb();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [doc] = await database
    .insert(documents)
    .values({
      ownerId: session.user.id,
      title: "New page",
    })
    .returning();

  await database.insert(yjsDocumentState).values({
    documentId: doc.id,
    state: Buffer.from(new Uint8Array(0)).toString("base64"),
  });

  invalidateDocumentList(session.user.id);
  return NextResponse.json(doc, { status: 201 });
}