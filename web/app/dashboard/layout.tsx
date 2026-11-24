import { Suspense, type ReactNode } from "react";

export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { WorkspaceSkeleton } from "@/components/page-skeletons";
import { SchemaMigrationNotice } from "@/components/SchemaMigrationNotice";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { TooltipProvider } from "@/components/ui/tooltip";
import { loadWorkspaceDocs } from "@/lib/list-workspace-docs";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      <DashboardFrame>{children}</DashboardFrame>
    </Suspense>
  );
}

async function DashboardFrame({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const loaded = await loadWorkspaceDocs(session.user.id);
  if (!loaded.ok) {
    if (loaded.schemaMismatch) {
      return <SchemaMigrationNotice detail={loaded.detail} />;
    }
    throw new Error(loaded.detail);
  }

  return (
    <TooltipProvider>
      <WorkspaceShell
        documents={loaded.documents}
        userName={session.user.name}
        userImage={session.user.image}
      >
        {children}
      </WorkspaceShell>
    </TooltipProvider>
  );
}