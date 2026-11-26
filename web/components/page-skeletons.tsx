import { Skeleton } from "@/components/ui/skeleton";

export function WorkspaceSkeleton() {
  return (
    <div className="fixed inset-0 flex overflow-hidden bg-white">
      <div className="flex h-full w-[292px] shrink-0 border-r border-black/[0.06] bg-[#f9f9f9]">
        <div className="flex h-full w-[52px] shrink-0 flex-col items-center gap-2 border-r border-black/[0.06] py-3">
          <Skeleton className="size-8 rounded-[10px] bg-[#ececec]" />
          <Skeleton className="mt-2 size-8 rounded-lg bg-[#ececec]" />
          <Skeleton className="size-8 rounded-lg bg-[#ececec]" />
          <Skeleton className="size-8 rounded-lg bg-[#ececec]" />
          <Skeleton className="mt-auto size-8 rounded-full bg-[#ececec]" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2 px-3 py-4">
          <Skeleton className="h-4 w-24 bg-[#ececec]" />
          <Skeleton className="mt-3 h-8 w-full rounded-md bg-[#ececec]" />
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-7 w-full rounded-md bg-[#ececec]" />
          ))}
        </div>
      </div>
      <div className="min-w-0 flex-1 px-12 pt-16 sm:px-16">
        <Skeleton className="h-10 w-64 bg-[#f1f1ef]" />
        <div className="mt-8">
          <EditorBodySkeleton />
        </div>
      </div>
    </div>
  );
}

export function AuthPageSkeleton() {
  return (
    <main className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#f6f6f4]">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center px-5 sm:px-8">
        <Skeleton className="size-8 rounded-[10px] bg-[#e7e7e4]" />
        <Skeleton className="ml-2.5 h-4 w-20 bg-[#e7e7e4]" />
        <Skeleton className="ml-auto h-8 w-20 rounded-lg bg-[#e7e7e4]" />
      </div>
      <div className="mx-auto mt-12 flex w-full max-w-xl flex-col items-center gap-3 px-6">
        <Skeleton className="h-3 w-36 bg-[#e7e7e4]" />
        <Skeleton className="h-10 w-full bg-[#e6e6e3]" />
        <Skeleton className="h-10 w-4/5 bg-[#e6e6e3]" />
        <Skeleton className="mt-1 h-4 w-2/3 bg-[#e7e7e4]" />
        <Skeleton className="mt-4 h-10 w-48 rounded-lg bg-[#dededb]" />
      </div>
      <Skeleton className="mx-auto mt-12 h-72 w-[calc(100%-2.5rem)] max-w-5xl rounded-2xl bg-[#ecece8]" />
    </main>
  );
}

export function LoginPageSkeleton() {
  return (
    <main className="grid h-full min-h-0 flex-1 bg-white lg:grid-cols-2">
      <div className="hidden bg-[#f6f6f4] lg:block" />
      <div className="flex items-center justify-center px-6">
        <div className="flex w-full max-w-sm flex-col gap-3">
          <Skeleton className="size-8 rounded-[10px] bg-[#f1f1ef]" />
          <Skeleton className="h-7 w-40 bg-[#f1f1ef]" />
          <Skeleton className="h-4 w-56 bg-[#f1f1ef]" />
          <Skeleton className="mt-4 h-10 w-full rounded-lg bg-[#ecece8]" />
        </div>
      </div>
    </main>
  );
}

export function EditorBodySkeleton() {
  return (
    <div className="space-y-3 pt-3" aria-hidden>
      <Skeleton className="h-4 w-[92%] bg-[#f1f1ef]" />
      <Skeleton className="h-4 w-[74%] bg-[#f1f1ef]" />
      <Skeleton className="mt-5 h-28 w-full rounded-lg bg-[#f1f1ef]" />
      <Skeleton className="h-4 w-[86%] bg-[#f1f1ef]" />
      <Skeleton className="h-4 w-[63%] bg-[#f1f1ef]" />
      <Skeleton className="mt-2 h-16 w-full rounded-lg bg-[#f1f1ef]" />
      <Skeleton className="h-4 w-[48%] bg-[#f1f1ef]" />
    </div>
  );
}

export function DocumentPageSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <div className="flex h-11 shrink-0 items-center gap-3 border-b border-black/[0.06] px-3">
        <Skeleton className="h-4 w-28 bg-[#f1f1ef]" />
        <Skeleton className="ml-auto h-7 w-16 rounded-md bg-[#f1f1ef]" />
        <Skeleton className="size-7 rounded-md bg-[#f1f1ef]" />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <Skeleton className="h-[30vh] min-h-[180px] w-full rounded-none bg-[#f1f1ef]" />
        <div className="px-12 pt-8 sm:px-16">
          <Skeleton className="h-10 w-64 bg-[#f1f1ef]" />
          <div className="mt-8">
            <EditorBodySkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}

export function HomePageSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <div className="flex h-11 shrink-0 items-center border-b border-black/[0.06] px-4">
        <Skeleton className="h-4 w-16 bg-[#f1f1ef]" />
      </div>
      <div className="mx-auto w-full max-w-2xl px-6 py-12 sm:px-10 sm:py-16">
        <Skeleton className="h-4 w-40 bg-[#f1f1ef]" />
        <Skeleton className="mt-3 h-8 w-72 bg-[#f1f1ef]" />
        <Skeleton className="mt-8 h-10 w-36 rounded-lg bg-[#f1f1ef]" />
        <div className="mt-10 space-y-2">
          <Skeleton className="h-3 w-24 bg-[#f1f1ef]" />
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-9 w-full rounded-md bg-[#f1f1ef]" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function SettingsPageSkeleton() {
  return (
    <div className="min-h-0 flex-1 overflow-hidden bg-white px-12 py-10 sm:px-16">
      <Skeleton className="h-8 w-36 bg-[#f1f1ef]" />
      <Skeleton className="mt-2 h-4 w-52 bg-[#f1f1ef]" />
      <div className="mt-8 flex items-center gap-4">
        <Skeleton className="size-14 rounded-full bg-[#f1f1ef]" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-40 bg-[#f1f1ef]" />
          <Skeleton className="h-4 w-56 bg-[#f1f1ef]" />
        </div>
      </div>
      <div className="mt-10 space-y-3">
        <Skeleton className="h-3 w-20 bg-[#f1f1ef]" />
        <Skeleton className="h-12 w-full rounded-lg bg-[#f1f1ef]" />
        <Skeleton className="h-12 w-full rounded-lg bg-[#f1f1ef]" />
        <Skeleton className="mt-6 h-3 w-16 bg-[#f1f1ef]" />
        <Skeleton className="h-12 w-full rounded-lg bg-[#f1f1ef]" />
        <Skeleton className="h-24 w-full rounded-lg bg-[#f1f1ef]" />
      </div>
    </div>
  );
}

export function CommentListSkeleton() {
  return (
    <div className="space-y-4 px-2 py-2" aria-hidden>
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="flex gap-2.5">
          <Skeleton className="size-8 shrink-0 rounded-full bg-[#f1f1ef]" />
          <div className="min-w-0 flex-1 space-y-2 pt-1">
            <Skeleton className="h-3 w-24 bg-[#f1f1ef]" />
            <Skeleton className="h-3 w-full bg-[#f1f1ef]" />
            <Skeleton className="h-3 w-2/3 bg-[#f1f1ef]" />
          </div>
        </div>
      ))}
    </div>
  );
}
