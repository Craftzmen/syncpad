"use client";

import { useEffect, useState } from "react";
import { MessageSquare, X } from "lucide-react";

import { CommentListSkeleton } from "@/components/page-skeletons";
import { cn } from "@/lib/utils";

export type PageComment = {
  id: string;
  body: string;
  createdAt: string;
  userId: string;
  authorName: string | null;
  authorImage: string | null;
};

export function usePageComments(documentId: string | null) {
  const [comments, setComments] = useState<PageComment[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!documentId) return;
    let cancelled = false;
    setReady(false);
    void (async () => {
      const res = await fetch(`/api/documents/${documentId}/comments`);
      if (cancelled) return;
      if (res.ok) setComments((await res.json()) as PageComment[]);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  async function addComment(body: string) {
    if (!documentId || !body.trim()) return false;
    const res = await fetch(`/api/documents/${documentId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: body.trim() }),
    });
    if (!res.ok) return false;
    const row = (await res.json()) as PageComment;
    setComments((current) => [row, ...current.filter((item) => item.id !== row.id)]);
    return true;
  }

  return { comments, ready, addComment };
}

export function CommentPeek({
  comments,
  onOpen,
}: {
  comments: PageComment[];
  onOpen: () => void;
}) {
  if (comments.length === 0) return null;
  const people = uniqueAuthors(comments);
  const shown = people.slice(0, 3);
  const extra = people.length - shown.length;

  return (
    <div className="group/peek relative">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${comments.length} comments`}
        className="flex items-center rounded-full border border-black/[0.08] bg-white p-1 shadow-[0_1px_2px_rgba(15,15,15,0.06),0_6px_16px_rgba(15,15,15,0.08)]"
      >
        {shown.map((person, index) => (
          <PersonFace
            key={person.userId}
            name={displayName(person.authorName)}
            image={person.authorImage}
            size={28}
            className={cn(index > 0 && "-ml-2 ring-2 ring-white")}
          />
        ))}
        {extra > 0 ? (
          <span className="-ml-2 inline-flex size-7 items-center justify-center rounded-full bg-[#f1f1ef] text-[11px] font-medium text-[#37352f] ring-2 ring-white">
            +{extra}
          </span>
        ) : comments.length > 1 ? (
          <span className="pr-1.5 pl-1 text-[12px] font-medium text-[#37352f]/70">
            {comments.length}
          </span>
        ) : null}
      </button>
      <div className="invisible absolute top-full right-0 z-40 pt-2 opacity-0 transition duration-150 group-hover/peek:visible group-hover/peek:opacity-100">
        <div className="w-72 rounded-xl border border-black/[0.08] bg-white p-1.5 shadow-[0_8px_28px_rgba(15,15,15,0.12)]">
          <ul className="max-h-64 space-y-0.5 overflow-y-auto">
            {comments.map((comment) => (
              <li key={comment.id} className="flex gap-2 rounded-lg px-2 py-1.5">
                <PersonFace
                  name={displayName(comment.authorName)}
                  image={comment.authorImage}
                  size={24}
                />
                <div className="min-w-0">
                  <p className="truncate text-[12px] text-[#37352f]/55">
                    <span className="font-medium text-[#37352f]">
                      {displayName(comment.authorName)}
                    </span>
                    <span aria-hidden> · </span>
                    {commentTime(comment.createdAt)}
                  </p>
                  <p className="mt-0.5 line-clamp-3 text-[13px] leading-5 text-[#37352f]">
                    {comment.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function CommentsPanel({
  comments,
  ready,
  viewerName,
  viewerImage,
  onAdd,
  onClose,
}: {
  comments: PageComment[];
  ready: boolean;
  viewerName: string | null;
  viewerImage: string | null;
  onAdd: (body: string) => Promise<boolean>;
  onClose?: () => void;
}) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  async function submit() {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    const ok = await onAdd(text);
    setSending(false);
    if (ok) setBody("");
  }

  return (
    <aside className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[22.5rem] min-h-0 flex-col overflow-hidden border-l border-black/[0.08] bg-white sm:static sm:z-auto sm:w-[22.5rem] sm:max-w-none sm:shrink-0">
      <div className="flex h-12 shrink-0 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <h2 className="text-[14px] font-medium text-[#37352f]">Comments</h2>
          {ready && comments.length > 0 ? (
            <span className="rounded-full bg-[#f1f1ef] px-1.5 py-0.5 text-[11px] font-medium text-[#37352f]/70">
              {comments.length}
            </span>
          ) : null}
        </div>
        {onClose ? (
          <button
            type="button"
            aria-label="Close comments"
            className="flex size-7 items-center justify-center rounded-md text-[#37352f]/55 hover:bg-[#f1f1ef] hover:text-[#37352f]"
            onClick={onClose}
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {ready ? (
          comments.length > 0 ? (
            <ul className="space-y-1">
              {comments.map((comment) => (
                <li key={comment.id} className="rounded-xl px-2 py-2.5 hover:bg-[#f7f7f5]">
                  <div className="flex gap-2.5">
                    <PersonFace
                      name={displayName(comment.authorName)}
                      image={comment.authorImage}
                      size={32}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <p className="truncate text-[13px] font-medium text-[#37352f]">
                          {displayName(comment.authorName)}
                        </p>
                        <time
                          className="shrink-0 text-[12px] text-[#37352f]/40"
                          dateTime={comment.createdAt}
                        >
                          {commentTime(comment.createdAt)}
                        </time>
                      </div>
                      <p className="mt-0.5 text-[14px] leading-5 whitespace-pre-wrap text-[#37352f]">
                        {comment.body}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex h-full min-h-40 flex-col items-center justify-center px-6 text-center">
              <span className="flex size-10 items-center justify-center rounded-full bg-[#f7f7f5] text-[#37352f]/45">
                <MessageSquare className="size-4" />
              </span>
              <p className="mt-3 text-[14px] font-medium text-[#37352f]">No comments yet</p>
              <p className="mt-1 text-[13px] leading-5 text-[#37352f]/50">
                Leave a note for anyone on this page.
              </p>
            </div>
          )
        ) : (
          <CommentListSkeleton />
        )}
      </div>

      <form
        className="shrink-0 border-t border-black/[0.06] p-3"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="flex gap-2.5">
          <PersonFace name={displayName(viewerName)} image={viewerImage} size={28} />
          <div className="min-w-0 flex-1">
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
                event.preventDefault();
                void submit();
              }}
              placeholder="Write a comment…"
              rows={2}
              className="w-full resize-none rounded-xl border border-black/[0.08] bg-[#fafafa] px-3 py-2 text-[14px] leading-5 text-[#37352f] outline-none placeholder:text-[#37352f]/35 focus:border-black/15 focus:bg-white"
            />
            <div className="mt-2 flex items-center justify-end">
              <button
                type="submit"
                disabled={!body.trim() || sending}
                className="h-8 rounded-lg bg-[#37352f] px-3 text-[13px] font-medium text-white disabled:bg-[#37352f]/20"
              >
                {sending ? "Sending…" : "Comment"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </aside>
  );
}

function uniqueAuthors(comments: PageComment[]) {
  const seen = new Set<string>();
  const people: PageComment[] = [];
  for (const comment of comments) {
    if (seen.has(comment.userId)) continue;
    seen.add(comment.userId);
    people.push(comment);
  }
  return people;
}

function displayName(name: string | null) {
  const trimmed = name?.trim();
  return trimmed || "Someone";
}

function commentTime(iso: string) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const delta = Date.now() - then;
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (delta < minute) return "Just now";
  if (delta < hour) return `${Math.floor(delta / minute)}m`;
  if (delta < day) return `${Math.floor(delta / hour)}h`;
  if (delta < 7 * day) return `${Math.floor(delta / day)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function PersonFace({
  name,
  image,
  size,
  className,
}: {
  name: string;
  image: string | null;
  size: number;
  className?: string;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  if (image) {
    return (
      <img
        src={image}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        className={cn("shrink-0 rounded-full object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-[#ececec] font-medium text-[#37352f]",
        size <= 28 ? "text-[11px]" : "text-[12px]",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {initial}
    </span>
  );
}
