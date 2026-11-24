"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { HocuspocusProvider } from "@hocuspocus/provider";

type AwarenessUser = {
  id?: string;
  name?: string;
  color?: string;
  image?: string;
  self?: boolean;
};

export function PresenceAvatars({ provider }: { provider: HocuspocusProvider }) {
  const [users, setUsers] = useState<AwarenessUser[]>([]);
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setSlot(document.getElementById("syncpad-presence"));
  }, []);

  useEffect(() => {
    const awareness = provider.awareness;
    if (!awareness) return;

    const sync = () => {
      const states = awareness.getStates();
      const byKey = new Map<string, AwarenessUser>();
      states.forEach((state, clientId) => {
        const user = state?.user as AwarenessUser | undefined;
        if (!user?.name && !user?.id) return;
        const self = clientId === awareness.clientID;
        const key = user.id || user.name || String(clientId);
        const current = byKey.get(key);
        if (current && !self) return;
        byKey.set(key, {
          ...user,
          self: self || Boolean(current?.self),
        });
      });
      const list = [...byKey.values()].sort((a, b) => Number(Boolean(b.self)) - Number(Boolean(a.self)));
      queueMicrotask(() => setUsers(list));
    };

    sync();
    awareness.on("change", sync);
    return () => {
      awareness.off("change", sync);
    };
  }, [provider]);

  if (!slot || users.length === 0) return null;

  const shown = users.slice(0, 4);
  const extra = users.length - shown.length;

  return createPortal(
    <div className="mr-1.5 flex items-center" aria-label="People on this page">
      {shown.map((user, index) => {
        const label = user.self ? `${user.name ?? "You"} (you)` : (user.name ?? "Someone");
        return (
          <span
            key={user.id || `${user.name}-${index}`}
            title={label}
            className="-ml-1.5 inline-flex first:ml-0"
          >
            {user.image ? (
              <img
                src={user.image}
                alt=""
                width={24}
                height={24}
                referrerPolicy="no-referrer"
                className="size-6 rounded-full object-cover ring-2 ring-white"
              />
            ) : (
              <span
                className="inline-flex size-6 items-center justify-center rounded-full text-[11px] font-medium text-white ring-2 ring-white"
                style={{ backgroundColor: user.color ?? "#64748b" }}
              >
                {(user.name ?? "?").slice(0, 1).toUpperCase()}
              </span>
            )}
          </span>
        );
      })}
      {extra > 0 ? (
        <span className="-ml-1.5 inline-flex size-6 items-center justify-center rounded-full bg-[#f1f1ef] text-[11px] font-medium text-[#37352f] ring-2 ring-white">
          +{extra}
        </span>
      ) : null}
    </div>,
    slot,
  );
}
