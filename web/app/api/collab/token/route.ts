import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { signCollabToken } from "@/lib/collab-token";
import {
  getDocumentRole,
  getRoleFromShareToken,
} from "@/lib/permissions";

export async function POST(request: Request) {
  const body = (await request.json()) as { documentId: string };
  const documentId = body.documentId;
  if (!documentId) {
    return NextResponse.json({ error: "documentId required" }, { status: 400 });
  }

  const session = await auth();
  const cookieStore = await cookies();
  const shareToken = cookieStore.get(`share_${documentId}`)?.value;

  let role = session?.user?.id
    ? await getDocumentRole(session.user.id, documentId)
    : null;

  if (!role && shareToken) {
    role = await getRoleFromShareToken(shareToken, documentId);
  }

  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = session?.user?.id ?? `guest:${shareToken ?? "anon"}`;
  const name =
    session?.user?.name ?? (role === "view" ? "Viewer" : "Guest editor");

  const token = await signCollabToken({
    docId: documentId,
    userId,
    role,
    name,
  });

  return NextResponse.json({ token, role, userId, name });
}