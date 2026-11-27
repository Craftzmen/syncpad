import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import {
  CloseSection,
  FeatureGrid,
  ProductPreview,
  TogetherSection,
  Wordmark,
  WritingSection,
} from "@/components/auth-pages";

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="h-full min-h-0 overflow-y-auto overscroll-contain bg-[#f6f6f4] text-[#191919]">
      <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col px-5 sm:px-8">
        <header className="sticky top-0 z-10 flex h-16 items-center bg-[#f6f6f4]">
          <Wordmark />
          <nav className="ml-8 hidden items-center gap-5 text-[13px] text-black/55 sm:flex">
            <a href="#product" className="hover:text-[#191919]">
              Product
            </a>
            <a href="#writing" className="hover:text-[#191919]">
              Writing
            </a>
            <a href="#together" className="hover:text-[#191919]">
              Together
            </a>
          </nav>
          <Link
            href="/login"
            className="ml-auto inline-flex h-8 items-center rounded-lg border border-black/[0.08] bg-white px-3 text-[13px] font-medium text-[#191919] hover:bg-black/[0.03]"
          >
            Sign in
          </Link>
        </header>

        <section className="mx-auto max-w-[40rem] pt-12 pb-10 text-center sm:pt-16">
          <p className="text-[13px] font-medium text-black/45">Collaborative documents</p>
          <h1 className="mt-3 text-[40px] leading-[1.05] font-semibold tracking-[-0.04em] text-balance sm:text-[56px]">
            A calm editor for pages you write together.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[16px] leading-7 text-black/60">
            Notes, specs, and shared documents. Live cursors, comments, and access stay on the page.
          </p>
          <div className="mt-8">
            <Link
              href="/login"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#191919] px-4 text-[14px] font-medium text-white hover:bg-black"
            >
              Sign in
            </Link>
          </div>
        </section>

        <ProductPreview />

        <div className="mt-16 space-y-16 sm:mt-20 sm:space-y-20">
          <FeatureGrid />
          <WritingSection />
          <TogetherSection />
          <CloseSection />
        </div>

        <footer className="mt-auto flex items-center justify-between py-8 text-[13px] text-black/40">
          <span>SyncPad</span>
          <span>Real-time documents</span>
        </footer>
      </div>
    </main>
  );
}
