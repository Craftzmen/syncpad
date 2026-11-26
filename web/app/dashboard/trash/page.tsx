import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { TrashView } from "@/components/TrashView";
import { listTrashedDocuments } from "@/lib/permissions";

export default async function TrashPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/trash");
  }

  const docs = await listTrashedDocuments(session.user.id);

  return (
    <TrashView
      initial={docs.map((doc) => ({
        id: doc.id,
        title: doc.title,
        icon: doc.icon,
        deletedAt: doc.deletedAt ? doc.deletedAt.toISOString() : null,
      }))}
    />
  );
}
