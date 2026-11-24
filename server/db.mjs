import { neon } from "@neondatabase/serverless";

function sql() {
  if (!process.env.DATABASE_URL) {
    return null;
  }
  return neon(process.env.DATABASE_URL);
}

export async function loadYjsState(documentId) {
  const db = sql();
  if (!db) {
    return null;
  }
  const rows = await db`
    SELECT state FROM yjs_document_state WHERE document_id = ${documentId}::uuid
  `;
  if (!rows[0]?.state) {
    return null;
  }
  const encoded = rows[0].state;
  if (!encoded) {
    return null;
  }
  return Buffer.from(encoded, "base64");
}

export async function saveYjsState(documentId, update) {
  const db = sql();
  if (!db) {
    return;
  }
  const state = Buffer.from(update).toString("base64");
  await db`
  INSERT INTO yjs_document_state (document_id, state, updated_at)
  VALUES (${documentId}::uuid, ${state}, NOW())
  ON CONFLICT (document_id) DO UPDATE SET
    state = EXCLUDED.state,
    updated_at = NOW()
`;
}

export async function documentExists(documentId) {
  const db = sql();
  if (!db) {
    return true;
  }
  const rows = await db`
    SELECT id FROM documents WHERE id = ${documentId}::uuid LIMIT 1
  `;
  return rows.length > 0;
}