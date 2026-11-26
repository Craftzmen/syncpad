ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "is_pinned" boolean DEFAULT false NOT NULL;
UPDATE "documents" SET "is_pinned" = true WHERE "is_favorite" = true AND "is_pinned" = false;
