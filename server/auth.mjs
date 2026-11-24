import { jwtVerify } from "jose";

function secretKey() {
  const secret = process.env.HOCUSPOCUS_SECRET;
  if (!secret) {
    throw new Error("HOCUSPOCUS_SECRET is required");
  }
  return new TextEncoder().encode(secret);
}

export async function verifyCollabToken(token) {
  const { payload } = await jwtVerify(token, secretKey());
  const docId = payload.docId;
  const userId = payload.userId;
  const role = payload.role;
  const name = payload.name;

  if (
    typeof docId !== "string" ||
    typeof userId !== "string" ||
    (role !== "view" && role !== "edit")
  ) {
    throw new Error("Invalid token");
  }

  return {
    docId,
    userId,
    role,
    name: typeof name === "string" ? name : "Anonymous",
  };
}