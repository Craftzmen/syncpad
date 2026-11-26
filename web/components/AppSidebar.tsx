"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Copy,
  Ellipsis,
  FileText,
  Files,
  Home,
  LogOut,
  PanelLeft,
  Pencil,
  Pin,
  Search,
  Settings,
  SquarePen,
  Star,
  Trash2,
} from "lucide-react";

import {
  NotionMenuItem,
  NotionMenuLabel,
  NotionMenuPanel,
} from "@/components/NotionMenu";
import { PageIconView } from "@/components/PageIconView";
import {
  useCreateDoc,
  useWorkspace,
  type SidebarDoc,
} from "@/components/WorkspaceShell";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { saveDocumentTitle } from "@/lib/document-save";
import { canonicalTitle, displayPageTitle } from "@/lib/page-title";
import { cn } from "@/lib/utils";

const COLLAPSED_KEY = "syncpad-sidebar-collapsed";

export function AppSidebar({
  documents,
  userName,
  userImage,
  onSearch,
  creating = false,
}: {
  documents: SidebarDoc[];
  userName?: string | null;
  userImage?: string | null;
  onSearch?: () => void;
  creating?: boolean;
}) {
  const pathname = usePathname();
  const createDoc = useCreateDoc();
  const onSettings = pathname === "/settings";
  const [collapsed, setCollapsed] = useState(false);
  const [pinnedOpen, setPinnedOpen] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSED_KEY) === "1");
  }, []);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
      return next;
    });
  }

  const initial = (userName?.trim()?.[0] ?? "S").toUpperCase();
  const favorites = documents.filter((doc) => doc.isPinned);
  const privatePages = documents.filter((doc) => !doc.isPinned);
  const pinned = pinnedOpen ? favorites : favorites.slice(0, 6);

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 shrink-0 overflow-hidden border-r border-black/[0.06] bg-[#f9f9f9] text-[#0d0d0d] transition-[width] duration-200 ease-out",
        collapsed ? "w-[52px]" : "w-[292px]",
      )}
    >
      <div
        className={cn(
          "flex w-[52px] shrink-0 flex-col items-center",
          !collapsed && "border-r border-black/[0.06]",
        )}
      >
        <div className="flex h-[52px] w-full items-center justify-center">
          <Link
            href="/dashboard"
            title="Home"
            className="flex size-8 items-center justify-center rounded-[10px] bg-black text-white"
          >
            <SyncMark />
          </Link>
        </div>

        <div className="flex flex-col items-center gap-0.5">
          {collapsed ? (
            <RailButton icon={PanelLeft} label="Open sidebar" onClick={toggleCollapsed} />
          ) : null}
          <RailButton
            icon={SquarePen}
            label={creating ? "Creating page" : "New page"}
            onClick={createDoc}
            disabled={creating}
          />
          <RailButton icon={Search} label="Search" onClick={onSearch} />
          <RailButton
            icon={Home}
            label="Home"
            href="/dashboard"
            active={pathname === "/dashboard"}
          />
          <RailButton
            icon={Settings}
            label="Settings"
            href="/settings"
            active={onSettings}
          />
          {collapsed ? (
            <RailButton
              icon={Trash2}
              label="Trash"
              href="/dashboard/trash"
              active={pathname === "/dashboard/trash"}
            />
          ) : null}
        </div>

        <div className="mt-auto flex w-full justify-center pb-3">
          <Popover>
            <PopoverTrigger
              title={userName ?? "Account"}
              className="flex size-9 items-center justify-center rounded-full hover:bg-black/[0.04]"
            >
              {userImage ? (
                <img
                  src={userImage}
                  alt=""
                  className="size-7 rounded-full object-cover"
                />
              ) : (
                <span className="flex size-7 items-center justify-center rounded-full bg-[#e8e8e8] text-[13px] font-medium text-[#0d0d0d]">
                  {initial}
                </span>
              )}
            </PopoverTrigger>
            <PopoverContent
              side="right"
              align="end"
              sideOffset={10}
              className="w-auto border-0 bg-transparent p-0 shadow-none ring-0"
            >
              <NotionMenuPanel className="w-[220px]">
                <div className="px-3 py-2">
                  <p className="truncate text-sm font-medium">{userName ?? "SyncPad"}</p>
                  <p className="text-xs text-[#0d0d0d]/45">Account</p>
                </div>
                <div className="border-t border-black/5 p-1">
                  <NotionMenuItem icon={Settings} label="Settings" href="/settings" />
                  <NotionMenuItem icon={LogOut} label="Log out" href="/api/auth/signout" />
                </div>
              </NotionMenuPanel>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {collapsed ? null : (
        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex h-[52px] items-center pr-1.5 pl-3">
            <span className="text-[15px] font-semibold tracking-[-0.02em]">SyncPad</span>
            <div className="ml-auto flex items-center">
              <button
                type="button"
                title="Search"
                onClick={onSearch}
                className="flex size-8 items-center justify-center rounded-lg text-[#0d0d0d]/70 hover:bg-black/[0.04]"
              >
                <Search className="size-[18px]" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                title="Close sidebar"
                onClick={toggleCollapsed}
                className="flex size-8 items-center justify-center rounded-lg text-[#0d0d0d]/70 hover:bg-black/[0.04]"
              >
                <PanelLeft className="size-[18px]" strokeWidth={1.75} />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={createDoc}
            disabled={creating}
            className="mx-2 flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-left text-[14px] hover:bg-black/[0.04] disabled:opacity-50"
          >
            <SquarePen className="size-4 text-[#0d0d0d]/80" strokeWidth={1.75} />
            {creating ? "Creating…" : "New page"}
          </button>

          <nav className="mt-3 min-h-0 flex-1 overflow-x-clip overflow-y-auto overscroll-contain px-2 pb-3">
            {favorites.length > 0 ? (
              <section>
                <p className="px-2.5 pb-1 text-[13px] text-[#8e8e8e]">Pinned</p>
                <ul>
                  {pinned.map((doc) => (
                    <PageLink
                      key={doc.id}
                      doc={doc}
                      active={pathname === `/doc/${doc.id}`}
                      plain
                    />
                  ))}
                </ul>
                {favorites.length > 6 ? (
                  <button
                    type="button"
                    onClick={() => setPinnedOpen((value) => !value)}
                    className="flex h-9 w-full items-center rounded-lg px-2.5 text-[18px] leading-none tracking-widest text-[#0d0d0d]/70 hover:bg-black/[0.04]"
                  >
                    ···
                  </button>
                ) : null}
              </section>
            ) : null}

            <section className={favorites.length > 0 ? "mt-4" : undefined}>
              <p className="px-2.5 pb-1 text-[13px] text-[#8e8e8e]">Private</p>
              <ul>
                {privatePages.map((doc) => (
                  <PageLink
                    key={doc.id}
                    doc={doc}
                    active={pathname === `/doc/${doc.id}`}
                  />
                ))}
              </ul>
              {documents.length === 0 ? (
                <p className="px-2.5 py-2 text-[13px] text-[#8e8e8e]">No pages yet</p>
              ) : null}
            </section>
          </nav>
          <div className="shrink-0 border-t border-black/[0.06] p-2">
            <Link
              href="/dashboard/trash"
              className={cn(
                "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[14px]",
                pathname === "/dashboard/trash"
                  ? "bg-[#e4e4e4] font-medium"
                  : "hover:bg-black/[0.04]",
              )}
            >
              <Trash2 className="size-4 text-[#8e8e8e]" strokeWidth={1.75} />
              Trash
            </Link>
          </div>
        </div>
      )}
    </aside>
  );
}

