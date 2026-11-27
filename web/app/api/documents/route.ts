import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { requireDb } from "@/db";
import { documents, yjsDocumentState } from "@/db/schema";
import { claimDocumentInvites } from "@/lib/page-mail";
import {
  invalidateDocumentList,
  listDocumentsForUser,
} from "@/lib/permissions";
import { mapSidebarDocs } from "@/lib/sidebar-docs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await claimDocumentInvites(session.user.id);
  const docs = await listDocumentsForUser(session.user.id, { fresh: true });
  return NextResponse.json(mapSidebarDocs(docs));
}

const DOCUMENT_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const database = requireDb();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { id?: string } | null;
  const id = body?.id && DOCUMENT_ID.test(body.id) ? body.id : undefined;

  const [doc] = await database
    .insert(documents)
    .values({
      ...(id ? { id } : {}),
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