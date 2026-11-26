import { cookies } from "next/headers";

import { getDocumentRole, getRoleFromShareToken } from "@/lib/permissions";

/** Edit access for the signed-in owner, a member, or a share link. */
export async function editorRole(userId: string | null, documentId: string) {
  const role = await getDocumentRole(userId, documentId);
  if (role === "edit" || role === "view") return role;
  const token = (await cookies()).get(`share_${documentId}`)?.value;
  if (!token) return null;
  return getRoleFromShareToken(token, documentId);
}
