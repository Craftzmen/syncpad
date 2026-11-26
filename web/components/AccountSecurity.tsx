"use client";

import { useState } from "react";
import { LogOut, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

async function leaveSession() {
  const csrfRes = await fetch("/api/auth/csrf");
  const csrf = (await csrfRes.json().catch(() => ({}))) as { csrfToken?: string };
  if (csrf.csrfToken) {
    await fetch("/api/auth/signout", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        csrfToken: csrf.csrfToken,
        callbackUrl: `${location.origin}/`,
      }),
    });
    window.location.assign("/");
    return;
  }
  window.location.assign("/api/auth/signout");
}

export function AccountSecurity({
  email,
  name,
}: {
  email: string | null;
  name: string;
}) {
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteReady = confirm.trim().toLowerCase() === "delete";

  function closeDelete() {
    if (deleting) return;
    setDeleteOpen(false);
    setConfirm("");
    setDeleteError(null);
  }

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    await leaveSession();
  }

  async function removeAccount() {
    if (!deleteReady || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    const res = await fetch("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: "delete" }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setDeleteError(data.error ?? "Could not delete this account");
      setDeleting(false);
      return;
    }
    await leaveSession();
  }

  return (
    <>
      <section className="mt-8 max-w-3xl">
        <h2 className="mb-2 px-1 text-[13px] text-[#8e8e8e]">Session</h2>
        <div className="flex flex-col items-start gap-4 rounded-xl border border-black/[0.08] bg-white px-4 py-4 sm:flex-row sm:items-center">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#f6f5f4] text-[#37352f]">
            <LogOut className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium tracking-[-0.01em]">Sign out</p>
            <p className="mt-0.5 text-[13px] leading-5 text-[#6f6f6f]">
              End this session on this device. Pages stay saved on {name}&apos;s account.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            onClick={() => setSignOutOpen(true)}
          >
            Log out
          </Button>
        </div>
      </section>

      <section className="mt-8 max-w-3xl">
        <h2 className="mb-2 px-1 text-[13px] text-[#8e8e8e]">Danger zone</h2>
        <div className="flex flex-col items-start gap-4 rounded-xl border border-[#f0d4d2] bg-[#fdf8f7] px-4 py-4 sm:flex-row sm:items-center">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-[#c44742] shadow-[0_0_0_1px_rgba(196,71,66,0.12)]">
            <TriangleAlert className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium tracking-[-0.01em] text-[#6b2c28]">Delete account</p>
            <p className="mt-0.5 text-[13px] leading-5 text-[#8a5a56]">
              Permanently remove this account and every page you own.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="shrink-0 border-[#e7b4b0] bg-white text-[#c44742] hover:bg-[#fff5f4] hover:text-[#c44742]"
            onClick={() => {
              setConfirm("");
              setDeleteError(null);
              setDeleteOpen(true);
            }}
          >
            Delete account
          </Button>
        </div>
      </section>

      <Dialog open={signOutOpen} onOpenChange={(next) => !signingOut && setSignOutOpen(next)}>
        <DialogContent
          showCloseButton={false}
          className="w-[min(420px,calc(100vw-2rem))] gap-0 overflow-hidden p-0 sm:max-w-[420px]"
        >
          <div className="px-6 pt-6 pb-5">
            <span className="flex size-10 items-center justify-center rounded-xl bg-[#f6f5f4] text-[#37352f]">
              <LogOut className="size-4" />
            </span>
            <DialogHeader className="mt-4 gap-1.5 text-left">
              <DialogTitle className="text-[17px] font-semibold tracking-[-0.02em] text-[#1c1c1c]">
                Log out of SyncPad?
              </DialogTitle>
              <DialogDescription className="text-[13px] leading-5 text-[#6f6f6f]">
                This ends the session on this browser. Sign in with GitHub again to open your pages.
                Everything already saved stays on {name}&apos;s account.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-black/[0.06] bg-[#fafafa] px-5 py-3">
            <Button
              type="button"
              variant="outline"
              className="bg-white"
              disabled={signingOut}
              onClick={() => setSignOutOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" disabled={signingOut} onClick={() => void signOut()}>
              {signingOut ? "Logging out…" : "Log out"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={(next) => (next ? setDeleteOpen(true) : closeDelete())}>
        <DialogContent
          showCloseButton={false}
          className="w-[min(440px,calc(100vw-2rem))] gap-0 overflow-hidden p-0 sm:max-w-[440px]"
        >
          <div className="px-6 pt-6 pb-5">
            <span className="flex size-10 items-center justify-center rounded-xl bg-[#fdeceb] text-[#c44742]">
              <TriangleAlert className="size-4" />
            </span>
            <DialogHeader className="mt-4 gap-1.5 text-left">
              <DialogTitle className="text-[17px] font-semibold tracking-[-0.02em] text-[#1c1c1c]">
                Delete this account?
              </DialogTitle>
              <DialogDescription className="text-[13px] leading-5 text-[#6f6f6f]">
                {email ? (
                  <>
                    <span className="font-medium text-[#37352f]">{email}</span> will be removed, along
                    with everything that belongs to it.
                  </>
                ) : (
                  "This account will be removed, along with everything that belongs to it."
                )}
              </DialogDescription>
            </DialogHeader>
            <ul className="mt-4 space-y-2 text-[13px] leading-5 text-[#4a4a4a]">
              <li className="flex gap-2">
                <span className="mt-[7px] size-1 shrink-0 rounded-full bg-[#c44742]" />
                Pages you own are deleted, including ones you have shared.
              </li>
              <li className="flex gap-2">
                <span className="mt-[7px] size-1 shrink-0 rounded-full bg-[#c44742]" />
                Your comments are removed from other pages.
              </li>
              <li className="flex gap-2">
                <span className="mt-[7px] size-1 shrink-0 rounded-full bg-[#c44742]" />
                Access you were given to someone else’s pages ends.
              </li>
            </ul>
            <label className="mt-4 block text-[13px] font-medium text-[#37352f]">
              Type <span className="font-semibold">delete</span> to confirm
              <Input
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void removeAccount();
                }}
                autoComplete="off"
                spellCheck={false}
                placeholder="delete"
                className="mt-2 h-9 bg-white text-[13px]"
              />
            </label>
            {deleteError ? <p className="mt-2 text-[13px] text-[#c44742]">{deleteError}</p> : null}
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-black/[0.06] bg-[#fafafa] px-5 py-3">
            <Button
              type="button"
              variant="outline"
              className="bg-white"
              disabled={deleting}
              onClick={closeDelete}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="bg-[#c44742] text-white hover:bg-[#b13d38]"
              disabled={!deleteReady || deleting}
              onClick={() => void removeAccount()}
            >
              {deleting ? "Deleting…" : "Delete account"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
