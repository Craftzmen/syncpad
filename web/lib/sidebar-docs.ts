import type { SidebarDoc } from "@/components/WorkspaceShell";
import type { documents } from "@/db/schema";

type DbDocument = typeof documents.$inferSelect;

export function mapSidebarDocs(
  docs: Array<DbDocument & { shared?: boolean; owned?: boolean }>,
): SidebarDoc[] {
  return docs.map((d) => ({
    id: d.id,
    title: d.title,
    icon: d.icon,
    isFavorite: d.isFavorite,
    isPinned: d.isPinned,
    shared: Boolean(d.shared),
    owned: d.owned !== false,
    updatedAt: d.updatedAt.toISOString(),
  }));
}