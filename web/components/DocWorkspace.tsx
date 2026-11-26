"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Link2, MessageSquare, SmilePlus } from "lucide-react";

import { CommentPeek, CommentsPanel, usePageComments } from "@/components/CommentsPanel";
import { useVersionHistory, VersionHistoryDrawer } from "@/components/VersionHistory";
import { DocTopBar } from "@/components/DocTopBar";
import { DocumentTitle } from "@/components/DocumentTitle";
import { CoverPicker } from "@/components/CoverPicker";
import { PageIconView } from "@/components/PageIconView";
import { useWorkspace } from "@/components/WorkspaceShell";
import { GetStarted, IconPicker } from "@/components/PageChrome";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { resolveCover } from "@/lib/covers";
import { saveDocumentTitle } from "@/lib/document-save";
import { canonicalTitle } from "@/lib/page-title";
import { cn } from "@/lib/utils";

type AccessOwner = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

type AccessMember = AccessOwner & {
  userId: string;
  role: "view" | "edit";
};

type AccessInvite = {
  email: string;
  role: "view" | "edit";
};

function AccessFace({
  name,
  image,
}: {
  name: string;
  image: string | null;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  if (image) {
    return (
      <img
        src={image}
        alt=""
        width={28}
        height={28}
        referrerPolicy="no-referrer"
        className="size-7 shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[#f1f1ef] text-[12px] font-medium text-[#37352f]">
      {initial}
    </span>
  );
}

function shortShareUrl(url: string) {
  try {
    const parsed = new URL(url);
    const token = parsed.pathname.split("/").filter(Boolean).pop() ?? "";
    const tail =
      token.length > 8 ? `${token.slice(0, 4)}…${token.slice(-4)}` : token;
    return `${parsed.host}/share/${tail}`;
  } catch {
    return url;
  }
}

export function DocWorkspace({
  documentId,
  initialTitle,
  initialIcon,
  initialCoverColor,
  initialFavorite,
  initialPinned = false,
  updatedAt,
  editedBy,
  canEdit,
  showComments,
  viewerName,
  viewerImage,
  collabError = null,
  trashed = false,
  children,
}: {
  documentId: string;
  initialTitle: string;
  initialIcon: string | null;
  initialCoverColor: string | null;
  initialFavorite: boolean;
  initialPinned?: boolean;
  updatedAt?: string | null;
  editedBy?: string | null;
  canEdit: boolean;
  showComments: boolean;
  viewerName?: string | null;
  viewerImage?: string | null;
  collabError?: string | null;
  trashed?: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const workspace = useWorkspace();
  const listed = workspace?.docs.find((doc) => doc.id === documentId);
  const startingTitle = listed?.title ?? initialTitle;
  const [restoring, setRestoring] = useState(false);
  const [title, setTitle] = useState(startingTitle);
  const titleRef = useRef(startingTitle);
  const titleTimer = useRef(0);
  const [icon, setIcon] = useState<string | null>(listed ? (listed.icon ?? null) : initialIcon);
  const [coverColor, setCoverColor] = useState<string | null>(initialCoverColor);
  const [favoriteFallback, setFavoriteFallback] = useState(initialFavorite);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [pinnedFallback, setPinnedFallback] = useState(initialPinned);
  const [pinLoading, setPinLoading] = useState(false);

  function applyTitle(next: string) {
    titleRef.current = next;
    setTitle(next);
    workspace?.patchDoc(documentId, { title: canonicalTitle(next) });
    if (!canEdit) return;
    window.clearTimeout(titleTimer.current);
    titleTimer.current = window.setTimeout(() => {
      saveDocumentTitle(documentId, titleRef.current);
    }, 200);
  }

  function flushTitle() {
    window.clearTimeout(titleTimer.current);
    if (!canEdit) return;
    saveDocumentTitle(documentId, titleRef.current);
  }
  const isFavorite = listed ? Boolean(listed.isFavorite) : favoriteFallback;
  const isPinned = listed ? Boolean(listed.isPinned) : pinnedFallback;
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const versions = useVersionHistory(documentId);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [linkBusy, setLinkBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"view" | "edit">("view");
  const [inviteNote, setInviteNote] = useState<{
    text: string;
    tone: "ok" | "warn";
  } | null>(null);
  const copiedTimer = useRef<number | null>(null);
  const [accessOwner, setAccessOwner] = useState<AccessOwner | null>(null);
  const [accessMembers, setAccessMembers] = useState<AccessMember[]>([]);
  const [accessInvites, setAccessInvites] = useState<AccessInvite[]>([]);
  const [accessReady, setAccessReady] = useState(false);
  const [isEmpty, setIsEmpty] = useState<boolean | null>(null);
  const pageComments = usePageComments(showComments ? documentId : null);

  useEffect(() => {
    return () => {
      if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
    };
  }, []);

  useEffect(() => {
    const listedTitle = listed?.title;
    if (!listedTitle || canonicalTitle(titleRef.current) === listedTitle) return;
    titleRef.current = listedTitle;
    setTitle(listedTitle);
  }, [listed?.title]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flushTitle();
    };
    window.addEventListener("pagehide", flushTitle);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      flushTitle();
      window.removeEventListener("pagehide", flushTitle);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [canEdit, documentId]);

  const loadAccess = useCallback(async () => {
    const res = await fetch(`/api/documents/${documentId}/access`);
    if (!res.ok) {
      setAccessReady(true);
      return;
    }
    const data = (await res.json()) as {
      owner: AccessOwner | null;
      members: AccessMember[];
      invites: AccessInvite[];
    };
    setAccessOwner(data.owner);
    setAccessMembers(data.members ?? []);
    setAccessInvites(data.invites ?? []);
    setAccessReady(true);
  }, [documentId]);

  useEffect(() => {
    if (!canEdit) return;
    void loadAccess();
  }, [canEdit, loadAccess]);

  useEffect(() => {
    const onEmpty = (event: Event) => {
      setIsEmpty(Boolean((event as CustomEvent<boolean>).detail));
    };
    window.addEventListener("syncpad:empty", onEmpty);
    return () => window.removeEventListener("syncpad:empty", onEmpty);
  }, []);

  function updateIcon(next: string | null) {
    const previous = icon;
    setIcon(next);
    workspace?.patchDoc(documentId, { icon: next });
    void patchMeta({ icon: next }).then((ok) => {
      if (ok) return;
      setIcon(previous);
      workspace?.patchDoc(documentId, { icon: previous });
    });
  }

  const patchMeta = useCallback(
    async (patch: Record<string, unknown>) => {
      if (!canEdit) return false;
      const res = await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      return res.ok;
    },
    [canEdit, documentId],
  );

  async function toggleFavorite() {
    if (!canEdit || favoriteLoading) return;
    const next = !isFavorite;
    setFavoriteLoading(true);
    setFavoriteFallback(next);
    workspace?.patchDoc(documentId, { isFavorite: next });
    const ok = await patchMeta({ isFavorite: next });
    if (!ok) {
      setFavoriteFallback(!next);
      workspace?.patchDoc(documentId, { isFavorite: !next });
    }
    setFavoriteLoading(false);
  }

  async function togglePin() {
    if (!canEdit || pinLoading) return;
    const next = !isPinned;
    setPinLoading(true);
    setPinnedFallback(next);
    workspace?.patchDoc(documentId, { isPinned: next });
    const ok = await patchMeta({ isPinned: next });
    if (!ok) {
      setPinnedFallback(!next);
      workspace?.patchDoc(documentId, { isPinned: !next });
    }
    setPinLoading(false);
  }

  function markCopied() {
    setCopied(true);
    if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
    copiedTimer.current = window.setTimeout(() => setCopied(false), 1600);
  }

  async function createShareLink() {
    setLinkBusy(true);
    try {
      let url = shareUrl;
      if (!url) {
        const res = await fetch(`/api/documents/${documentId}/share`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "view" }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { url: string };
        url = data.url;
        setShareUrl(url);
      }
      await navigator.clipboard.writeText(url);
      markCopied();
    } finally {
      setLinkBusy(false);
    }
  }

  async function sendInvite() {
    const email = inviteEmail.trim();
    if (!email) return;
    setInviteBusy(true);
    setInviteNote(null);
    const res = await fetch(`/api/documents/${documentId}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: inviteRole, email }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      url?: string;
      emailed?: boolean;
      emailError?: string | null;
      error?: string;
    };
    setInviteBusy(false);
    if (!res.ok) {
      setInviteNote({ text: data.error ?? "Could not send the invite", tone: "warn" });
      return;
    }
    if (data.url) setShareUrl(data.url);
    setInviteEmail("");
    setInviteNote(
      data.emailed
        ? { text: `Invite sent to ${email}`, tone: "ok" }
        : {
            text: data.emailError ?? "Link created, but the email did not send",
            tone: "warn",
          },
    );
    void loadAccess();
  }

  async function changeAccess(
    target: { userId?: string; email?: string },
    role: "view" | "edit",
  ) {
    const res = await fetch(`/api/documents/${documentId}/access`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...target, role }),
    });
    if (res.ok) void loadAccess();
  }

  async function removeAccess(target: { userId?: string; email?: string }) {
    const res = await fetch(`/api/documents/${documentId}/access`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(target),
    });
    if (res.ok) void loadAccess();
  }

  async function restorePage() {
    if (restoring) return;
    setRestoring(true);
    const res = await fetch(`/api/documents/${documentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restore: true }),
    });
    if (!res.ok) {
      setRestoring(false);
      return;
    }
    workspace?.rememberDoc({
      id: documentId,
      title,
      icon,
      isFavorite,
    });
    router.refresh();
  }

  const cover = resolveCover(coverColor);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-white">
      <DocTopBar
        documentId={documentId}
        title={title}
        icon={icon}
        canEdit={canEdit}
        isFavorite={isFavorite}
        favoriteLoading={favoriteLoading}
        isPinned={isPinned}
        pinLoading={pinLoading}
        showComments={showComments}
        commentsOpen={commentsOpen}
        shared={accessMembers.length + accessInvites.length > 0}
        updatedAt={updatedAt}
        editedBy={editedBy}
        onFavoriteToggle={() => void toggleFavorite()}
        onPinToggle={() => void togglePin()}
        onCommentsToggle={() => {
          setCommentsOpen((value) => !value);
          setHistoryOpen(false);
        }}
        onShare={() => setShareOpen(true)}
        historyOpen={historyOpen}
        onOpenHistory={() => {
          setCommentsOpen(false);
          setHistoryOpen(true);
          void versions.refresh();
        }}
        onSaveVersion={async () => {
          const ok = await versions.save();
          if (ok) {
            setCommentsOpen(false);
            setHistoryOpen(true);
          }
          return ok;
        }}
      />
      {trashed ? (
        <div className="flex items-center justify-between gap-3 border-b border-[#f0d4d2] bg-[#fdf8f7] px-4 py-2">
          <p className="text-[13px] text-[#6b2c28]">This page is in Trash.</p>
          <button
            type="button"
            onClick={() => void restorePage()}
            disabled={restoring}
            className="h-7 shrink-0 rounded-md bg-white px-2.5 text-[13px] font-medium text-[#6b2c28] shadow-[0_0_0_1px_rgba(196,71,66,0.18)] disabled:opacity-50"
          >
            {restoring ? "Restoring…" : "Restore"}
          </button>
        </div>
      ) : null}
      {collabError ? (
        <p
          data-collab-error={collabError}
          className="border-b border-black/[0.06] bg-[#fbf8f2] px-4 py-2 text-center text-[13px] text-[#6b4e16]"
        >
          Live editing is off on this host. Set HOCUSPOCUS_SECRET to the same value as the collaboration server, then redeploy.
        </p>
      ) : null}

      <div className="relative flex min-h-0 min-w-0 flex-1">
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="flex min-h-full flex-col">
          {cover ? (
            <div className="group/cover relative h-[30vh] min-h-[180px] w-full">
              {cover.kind === "color" ? (
                <div className="h-full w-full" style={{ background: cover.css }} />
              ) : (
                <img src={cover.src} alt="" className="h-full w-full object-cover" />
              )}
              {canEdit ? (
                <div className="cover-actions absolute right-4 bottom-4 z-20 opacity-0 transition-opacity duration-200 ease-out group-hover/cover:opacity-100">
                  {showComments ? (
                    <button
                      type="button"
                      className="cover-action"
                      onClick={() => {
                        setHistoryOpen(false);
                        setCommentsOpen(true);
                      }}
                    >
                      <MessageSquare />
                      Add comment
                    </button>
                  ) : null}
                  <CoverPicker
                    coverColor={coverColor}
                    label="Change cover"
                    align="end"
                    triggerClassName="cover-action"
                    onChange={(next) => {
                      const previous = coverColor;
                      setCoverColor(next);
                      void patchMeta({ coverColor: next }).then((ok) => {
                        if (!ok) setCoverColor(previous);
                      });
                    }}
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          <article
            className={cn(
              "group/page relative isolate flex w-full flex-1 flex-col items-stretch px-12 pb-16 text-left sm:px-16",
              cover ? "pt-2" : "pt-16",
            )}
          >
            <div className="group/header w-full text-left">
              {icon ? (
                <div className={cn("relative z-10 mb-6 self-start", cover && "-mt-8")}>
                  {canEdit ? (
                    <IconPicker
                      icon={icon}
                      onChange={(next) => updateIcon(next)}
                      trigger={
                        <button
                          type="button"
                          className="block overflow-visible rounded-[22px] text-left"
                        >
                          <PageIconView value={icon} variant="page" />
                        </button>
                      }
                    />
                  ) : (
                    <span className="block overflow-visible">
                      <PageIconView value={icon} variant="page" />
                    </span>
                  )}
                </div>
              ) : null}

              {canEdit && (!icon || !cover) ? (
                <div className="mb-1 flex items-center opacity-0 transition-opacity duration-200 ease-out group-hover/header:opacity-100">
                  <div className="cover-actions cover-actions-page">
                    {!icon ? (
                      <IconPicker
                        icon={icon}
                        onChange={(next) => updateIcon(next)}
                        trigger={
                          <button type="button" className="cover-action">
                            <SmilePlus />
                            Add icon
                          </button>
                        }
                      />
                    ) : null}
                    {!cover ? (
                      <CoverPicker
                        coverColor={coverColor}
                        label="Add cover"
                        align="start"
                        triggerClassName="cover-action"
                        onChange={(next) => {
                          const previous = coverColor;
                          setCoverColor(next);
                          void patchMeta({ coverColor: next }).then((ok) => {
                            if (!ok) setCoverColor(previous);
                          });
                        }}
                      />
                    ) : null}
                    {showComments && !cover ? (
                      <button
                        type="button"
                        className="cover-action"
                        onClick={() => {
                        setHistoryOpen(false);
                        setCommentsOpen(true);
                      }}
                      >
                        <MessageSquare />
                        Add comment
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <DocumentTitle
                title={title}
                canEdit={canEdit}
                onChange={applyTitle}
                onFlush={flushTitle}
              />
            </div>

            <div className="mt-2 w-full flex-1 text-left">{children}</div>
            {isEmpty === true && canEdit ? <GetStarted /> : null}
          </article>
        </div>
      </div>

      {showComments && pageComments.ready && pageComments.comments.length > 0 && !commentsOpen ? (
        <div className="pointer-events-none absolute top-4 right-4 z-20">
          <div className="pointer-events-auto">
            <CommentPeek
              comments={pageComments.comments}
              onOpen={() => {
                setHistoryOpen(false);
                setCommentsOpen(true);
              }}
            />
          </div>
        </div>
      ) : null}

      {showComments && commentsOpen ? (
        <>
          <button
            type="button"
            aria-label="Close comments"
            className="fixed inset-0 z-30 bg-black/10 sm:hidden"
            onClick={() => setCommentsOpen(false)}
          />
          <CommentsPanel
            comments={pageComments.comments}
            ready={pageComments.ready}
            viewerName={viewerName ?? null}
            viewerImage={viewerImage ?? null}
            onAdd={pageComments.addComment}
            onClose={() => setCommentsOpen(false)}
          />
        </>
      ) : null}
      {historyOpen ? (
        <>
          <button
            type="button"
            aria-label="Close version history"
            className="fixed inset-0 z-30 bg-black/10 sm:hidden"
            onClick={() => setHistoryOpen(false)}
          />
          <VersionHistoryDrawer
            versions={versions.versions}
            ready={versions.ready}
            onSave={versions.save}
            onRestore={versions.restore}
            onClose={() => setHistoryOpen(false)}
          />
        </>
      ) : null}
      </div>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="w-[min(420px,calc(100vw-2rem))] max-w-[min(420px,calc(100vw-2rem))] min-w-0 gap-0 overflow-hidden p-0 sm:max-w-[min(420px,calc(100vw-2rem))]">
          <DialogHeader className="gap-1 px-5 pt-5 pr-12 pb-4">
            <DialogTitle className="text-[15px] font-semibold tracking-[-0.01em] text-[#37352f]">
              Share
            </DialogTitle>
            <DialogDescription className="truncate text-[13px] text-[#37352f]/55">
              {title.trim() || "Untitled"}
            </DialogDescription>
          </DialogHeader>
          <div className="px-5 pb-4">
            <label htmlFor="share-email" className="text-[12px] font-medium text-[#37352f]/70">
              Invite by email
            </label>
            <Input
              id="share-email"
              type="email"
              value={inviteEmail}
              placeholder="name@email.com"
              className="mt-2 h-9 text-[13px]"
              onChange={(event) => setInviteEmail(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void sendInvite();
              }}
            />
            <div className="mt-2.5 flex items-center justify-between gap-3">
              <div className="inline-flex rounded-lg bg-[#f1f1ef] p-0.5" role="group" aria-label="Access">
                {(["view", "edit"] as const).map((role) => (
                  <button
                    key={role}
                    type="button"
                    aria-pressed={inviteRole === role}
                    className={cn(
                      "h-7 rounded-md px-2.5 text-[13px] text-[#37352f]/65 transition-colors",
                      inviteRole === role &&
                        "bg-white font-medium text-[#37352f] shadow-[0_1px_2px_rgba(15,15,15,0.06)]",
                    )}
                    onClick={() => setInviteRole(role)}
                  >
                    {role === "view" ? "Can view" : "Can edit"}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="h-8 rounded-md bg-[#37352f] px-3 text-[13px] font-medium text-white transition-opacity hover:bg-black disabled:opacity-40"
                onClick={() => void sendInvite()}
                disabled={inviteBusy || !inviteEmail.trim()}
              >
                {inviteBusy ? "Sending…" : "Invite"}
              </button>
            </div>
            {inviteNote ? (
              <p
                className={cn(
                  "mt-2.5 text-[13px]",
                  inviteNote.tone === "ok" ? "text-[#1f7a45]" : "text-[#9a4034]",
                )}
              >
                {inviteNote.text}
              </p>
            ) : null}
            <div className="mt-4">
              <p className="text-[12px] font-medium text-[#37352f]/70">People with access</p>
              {!accessReady ? (
                <p className="mt-2 text-[13px] text-[#37352f]/45">Loading people…</p>
              ) : (
                <ul className="mt-2 max-h-52 space-y-1 overflow-y-auto">
                  {accessOwner ? (
                    <li className="flex items-center gap-2 rounded-lg px-1 py-1.5">
                      <AccessFace
                        name={accessOwner.name || accessOwner.email || "Owner"}
                        image={accessOwner.image}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-[#37352f]">
                          {accessOwner.name || "Owner"}
                        </span>
                        <span className="block truncate text-[12px] text-[#37352f]/50">
                          {accessOwner.email}
                        </span>
                      </span>
                      <span className="shrink-0 text-[12px] text-[#37352f]/55">Owner</span>
                    </li>
                  ) : null}
                  {accessMembers.map((person) => (
                    <li key={person.userId} className="flex items-center gap-2 rounded-lg px-1 py-1.5">
                      <AccessFace
                        name={person.name || person.email || "Someone"}
                        image={person.image}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-[#37352f]">
                          {person.name || person.email}
                        </span>
                        <span className="block truncate text-[12px] text-[#37352f]/50">
                          {person.email}
                        </span>
                      </span>
                      <select
                        aria-label={`Access for ${person.name || person.email}`}
                        value={person.role}
                        className="h-7 shrink-0 rounded-md bg-transparent pr-1 text-[12px] text-[#37352f]/70"
                        onChange={(event) =>
                          void changeAccess(
                            { userId: person.userId },
                            event.target.value === "edit" ? "edit" : "view",
                          )
                        }
                      >
                        <option value="view">Can view</option>
                        <option value="edit">Can edit</option>
                      </select>
                      <button
                        type="button"
                        className="shrink-0 text-[12px] text-[#37352f]/45 hover:text-[#9a4034]"
                        onClick={() => void removeAccess({ userId: person.userId })}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                  {accessInvites.map((invite) => (
                    <li key={invite.email} className="flex items-center gap-2 rounded-lg px-1 py-1.5">
                      <AccessFace name={invite.email} image={null} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-[#37352f]">
                          {invite.email}
                        </span>
                        <span className="block text-[12px] text-[#37352f]/50">Invite sent</span>
                      </span>
                      <select
                        aria-label={`Access for ${invite.email}`}
                        value={invite.role}
                        className="h-7 shrink-0 rounded-md bg-transparent pr-1 text-[12px] text-[#37352f]/70"
                        onChange={(event) =>
                          void changeAccess(
                            { email: invite.email },
                            event.target.value === "edit" ? "edit" : "view",
                          )
                        }
                      >
                        <option value="view">Can view</option>
                        <option value="edit">Can edit</option>
                      </select>
                      <button
                        type="button"
                        className="shrink-0 text-[12px] text-[#37352f]/45 hover:text-[#9a4034]"
                        onClick={() => void removeAccess({ email: invite.email })}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="min-w-0 border-t border-black/[0.06] px-5 py-4">
            <p className="text-[13px] font-medium text-[#37352f]">View-only link</p>
            <p className="mt-0.5 text-[13px] leading-5 text-[#37352f]/55">
              Anyone with the link can open this page.
            </p>
            <div className="mt-3 flex min-w-0 items-center gap-2 overflow-hidden rounded-lg border border-black/[0.08] bg-[#f7f7f5] py-1 pr-1 pl-2.5">
              <Link2 className="size-3.5 shrink-0 text-[#37352f]/40" />
              <span
                className="min-w-0 flex-1 truncate text-[13px] text-[#37352f]/70"
                title={shareUrl ?? undefined}
              >
                {shareUrl ? shortShareUrl(shareUrl) : "Create a link to copy"}
              </span>
              <button
                type="button"
                className="h-7 shrink-0 rounded-md bg-white px-2.5 text-[13px] font-medium text-[#37352f] shadow-[0_1px_2px_rgba(15,15,15,0.04)] ring-1 ring-black/[0.08] hover:bg-[#fafafa] disabled:opacity-50"
                onClick={() => void createShareLink()}
                disabled={linkBusy}
              >
                {copied ? "Copied" : linkBusy ? "Copying…" : "Copy"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}