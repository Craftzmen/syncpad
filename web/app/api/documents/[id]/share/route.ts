import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";

import { auth } from "@/auth";
import { requireDb } from "@/db";
import { shareLinks } from "@/db/schema";
import { inviteToDocument, isEmailAddress } from "@/lib/page-mail";
import { getDocumentRole } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  const role = await getDocumentRole(session?.user?.id ?? null, id);
  if (role !== "edit") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    role?: "view" | "edit";
    expiresAt?: string | null;
    email?: string;
  };
  const email = body.email?.trim() ?? "";
  if (email && !isEmailAddress(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  const token = randomBytes(24).toString("hex");

  const database = requireDb();
  const [link] = await database
    .insert(shareLinks)
    .values({
      documentId: id,
      token,
      role: body.role ?? "view",
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    })
    .returning();

  const url = new URL(`/share/${token}`, process.env.AUTH_URL ?? "http://localhost:3000");
  if (!email || !session?.user?.id) {
    return NextResponse.json({ ...link, url: url.toString(), emailed: false });
  }

  const mailed = await inviteToDocument({
    documentId: id,
    email,
    role: body.role === "edit" ? "edit" : "view",
    invitedById: session.user.id,
    url: url.toString(),
  });

  return NextResponse.json({
    ...link,
    url: url.toString(),
    emailed: mailed.sent,
    emailError: mailed.sent ? null : mailed.reason,
  });
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  const role = await getDocumentRole(session?.user?.id ?? null, id);
  if (role !== "edit") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const database = requireDb();
  const links = await database
    .select()
    .from(shareLinks)
    .where(eq(shareLinks.documentId, id));

  return NextResponse.json(links);
}