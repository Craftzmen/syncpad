import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { requireDb } from "@/db";
import { users } from "@/db/schema";
import { invalidateDocumentList } from "@/lib/permissions";

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { confirm?: string } | null;
  if (body?.confirm !== "delete") {
    return NextResponse.json({ error: "Type delete to confirm" }, { status: 400 });
  }

  const database = requireDb();
  const deleted = await database
    .delete(users)
    .where(eq(users.id, session.user.id))
    .returning({ id: users.id });

  if (deleted.length === 0) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  invalidateDocumentList(session.user.id);
  return NextResponse.json({ ok: true });
}
