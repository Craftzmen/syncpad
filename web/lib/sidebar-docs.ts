import type { SidebarDoc } from "@/components/WorkspaceShell";
import type { documents } from "@/db/schema";

type DbDocument = typeof documents.$inferSelect;

export function mapSidebarDocs(docs: DbDocument[]): SidebarDoc[] {
  return docs.map((d) => ({
    id: d.id,
    title: d.title,
    icon: d.icon,
    isFavorite: d.isFavorite,
    isPinned: d.isPinned,
    updatedAt: d.updatedAt.toISOString(),
  }));
}