"use client";

import Editor from "@/components/Editor";
import type { CollabRole } from "@/lib/collab-token";

export default function EditorPage({
  docId,
  token,
  role,
  userId,
  name,
  image = null,
  initialState,
}: {
  docId: string;
  token: string;
  role: CollabRole;
  userId: string;
  name: string;
  image?: string | null;
  initialState?: string | null;
}) {
  return (
    <Editor
      docId={docId}
      token={token}
      role={role}
      userId={userId}
      name={name}
      image={image}
      initialState={initialState}
    />
  );
}
