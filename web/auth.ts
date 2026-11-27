import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

import { db, isDatabaseConfigured } from "@/db";
import { getGitHubProviderConfig } from "@/lib/github-auth";
import { getGoogleProviderConfig } from "@/lib/google-auth";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "@/db/schema";

function resolveAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (secret) {
    return secret;
  }
  if (process.env.NODE_ENV === "development") {
    console.warn(
      "[auth] AUTH_SECRET is missing. Add it to web/.env.local (see .env.example). Using a dev-only fallback.",
    );
    return "syncpad-dev-auth-secret-local-only";
  }
  // Next evaluates route modules while collecting page data. The real secret
  // is read again when the server handles a request.
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return "syncpad-build-placeholder";
  }
  throw new Error("AUTH_SECRET is required in production");
}

const githubConfig = getGitHubProviderConfig();
const googleConfig = getGoogleProviderConfig();
const useDatabase = isDatabaseConfigured() && db != null;

if (!useDatabase) {
  console.warn(
    "[auth] DATABASE_URL is not set — using JWT sessions (GitHub login works, but documents require Neon).",
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: resolveAuthSecret(),
  session: { strategy: "jwt" },
  ...(useDatabase
    ? {
        adapter: DrizzleAdapter(db!, {
          usersTable: users,
          accountsTable: accounts,
          sessionsTable: sessions,
          verificationTokensTable: verificationTokens,
        }),
      }
    : {}),
  providers: [
    ...(githubConfig
      ? [
          GitHub({
            clientId: githubConfig.clientId,
            clientSecret: githubConfig.clientSecret,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    ...(googleConfig
      ? [
          Google({
            clientId: googleConfig.clientId,
            clientSecret: googleConfig.clientSecret,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],
  pages: {
    signIn: "/login",
  },
  trustHost: true,
  callbacks: {
    jwt({ token, user, account, profile }) {
      if (account?.provider) {
        token.provider = account.provider;
      }
      if (user?.id) {
        token.sub = user.id;
      } else if (
        !useDatabase &&
        profile &&
        typeof profile === "object" &&
        "id" in profile &&
        profile.id != null
      ) {
        token.sub = String(profile.id);
      }
      return token;
    },
    session({ session, user, token }) {
      if (session.user) {
        session.user.id = user?.id ?? token?.sub ?? "";
        if (token.provider === "google" || token.provider === "github") {
          session.user.provider = token.provider;
        }
      }
      return session;
    },
    authorized({ auth, request }) {
      if (!request.nextUrl.pathname.startsWith("/dashboard")) {
        return true;
      }
      if (auth?.user) return true;
      const jar = request.cookies;
      return (
        jar.has("authjs.session-token") ||
        jar.has("__Secure-authjs.session-token")
      );
    },
  },
});