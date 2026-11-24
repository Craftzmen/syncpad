"use client";

import { useState } from "react";

export function EmailTestButton() {
  const [note, setNote] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function send() {
    setPending(true);
    setNote(null);
    const res = await fetch("/api/email/test", { method: "POST" });
    const data = (await res.json().catch(() => ({}))) as { to?: string; error?: string };
    setPending(false);
    setNote(res.ok ? `Test sent to ${data.to}` : (data.error ?? "Could not send"));
  }

  return (
    <div className="border-t border-black/[0.06] px-4 py-3">
      <button
        type="button"
        onClick={() => void send()}
        disabled={pending}
        className="text-sm text-[#0d0d0d] underline-offset-2 hover:underline disabled:opacity-50"
      >
        {pending ? "Sending…" : "Send a test email"}
      </button>
      {note ? <p className="mt-1 text-sm text-[#5d5d5d]">{note}</p> : null}
    </div>
  );
}
