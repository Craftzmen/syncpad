import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { requireDb } from "@/db";
import { documentSnapshots, yjsDocumentState } from "@/db/schema";
import { getDocumentRole } from "@/lib/permissions";

type Params = { params: Promise<{ id: string; snapshotId: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { id, snapshotId } = await params;
  const session = await auth();
  const role = await getDocumentRole(session?.user?.id ?? null, id);
  if (role !== "edit") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const database = requireDb();
  const [snap] = await database
    .select({
      id: documentSnapshots.id,
      state: documentSnapshots.state,
      label: documentSnapshots.label,
    })
    .from(documentSnapshots)
    .where(and(eq(documentSnapshots.id, snapshotId), eq(documentSnapshots.documentId, id)))
    .limit(1);

  if (!snap?.state) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await database
    .insert(yjsDocumentState)
    .values({
      documentId: id,
      state: snap.state,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: yjsDocumentState.documentId,
      set: { state: snap.state, updatedAt: new Date() },
    });

  return NextResponse.json({ id: snap.id, label: snap.label, state: snap.state });
}
