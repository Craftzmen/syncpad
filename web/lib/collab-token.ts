import { SignJWT, jwtVerify } from "jose";

export type CollabRole = "view" | "edit";

export type CollabClaims = {
  docId: string;
  userId: string;
  role: CollabRole;
  name?: string;
};

function secretKey() {
  // Computed access stays a runtime read. A direct process.env.HOCUSPOCUS_SECRET
  // lookup can be frozen to whatever was present when the server was built.
  const secret = process.env["HOCUSPOCUS_SECRET"];
  if (!secret) {
    throw new Error("HOCUSPOCUS_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

export async function signCollabToken(claims: CollabClaims) {
  return new SignJWT({
    docId: claims.docId,
    userId: claims.userId,
    role: claims.role,
    name: claims.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secretKey());
}

export async function verifyCollabToken(token: string): Promise<CollabClaims> {
  const { payload } = await jwtVerify(token, secretKey());
  const docId = payload.docId;
  const userId = payload.userId;
  const role = payload.role;
  if (
    typeof docId !== "string" ||
    typeof userId !== "string" ||
    (role !== "view" && role !== "edit")
  ) {
    throw new Error("Invalid collab token");
  }
  return {
    docId,
    userId,
    role,
    name: typeof payload.name === "string" ? payload.name : undefined,
  };
}