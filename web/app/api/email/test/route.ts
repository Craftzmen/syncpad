import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { emailDocument, getEmailConfigFromEnv, sendEmail } from "@/lib/email";

export async function POST() {
  const session = await auth();
  const to = session?.user?.email;
  if (!session?.user?.id || !to) {
    return NextResponse.json({ error: "Sign in with an account that has an email" }, { status: 401 });
  }

  const cfg = getEmailConfigFromEnv();
  if (!cfg.ok) {
    return NextResponse.json({ error: cfg.reason }, { status: 400 });
  }

  const message = emailDocument({
    heading: "SyncPad email is connected",
    paragraphs: [
      "This is a test from your SyncPad workspace.",
      "Share invites and comment notifications will come from this mailbox.",
    ],
  });
  const result = await sendEmail({
    to,
    subject: "SyncPad email is connected",
    ...message,
  });

  if (!result.sent) {
    return NextResponse.json({ error: result.reason }, { status: 502 });
  }
  return NextResponse.json({ ok: true, to });
}
