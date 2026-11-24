export const dynamic = "force-dynamic";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { requireDb } from "@/db";
import { shareLinks } from "@/db/schema";

type PageProps = { params: Promise<{ token: string }> };

export default async function SharePage({ params }: PageProps) {
  const { token } = await params;

  const database = requireDb();
  const [link] = await database
    .select()
    .from(shareLinks)
    .where(eq(shareLinks.token, token))
    .limit(1);

  if (!link) {
    notFound();
  }

  if (link.expiresAt && link.expiresAt < new Date()) {
    notFound();
  }

  const cookieStore = await cookies();
  cookieStore.set(`share_${link.documentId}`, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect(`/doc/${link.documentId}`);
}