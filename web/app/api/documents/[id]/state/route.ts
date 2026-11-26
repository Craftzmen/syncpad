import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { requireDb } from "@/db";
import { documents, yjsDocumentState } from "@/db/schema";
import { editorRole } from "@/lib/editor-role";
import { invalidateDocumentList } from "@/lib/permissions";
import { mergeYjsStates } from "@/lib/yjs-state";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  const role = await editorRole(session?.user?.id ?? null, id);
  if (role !== "edit") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { state?: unknown } | null;
  const incoming = typeof body?.state === "string" ? body.state.replace(/\s/g, "") : "";
  if (!incoming || incoming.length > 12_000_000 || !/^[A-Za-z0-9+/=]+$/.test(incoming)) {
    return NextResponse.json({ error: "Invalid note" }, { status: 400 });
  }

  const database = requireDb();
  const [existing] = await database
    .select({ state: yjsDocumentState.state })
    .from(yjsDocumentState)
    .where(eq(yjsDocumentState.documentId, id))
    .limit(1);

  let state = incoming;
  try {
    state = mergeYjsStates(existing?.state ?? null, incoming);
  } catch {
    return NextResponse.json({ error: "Invalid note" }, { status: 400 });
  }

  const now = new Date();
  await database
    .insert(yjsDocumentState)
    .values({ documentId: id, state, updatedAt: now })
    .onConflictDoUpdate({
      target: yjsDocumentState.documentId,
      set: { state, updatedAt: now },
    });
  await database.update(documents).set({ updatedAt: now }).where(eq(documents.id, id));
  if (session?.user?.id) invalidateDocumentList(session.user.id);
  return NextResponse.json({ ok: true });
}
