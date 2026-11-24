import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { requireDb } from "@/db";
import { yjsDocumentState } from "@/db/schema";
import { getDocumentRole, getRoleFromShareToken } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  const cookieStore = await cookies();
  const shareToken = cookieStore.get(`share_${id}`)?.value;

  let role = session?.user?.id
    ? await getDocumentRole(session.user.id, id)
    : null;
  if (!role && shareToken) {
    role = await getRoleFromShareToken(shareToken, id);
  }
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "html";

  const database = requireDb();
  const [stateRow] = await database
    .select({ state: yjsDocumentState.state })
    .from(yjsDocumentState)
    .where(eq(yjsDocumentState.documentId, id))
    .limit(1);

  const payload = stateRow?.state ?? "";

  if (format === "md") {
    return new NextResponse(
      "# Export\n\nDocument binary state (base64) — open in SyncPad for full fidelity.\n\n```\n" +
        payload.slice(0, 2000) +
        "\n```\n",
      {
        headers: {
          "Content-Type": "text/markdown",
          "Content-Disposition": 'attachment; filename="document.md"',
        },
      },
    );
  }

  return new NextResponse(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Export</title></head><body><p>SyncPad document export (Yjs state snapshot).</p><pre>${payload.slice(0, 4000)}</pre></body></html>`,
    {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": 'attachment; filename="document.html"',
      },
    },
  );
}