import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { listTrashedDocuments } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const docs = await listTrashedDocuments(session.user.id);
  return NextResponse.json(
    docs.map((doc) => ({
      id: doc.id,
      title: doc.title,
      icon: doc.icon,
      deletedAt: doc.deletedAt ? doc.deletedAt.toISOString() : null,
    })),
  );
}