function RailButton({
  icon: Icon,
  label,
  active,
  href,
  onClick,
  disabled,
}: {
  icon: typeof Search;
  label: string;
  active?: boolean;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const className = cn(
    "flex size-8 items-center justify-center rounded-lg text-[#0d0d0d]/75 hover:bg-black/[0.04] disabled:opacity-40",
    active && "bg-black/[0.06]",
  );
  const glyph = <Icon className="size-[18px]" strokeWidth={1.75} />;
  if (href) {
    return (
      <Link href={href} title={label} className={className}>
        {glyph}
      </Link>
    );
  }
  return (
    <button type="button" title={label} onClick={onClick} disabled={disabled} className={className}>
      {glyph}
    </button>
  );
}

function SyncMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path
        fill="currentColor"
        fillOpacity="0.42"
        d="M5.5 3h4.5a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
      />
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M10.25 6.75h8a2.25 2.25 0 0 1 2.25 2.25v9.75A2.25 2.25 0 0 1 18.25 21h-8a2.25 2.25 0 0 1-2.25-2.25V9A2.25 2.25 0 0 1 10.25 6.75Zm1.9 3.6h5.7v1.2h-5.7v-1.2Zm0 2.8h3.7v1.2h-3.7v-1.2Z"
      />
    </svg>
  );
}

