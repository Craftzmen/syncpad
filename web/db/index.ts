import { neon, neonConfig } from "@neondatabase/serverless";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

neonConfig.fetchFunction = async (input: RequestInfo | URL, init?: RequestInit) => {
  const request = { ...init, cache: "no-store" as const };
  try {
    return await fetch(input, request);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/ECONNRESET|socket|closed unexpectedly|fetch failed/i.test(message)) {
      throw error;
    }
    return fetch(input, request);
  }
};

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

const connectionString = process.env.DATABASE_URL?.trim();

export const db: NeonHttpDatabase<typeof schema> | undefined = connectionString
  ? drizzle(neon(connectionString), { schema })
  : undefined;

export function requireDb() {
  if (!db) {
    throw new Error("DATABASE_URL is not configured");
  }
  return db;
}