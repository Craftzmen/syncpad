import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

export function SyncMark({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
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

export function GitHubIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.7 7.7 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
      />
    </svg>
  );
}

export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 text-[#191919]">
      <span className="flex size-8 items-center justify-center rounded-[10px] bg-black text-white">
        <SyncMark className="size-[18px]" />
      </span>
      <span className="text-[15px] font-semibold tracking-[-0.02em]">SyncPad</span>
    </Link>
  );
}

const FEATURES = [
  {
    title: "Live editing",
    body: "Everyone on the page sees the same document as it changes.",
  },
  {
    title: "Presence",
    body: "Avatars and cursors show who is here and where they are writing.",
  },
  {
    title: "Comments",
    body: "A note stays beside the passage, and opens when you hover the mark.",
  },
  {
    title: "Sharing",
    body: "Invite someone to edit the page, or to view it.",
  },
  {
    title: "Version history",
    body: "Save the page as it stands, then restore that version from the side drawer.",
  },
  {
    title: "Pins",
    body: "Keep the pages you return to at the top of the sidebar.",
  },
] as const;

export function FeatureGrid() {
  return (
    <section id="product" className="scroll-mt-20">
      <SectionIntro
        eyebrow="On the page"
        title="The document, the people, and the access."
      />
      <div className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-black/[0.08] bg-black/[0.08] sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="bg-white px-5 py-5">
            <h3 className="text-[14px] font-semibold tracking-[-0.01em]">{feature.title}</h3>
            <p className="mt-1.5 text-[13px] leading-5 text-black/55">{feature.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function WritingSection() {
  return (
    <section id="writing" className="scroll-mt-20 grid items-center gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-12">
      <SectionIntro
        eyebrow="Writing"
        title="The blocks the page is made of."
        body="Text, callouts, quotes, code, tables, images, and video live in the same document. Drag a corner to resize a picture or a video after it is on the page."
      />
      <div className="overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-[0_18px_50px_-32px_rgba(15,15,15,0.45)]">
        <div className="border-b border-black/[0.06] px-5 py-3 text-[13px] text-black/45">Product brief</div>
        <div className="space-y-3 px-5 py-5 sm:px-6">
          <p className="text-[15px] leading-6 text-[#37352f]">
            A shared page for the launch, with the decisions written once.
          </p>
          <div className="flex gap-2 rounded-md bg-[#f7f6f3] px-3 py-2.5 text-[14px] leading-6">
            <span>💡</span>
            <span>Ship the editor first. Sharing and presence stay on the page.</span>
          </div>
          <p className="border-l-2 border-black/15 pl-3 text-[14px] leading-6 text-black/55">
            Keep the page calm. The writing is the interface.
          </p>
          <pre className="overflow-x-auto rounded-lg bg-[#f7f6f3] px-3 py-2.5 font-mono text-[12.5px] leading-5 text-[#37352f]">
            <span className="text-[#d73a49]">const</span> role = <span className="text-[#032f62]">&quot;edit&quot;</span>
          </pre>
          <div className="overflow-hidden rounded-lg border border-black/[0.08] text-[13px]">
            <div className="grid grid-cols-2 bg-[#f7f7f5] font-medium">
              <div className="px-3 py-2">Name</div>
              <div className="border-l border-black/[0.06] px-3 py-2">Access</div>
            </div>
            <div className="grid grid-cols-2 border-t border-black/[0.06]">
              <div className="px-3 py-2">Amina</div>
              <div className="border-l border-black/[0.06] px-3 py-2">Edit</div>
            </div>
            <div className="grid grid-cols-2 border-t border-black/[0.06]">
              <div className="px-3 py-2">Malik</div>
              <div className="border-l border-black/[0.06] px-3 py-2">View</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function TogetherSection() {
  return (
    <section id="together" className="scroll-mt-20 grid items-center gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12">
      <div className="overflow-hidden rounded-2xl border border-black/[0.08] bg-white p-5 shadow-[0_18px_50px_-32px_rgba(15,15,15,0.45)] sm:p-6">
        <div className="flex items-center gap-2">
          <PreviewFace letter="A" className="bg-[#f3d7c3] text-[#6b3d24]" />
          <div>
            <p className="text-[13px] font-medium">Amina</p>
            <p className="text-[12px] text-black/40">On this page</p>
          </div>
          <span className="ml-auto flex items-center gap-1.5 text-[12px] text-black/45">
            <span className="size-1.5 rounded-full bg-[#2383e2]" />
            Writing
          </span>
        </div>
        <p className="mt-4 text-[14px] leading-6 text-black/70">
          Can we keep the launch note on this page, and leave the older draft in history?
        </p>
        <div className="mt-4 rounded-lg border border-black/[0.08] bg-[#fafaf8] px-3 py-2 text-[13px] text-black/35">
          Reply to Amina
        </div>
        <div className="mt-5 flex items-center gap-3 border-t border-black/[0.06] pt-4">
          <div className="flex">
            <PreviewFace letter="A" className="bg-[#f3d7c3] text-[#6b3d24]" />
            <PreviewFace letter="M" className="-ml-1.5 bg-[#d7e4f7] text-[#23406b]" ring />
          </div>
          <p className="text-[13px] text-black/50">Amina and Malik are in the document.</p>
        </div>
      </div>
      <SectionIntro
        eyebrow="Together"
        title="See who is writing, and what they marked."
        body="Cursors follow the person. Comments sit on the passage. A saved version can be opened from the side and restored when the page needs to go back."
      />
    </section>
  );
}

export function CloseSection() {
  return (
    <section className="overflow-hidden rounded-2xl bg-[#191919] px-6 py-10 text-white sm:px-10 sm:py-12">
      <p className="text-[13px] font-medium text-white/50">SyncPad</p>
      <h2 className="mt-2 max-w-lg text-[32px] leading-[1.1] font-semibold tracking-[-0.03em] sm:text-[40px]">
        Open a page and write it with someone else.
      </h2>
      <Link
        href="/login"
        className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-[14px] font-medium text-[#191919] hover:bg-white/90"
      >
        <GitHubIcon />
        Sign in with GitHub
      </Link>
    </section>
  );
}

function SectionIntro({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body?: string;
}) {
  return (
    <div className="max-w-xl">
      <p className="text-[13px] font-medium text-black/45">{eyebrow}</p>
      <h2 className="mt-2 text-[28px] leading-[1.15] font-semibold tracking-[-0.03em] sm:text-[34px]">
        {title}
      </h2>
      {body ? <p className="mt-3 text-[15px] leading-6 text-black/55">{body}</p> : null}
    </div>
  );
}

export function ProductPreview({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-[0_28px_70px_-36px_rgba(15,15,15,0.55)]"
      aria-hidden
    >
      <div className={`flex ${compact ? "h-[340px]" : "h-[440px] max-h-[58vh] min-h-[320px]"}`}>
        <aside className="hidden w-[210px] shrink-0 flex-col border-r border-black/[0.06] bg-[#f7f7f5] sm:flex">
          <div className="flex h-12 items-center gap-2 px-3">
            <span className="flex size-7 items-center justify-center rounded-lg bg-black text-white">
              <SyncMark className="size-4" />
            </span>
            <span className="text-[13px] font-semibold tracking-[-0.02em]">SyncPad</span>
          </div>
          <div className="px-2 pb-3 text-[13px]">
            <p className="px-2 pt-1 pb-1 text-[11px] font-medium text-black/40">Pinned</p>
            <div className="rounded-md bg-black/[0.06] px-2 py-1.5 font-medium">Product brief</div>
            <div className="px-2 py-1.5 text-black/65">Launch notes</div>
            <div className="px-2 py-1.5 text-black/65">Meeting notes</div>
            <p className="px-2 pt-4 pb-1 text-[11px] font-medium text-black/40">Private</p>
            <div className="px-2 py-1.5 text-black/65">Research</div>
            <div className="px-2 py-1.5 text-black/65">Ideas</div>
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col bg-white">
          <div className="flex h-12 shrink-0 items-center gap-3 border-b border-black/[0.06] px-4">
            <span className="truncate text-[13px] text-black/50">Product brief</span>
            <span className="ml-auto flex items-center">
              <PreviewFace letter="A" className="bg-[#f3d7c3] text-[#6b3d24]" />
              <PreviewFace letter="M" className="-ml-1.5 bg-[#d7e4f7] text-[#23406b]" ring />
            </span>
            <span className="rounded-md bg-[#191919] px-2.5 py-1 text-[12px] font-medium text-white">
              Share
            </span>
          </div>
          <div className={`min-h-0 flex-1 overflow-hidden ${compact ? "px-5 pt-5" : "px-6 pt-8 sm:px-10"}`}>
            <h3
              className={`leading-none font-semibold tracking-[-0.03em] text-[#191919] ${compact ? "text-[26px]" : "text-[32px]"}`}
            >
              Product brief
            </h3>
            <p className="mt-4 max-w-md text-[14.5px] leading-6 text-black/70">
              A shared page for the launch, with the decisions written once and kept current.
            </p>
            <div className="mt-4 flex max-w-md gap-2 rounded-md bg-[#f7f6f3] px-3 py-2.5 text-[14px] leading-6 text-[#37352f]">
              <span className="text-[16px] leading-6">💡</span>
              <span>Ship the editor first. Sharing and presence stay on the page.</span>
            </div>
            <p className="mt-4 max-w-md border-l-2 border-black/15 pl-3 text-[14px] leading-6 text-black/55">
              Keep the page calm. The writing is the interface.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewFace({
  letter,
  className,
  ring = false,
}: {
  letter: string;
  className: string;
  ring?: boolean;
}) {
  return (
    <span
      className={`flex size-6 items-center justify-center rounded-full text-[11px] font-medium ${className} ${ring ? "ring-2 ring-white" : ""}`}
    >
      {letter}
    </span>
  );
}

export function GitHubButton({
  children,
  full = false,
  type = "button",
}: {
  children: ReactNode;
  full?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <Button
      type={type}
      size="lg"
      className={`h-10 gap-2 bg-[#191919] px-4 text-[14px] hover:bg-black ${full ? "w-full" : ""}`}
    >
      <GitHubIcon />
      {children}
    </Button>
  );
}
