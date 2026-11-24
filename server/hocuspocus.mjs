import { Server } from "@hocuspocus/server";
import * as Y from "yjs";

import { verifyCollabToken } from "./auth.mjs";
import { documentExists, loadYjsState, saveYjsState } from "./db.mjs";

const port = Number(process.env.PORT ?? 1234);

export function createServer() {
  return new Server({
    port,
    debounce: 400,
    maxDebounce: 2000,
    unloadImmediately: true,

    async onAuthenticate({ token, documentName, connectionConfig }) {
      if (!token) {
        throw new Error("Unauthorized");
      }

      const claims = await verifyCollabToken(token);
      if (claims.docId !== documentName) {
        throw new Error("Document mismatch");
      }

      const exists = await documentExists(documentName);
      if (!exists) {
        throw new Error("Document not found");
      }

      if (connectionConfig && claims.role === "view") {
        connectionConfig.readOnly = true;
      }

      return {
        userId: claims.userId,
        role: claims.role,
        name: claims.name,
      };
    },

    async onLoadDocument({ document, documentName }) {
      const state = await loadYjsState(documentName);
      if (state?.length) {
        Y.applyUpdate(document, state);
      }
    },

    async onStoreDocument({ document, documentName, lastContext }) {
      if (lastContext?.role === "view") {
        return;
      }
      try {
        const state = Y.encodeStateAsUpdate(document);
        await saveYjsState(documentName, state);
      } catch (error) {
        console.error(
          "Failed to store document",
          documentName,
          error instanceof Error ? error.message : error,
        );
      }
    },
  });
}