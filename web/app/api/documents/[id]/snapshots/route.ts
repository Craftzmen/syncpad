import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { requireDb } from "@/db";
import { documentSnapshots, yjsDocumentState } from "@/db/schema";
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
      id: documentSnapshots.id,
      label: documentSnapshots.label,
      createdAt: documentSnapshots.createdAt,
    })
    .from(documentSnapshots)
    .where(eq(documentSnapshots.documentId, id))
    .orderBy(desc(documentSnapshots.createdAt));

  return NextResponse.json(rows);
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  const role = await getDocumentRole(session?.user?.id ?? null, id);
  if (role !== "edit") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    label?: string;
    state?: string;
  };
  const database = requireDb();
  let state = typeof body.state === "string" ? body.state.replace(/\s/g, "") : "";
  if (state && (state.length > 12_000_000 || !/^[A-Za-z0-9+/=]+$/.test(state))) {
    return NextResponse.json({ error: "Invalid version" }, { status: 400 });
  }
  if (!state) {
    const [stateRow] = await database
      .select({ state: yjsDocumentState.state })
      .from(yjsDocumentState)
      .where(eq(yjsDocumentState.documentId, id))
      .limit(1);
    state = stateRow?.state ?? "";
  }

  if (!state) {
    return NextResponse.json({ error: "No content" }, { status: 400 });
  }

  const [snap] = await database
    .insert(documentSnapshots)
    .values({
      documentId: id,
      state,
      label: body.label?.trim() || "Snapshot",
      createdById: session?.user?.id,
    })
    .returning({
      id: documentSnapshots.id,
      label: documentSnapshots.label,
      createdAt: documentSnapshots.createdAt,
    });

  return NextResponse.json(snap, { status: 201 });
}