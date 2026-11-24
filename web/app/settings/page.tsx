import type { ReactNode } from "react";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { EmailTestButton } from "@/components/EmailTestButton";
import { getEmailConfigFromEnv } from "@/lib/email";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/settings");
  }

  const name = session.user.name?.trim() || "SyncPad";
  const email = session.user.email;
  const image = session.user.image;
  const initial = name[0]?.toUpperCase() ?? "S";
  const emailConfig = getEmailConfigFromEnv();
  const emailReady = emailConfig.ok;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white text-[#0d0d0d]">
      <div className="w-full px-12 py-10 sm:px-16">
        <h1 className="text-[28px] font-medium tracking-[-0.03em]">Settings</h1>
        <p className="mt-1 text-sm text-[#8e8e8e]">Account, email, and sign-in</p>

        <div className="mt-8 flex items-center gap-4">
          {image ? (
            <img src={image} alt="" className="size-14 rounded-full object-cover" />
          ) : (
            <span className="flex size-14 items-center justify-center rounded-full bg-[#ececec] text-lg font-medium">
              {initial}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-lg font-medium tracking-[-0.02em]">{name}</p>
            <p className="truncate text-sm text-[#8e8e8e]">
              {email ?? "No email on this account"}
            </p>
          </div>
        </div>

        <SettingsGroup title="Account">
          <SettingsRow label="Name" value={name} />
          <SettingsRow label="Email" value={email ?? "Not provided"} />
          <SettingsRow label="Signed in with" value="GitHub" />
        </SettingsGroup>

        <SettingsGroup title="Email">
          <SettingsRow
            label="Delivery"
            value={emailReady ? "Connected" : "Not connected"}
          />
          <SettingsRow
            label="Sends from"
            value={emailReady ? emailConfig.config.user : "Not set"}
          />
          <p className="px-4 py-3 text-sm leading-relaxed text-[#5d5d5d]">
            Share invites go out as soon as you send them. Comments email the
            page owner and anyone else on the page.
          </p>
          {emailReady ? <EmailTestButton /> : null}
        </SettingsGroup>

        <SettingsGroup title="Session">
          <a
            href="/api/auth/signout"
            className="flex h-12 items-center px-4 text-sm text-[#d44c47] hover:bg-[#fafafa]"
          >
            Log out
          </a>
        </SettingsGroup>
      </div>
    </div>
  );
}

function SettingsGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-8 max-w-3xl">
      <h2 className="mb-2 px-1 text-[13px] text-[#8e8e8e]">{title}</h2>
      <div className="overflow-hidden rounded-xl border border-black/[0.08] bg-white">
        {children}
      </div>
    </section>
  );
}

function SettingsRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex h-12 items-center justify-between gap-6 border-b border-black/[0.06] px-4 last:border-b-0">
      <span className="text-sm">{label}</span>
      <span className="truncate text-sm text-[#5d5d5d]">{value}</span>
    </div>
  );
}
