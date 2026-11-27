"use client";

import { useRouter } from "next/navigation";
import { FileText, Home, Pin, Plus, Star, Trash2, Users } from "lucide-react";

import { PageIconView } from "@/components/PageIconView";
import { useCreateDoc, type SidebarDoc } from "@/components/WorkspaceShell";
import { displayPageTitle } from "@/lib/page-title";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

export function CommandPalette({
  open,
  onOpenChange,
  documents,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documents: SidebarDoc[];
}) {
  const router = useRouter();
  const createDoc = useCreateDoc();

  function go(path: string) {
    onOpenChange(false);
    router.push(path);
  }

  const pinned = documents.filter((d) => d.isPinned && !d.shared);
  const shared = documents.filter((d) => d.shared);
  const favorites = documents.filter((d) => d.isFavorite && !d.isPinned && !d.shared);
  const recent = documents.filter((d) => !d.isPinned && !d.isFavorite && !d.shared).slice(0, 12);

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search"
      description="Find a page or run an action"
      className="max-w-none"
    >
      <Command shouldFilter className="rounded-none! bg-white p-0">
        <CommandInput placeholder="Search pages…" />
        <CommandList>
          <CommandEmpty className="py-10 text-[13px] text-[#0d0d0d]/45">
            No pages found.
          </CommandEmpty>
          <CommandGroup heading="Actions">
            <CommandItem
              onSelect={() => {
                onOpenChange(false);
                void createDoc();
              }}
            >
              <Plus className="size-4 text-[#0d0d0d]/55" />
              New page
            </CommandItem>
            <CommandItem onSelect={() => go("/dashboard")}>
              <Home className="size-4 text-[#0d0d0d]/55" />
              Home
            </CommandItem>
            <CommandItem onSelect={() => go("/dashboard/trash")}>
              <Trash2 className="size-4 text-[#0d0d0d]/55" />
              Trash
            </CommandItem>
          </CommandGroup>
          {pinned.length > 0 ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="Pinned">
                {pinned.map((doc) => (
                  <CommandItem
                    key={doc.id}
                    value={`pinned ${doc.title} ${doc.id}`}
                    onSelect={() => go(`/doc/${doc.id}`)}
                  >
                    <Pin className="size-4 text-[#0d0d0d]/55" />
                    {displayPageTitle(doc.title)}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : null}
          {favorites.length > 0 ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="Favorites">
                {favorites.map((doc) => (
                  <CommandItem
                    key={doc.id}
                    value={`${doc.title} ${doc.id}`}
                    onSelect={() => go(`/doc/${doc.id}`)}
                  >
                    <Star className="size-4 fill-amber-400 text-amber-500" />
                    {displayPageTitle(doc.title)}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : null}
          {shared.length > 0 ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="Shared">
                {shared.map((doc) => (
                  <CommandItem
                    key={doc.id}
                    value={`shared ${doc.title} ${doc.id}`}
                    onSelect={() => go(`/doc/${doc.id}`)}
                  >
                    <Users className="size-4 text-[#0d0d0d]/55" />
                    {displayPageTitle(doc.title)}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : null}
          <CommandSeparator />
          <CommandGroup heading="Private">
            {recent.map((doc) => (
              <CommandItem
                key={doc.id}
                value={`${doc.title} ${doc.id}`}
                onSelect={() => go(`/doc/${doc.id}`)}
              >
                {doc.icon ? (
                  <PageIconView value={doc.icon} />
                ) : (
                  <FileText className="size-4 text-[#8e8e8e]" strokeWidth={1.75} />
                )}
                {displayPageTitle(doc.title)}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
        <div className="flex items-center gap-3 border-t border-black/[0.06] px-4 py-2 text-[11px] text-[#0d0d0d]/40">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span className="ml-auto">esc close</span>
        </div>
      </Command>
    </CommandDialog>
  );
}