function PageLink({
  doc,
  active,
  plain = false,
}: {
  doc: SidebarDoc;
  active: boolean;
  plain?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const workspace = useWorkspace();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(doc.title);
  const nameTimer = useRef(0);
  const nameOrigin = useRef(doc.title);
  const pendingName = useRef<string | null>(null);
  const skipBlur = useRef(false);

  useEffect(() => {
    if (!renaming) setName(doc.title);
  }, [doc.title, renaming]);

  useEffect(() => {
    return () => {
      window.clearTimeout(nameTimer.current);
      const title = pendingName.current;
      if (!title) return;
      pendingName.current = null;
      saveDocumentTitle(doc.id, title);
    };
  }, [doc.id]);

  function publishName(value: string) {
    const title = canonicalTitle(value);
    pendingName.current = title;
    workspace?.patchDoc(doc.id, { title });
    window.clearTimeout(nameTimer.current);
    nameTimer.current = window.setTimeout(() => {
      nameTimer.current = 0;
      pendingName.current = null;
      saveDocumentTitle(doc.id, title);
    }, 200);
  }

  function commitName(value: string) {
    window.clearTimeout(nameTimer.current);
    nameTimer.current = 0;
    pendingName.current = null;
    const title = canonicalTitle(value);
    setRenaming(false);
    workspace?.patchDoc(doc.id, { title });
    saveDocumentTitle(doc.id, title);
  }

  function cancelName() {
    skipBlur.current = true;
    window.clearTimeout(nameTimer.current);
    nameTimer.current = 0;
    pendingName.current = null;
    const title = nameOrigin.current;
    setName(title);
    setRenaming(false);
    workspace?.patchDoc(doc.id, { title: canonicalTitle(title) });
    saveDocumentTitle(doc.id, title);
  }

  async function toggleFavorite() {
    const isFavorite = !doc.isFavorite;
    workspace?.patchDoc(doc.id, { isFavorite });
    setMenuOpen(false);
    const res = await fetch(`/api/documents/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFavorite }),
    });
    if (!res.ok) workspace?.patchDoc(doc.id, { isFavorite: doc.isFavorite });
  }

  async function togglePin() {
    const isPinned = !doc.isPinned;
    workspace?.patchDoc(doc.id, { isPinned });
    setMenuOpen(false);
    const res = await fetch(`/api/documents/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPinned }),
    });
    if (!res.ok) workspace?.patchDoc(doc.id, { isPinned: doc.isPinned });
  }

  async function duplicate() {
    const res = await fetch(`/api/documents/${doc.id}/duplicate`, { method: "POST" });
    setMenuOpen(false);
    if (!res.ok) return;
    const copy = (await res.json()) as SidebarDoc;
    workspace?.rememberDoc(copy);
    router.push(`/doc/${copy.id}`);
  }

  async function moveToTrash() {
    setMenuOpen(false);
    workspace?.forgetDoc(doc.id);
    if (pathname === `/doc/${doc.id}`) router.push("/dashboard");
    const res = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
    if (!res.ok) workspace?.rememberDoc(doc);
  }

  const edited = doc.updatedAt ? new Date(doc.updatedAt) : null;

  return (
    <li className="group/page relative">
      {renaming ? (
        <input
          autoFocus
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            publishName(event.target.value);
          }}
          onBlur={() => {
            if (skipBlur.current) {
              skipBlur.current = false;
              return;
            }
            commitName(name);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              skipBlur.current = true;
              commitName(name);
            }
            if (event.key === "Escape") cancelName();
          }}
          className="h-9 w-full rounded-lg bg-white px-2.5 text-[14px] shadow-[0_0_0_1px_rgba(0,0,0,0.06)] outline-none"
        />
      ) : (
        <Link
          href={`/doc/${doc.id}`}
          className={cn(
            "flex h-9 min-w-0 items-center gap-2.5 rounded-lg px-2.5 pr-8 text-[14px] text-[#0d0d0d] transition-colors duration-150",
            active || menuOpen
              ? "bg-[#e4e4e4] font-medium"
              : "hover:bg-black/[0.05]",
          )}
        >
          {plain ? null : doc.icon ? (
            <span className="inline-flex size-4 shrink-0 items-center justify-center">
              <PageIconView value={doc.icon} />
            </span>
          ) : (
            <FileText className="size-4 shrink-0 text-[#8e8e8e]" strokeWidth={1.75} />
          )}
          <span className="truncate">{displayPageTitle(doc.title)}</span>
          {doc.isFavorite ? (
            <Star className="ml-auto size-3 shrink-0 fill-amber-400 text-amber-500" />
          ) : null}
        </Link>
      )}
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger
          className={cn(
            "absolute top-1 right-1 z-10 inline-flex size-7 items-center justify-center rounded-md text-[#0d0d0d]/45 hover:bg-black/[0.05]",
            menuOpen ? "opacity-100" : "opacity-0 group-hover/page:opacity-100",
          )}
        >
          <Ellipsis className="size-3.5" />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side="right"
          sideOffset={8}
          className="w-auto border-0 bg-transparent p-0 shadow-none ring-0"
        >
          <NotionMenuPanel className="w-[260px]">
            <div className="p-1">
              <NotionMenuLabel>Page</NotionMenuLabel>
              <NotionMenuItem
                icon={Pin}
                label={doc.isPinned ? "Unpin page" : "Pin page"}
                onClick={() => void togglePin()}
              />
              <NotionMenuItem
                icon={Star}
                label={doc.isFavorite ? "Remove from favorites" : "Add to favorites"}
                onClick={() => void toggleFavorite()}
              />
              <NotionMenuItem
                icon={Copy}
                label="Copy link"
                onClick={() => {
                  void navigator.clipboard.writeText(
                    `${window.location.origin}/doc/${doc.id}`,
                  );
                  setMenuOpen(false);
                }}
              />
              <NotionMenuItem icon={Files} label="Duplicate" onClick={() => void duplicate()} />
              <NotionMenuItem
                icon={Pencil}
                label="Rename"
                onClick={() => {
                  nameOrigin.current = doc.title;
                  setName(doc.title);
                  setRenaming(true);
                  setMenuOpen(false);
                }}
              />
              <NotionMenuItem
                icon={Trash2}
                label="Move to Trash"
                onClick={() => void moveToTrash()}
              />
            </div>
            <div className="border-t border-black/5 px-3 py-2 text-[11px] leading-relaxed text-[#0d0d0d]/45">
              <p>Last edited</p>
              <p>
                {edited
                  ? edited.toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "Just now"}
              </p>
            </div>
          </NotionMenuPanel>
        </PopoverContent>
      </Popover>
    </li>
  );
}
