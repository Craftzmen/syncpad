export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { DocWorkspace } from "@/components/DocWorkspace";
import EditorPage from "@/components/EditorPage";
import { requireDb } from "@/db";
import { documentMembers, documents, yjsDocumentState } from "@/db/schema";
import { signCollabToken } from "@/lib/collab-token";
import { getRoleFromShareToken } from "@/lib/permissions";
import { and, eq } from "drizzle-orm";

type PageProps = { params: Promise<{ id: string }> };

export default async function DocumentPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();
  const cookieStore = await cookies();
  const shareToken = cookieStore.get(`share_${id}`)?.value;

  const database = requireDb();
  const [doc] = await database
    .select()
    .from(documents)
    .where(eq(documents.id, id))
    .limit(1);

  if (!doc || doc.deletedAt) {
    if (!session?.user) {
      redirect("/login");
    }
    notFound();
  }

  let role: "view" | "edit" | null = null;
  if (session?.user?.id && doc.ownerId === session.user.id) {
    role = "edit";
  } else if (session?.user?.id) {
    const [member] = await database
      .select({ role: documentMembers.role })
      .from(documentMembers)
      .where(
        and(
          eq(documentMembers.documentId, id),
          eq(documentMembers.userId, session.user.id),
        ),
      )
      .limit(1);
    role = member?.role ?? null;
  }

  if (!role && shareToken) {
    role = await getRoleFromShareToken(shareToken, id);
  }

  if (!role) {
    if (!session?.user) {
      redirect("/login");
    }
    notFound();
  }

  const canEdit = role === "edit";
  const [stateRow] = await database
    .select({ state: yjsDocumentState.state })
    .from(yjsDocumentState)
    .where(eq(yjsDocumentState.documentId, id))
    .limit(1);
  const viewerId = session?.user?.id ?? `guest:${shareToken ?? "anon"}`;
  const viewerName = session?.user?.name ?? (role === "view" ? "Viewer" : "Guest");
  let collabToken = "";
  let collabError: string | null = null;
  try {
    collabToken = await signCollabToken({
      docId: id,
      userId: viewerId,
      role,
      name: viewerName,
    });
  } catch (error) {
    collabError = error instanceof Error ? error.message : "Could not sign a collaboration token";
  }

  return (
    <DocWorkspace
      documentId={id}
      initialTitle={doc.title}
      initialIcon={doc.icon}
      initialCoverColor={doc.coverColor}
      initialFavorite={doc.isFavorite}
      updatedAt={isoTimestamp(doc.updatedAt)}
      editedBy={session?.user?.name}
      canEdit={canEdit}
      showComments={!!session?.user}
      viewerName={session?.user?.name ?? null}
      viewerImage={session?.user?.image ?? null}
      collabError={collabError}
    >
      <EditorPage
        docId={id}
        token={collabToken}
        role={role}
        userId={viewerId}
        name={viewerName}
        image={session?.user?.image ?? null}
        initialState={stateRow?.state ?? null}
      />
    </DocWorkspace>
  );
}

function isoTimestamp(value: Date | string) {
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return new Date(0).toISOString();
  return parsed.toISOString();
}