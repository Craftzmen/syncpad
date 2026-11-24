# SyncPad: Project Context

Collaborative real-time document editor with a Notion-like UI. Use this file as the source of truth when generating code.

## Goal
- Multiple users edit the same document simultaneously with live sync, cursors and presence.
- Clean, minimal, premium UI (Notion-like): centered narrow column, whitespace, floating selection toolbar, slash commands.
- Owner is a frontend engineer learning full-stack, so keep code simple, typed and readable.

## Stack
- Frontend: Next.js (App Router) + TypeScript + Tailwind + shadcn/ui (Neutral base)
- Editor: Tiptap v3 (ProseMirror) with StarterKit
- Sync: Yjs (CRDT) + `@hocuspocus/provider` (client) + `@hocuspocus/server` (Node WebSocket server)
- Persistence: PostgreSQL (store Yjs binary state)
- Auth: Auth.js (NextAuth)
- Deploy: Frontend on Vercel, Hocuspocus on Railway/Fly/VPS (needs persistent WebSockets), Postgres on Neon/Supabase

## Folder structure
```
syncpad/
├── web/       Next.js app (own package.json)
└── server/    Hocuspocus server (own package.json, index.mjs)
```
`server` is a sibling of `web`, not inside it.

## Rules
- Use Yjs CRDT. Never hand-roll Operational Transform.
- Disable StarterKit's undo/redo when using Collaboration (`undoRedo: false` in Tiptap v3, `history: false` in v2). Collaboration provides its own.
- Editor component must be a client component (`"use client"`) with `immediatelyRender: false`.
- Create the Y.Doc with `useMemo` keyed on `docId`. Create the Hocuspocus provider in `useEffect` and destroy on cleanup (avoids React Strict Mode reusing a destroyed provider from `useMemo`).
- Tiptap v3 imports: `BubbleMenu` from `@tiptap/react/menus`; cursors via `CollaborationCaret` (v2 used `CollaborationCursor`).
- Use shadcn components for all UI. Style the document with `@tailwindcss/typography` (`prose prose-neutral dark:prose-invert`).
- No visible border around the editor.

## Setup commands
```bash
mkdir syncpad && cd syncpad
npx create-next-app@latest web --ts
mkdir server

cd web
npm i @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-collaboration yjs @hocuspocus/provider
npx shadcn@latest init
npx shadcn@latest add button toggle separator tooltip dropdown-menu avatar popover command input skeleton
npm i @tailwindcss/typography @floating-ui/dom

cd ../server
npm init -y && npm i @hocuspocus/server
```
In `web/app/globals.css` add: `@plugin "@tailwindcss/typography";`

## Core code

`server/index.mjs`
```js
import { Server } from "@hocuspocus/server";

const server = new Server({ port: 1234 });
await server.listen();
```

`web/components/Editor.tsx`
```tsx
"use client";
import { useEffect, useMemo } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { Toggle } from "@/components/ui/toggle";
import { Bold, Italic, Strikethrough } from "lucide-react";

export default function Editor({ docId }: { docId: string }) {
  const { ydoc, provider } = useMemo(() => {
    const ydoc = new Y.Doc();
    const provider = new HocuspocusProvider({
      url: "ws://localhost:1234",
      name: docId,
      document: ydoc,
    });
    return { ydoc, provider };
  }, [docId]);

  useEffect(() => () => provider.destroy(), [provider]);

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({ undoRedo: false }),
        Collaboration.configure({ document: ydoc }),
      ],
      editorProps: {
        attributes: {
          class:
            "prose prose-neutral dark:prose-invert max-w-none focus:outline-none min-h-[60vh]",
        },
      },
    },
    [ydoc]
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-16">
      {editor && (
        <BubbleMenu
          editor={editor}
          className="flex items-center gap-0.5 rounded-lg border bg-popover p-1 shadow-md"
        >
          <Toggle size="sm" pressed={editor.isActive("bold")}
            onPressedChange={() => editor.chain().focus().toggleBold().run()}>
            <Bold className="size-4" />
          </Toggle>
          <Toggle size="sm" pressed={editor.isActive("italic")}
            onPressedChange={() => editor.chain().focus().toggleItalic().run()}>
            <Italic className="size-4" />
          </Toggle>
          <Toggle size="sm" pressed={editor.isActive("strike")}
            onPressedChange={() => editor.chain().focus().toggleStrike().run()}>
            <Strikethrough className="size-4" />
          </Toggle>
        </BubbleMenu>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
```

`web/app/page.tsx`
```tsx
import Editor from "@/components/Editor";
export default function Home() {
  return <Editor docId="test-doc" />;
}
```

## Build order
1. Single-user editor with Tiptap + shadcn UI (done above).
2. Real-time sync via Hocuspocus. Milestone: two browser tabs stay in sync.
3. Persistence: save/load Yjs binary state in Postgres using Hocuspocus `onStoreDocument` / `onLoadDocument`.
4. Documents and auth: document list, create/delete, Auth.js accounts, share links with view/edit permissions (enforce in Hocuspocus `onAuthenticate`).
5. Presence: `CollaborationCaret` live cursors, user colors, online avatars.
6. UI upgrades: slash command menu (Tiptap suggestion + shadcn `Command`), large borderless title input, sidebar document list (shadcn `Sidebar`).
7. Polish: version history (snapshots), comments, offline support (`y-indexeddb`), export.
8. Deploy: Vercel + Railway/Fly + Neon/Supabase. Use `wss://` in production and an env var for the server URL.

## Current status
- Steps 1–8 implemented: editor, sync, Neon persistence, GitHub auth, sharing, presence, slash menu, snapshots/comments/export/offline scaffold, deploy Dockerfile.
- Configure `web/.env` and `server/.env` from `.env.example`, run `npm run db:push` in `web/`, then `npm run dev:server` + `npm run dev:web`.

## Run locally
```bash
cd server && node index.mjs     # terminal 1
cd web && npm run dev           # terminal 2
```
