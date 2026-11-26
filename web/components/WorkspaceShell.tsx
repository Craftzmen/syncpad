"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { AppSidebar } from "@/components/AppSidebar";
import { CommandPalette } from "@/components/CommandPalette";

export type SidebarDoc = {
  id: string;
  title: string;
  icon?: string | null;
  isFavorite?: boolean;
  isPinned?: boolean;
  updatedAt?: string;
};

const WorkspaceContext = createContext<{
  docs: SidebarDoc[];
  createDoc: () => Promise<void>;
  rememberDoc: (doc: SidebarDoc) => void;
  forgetDoc: (id: string) => void;
  patchDoc: (id: string, partial: Partial<SidebarDoc>) => void;
} | null>(null);

export function useWorkspace() {
  return useContext(WorkspaceContext);
}

export function useCreateDoc() {
  const value = useContext(WorkspaceContext);
  if (!value) {
    throw new Error("useCreateDoc must be used inside WorkspaceShell");
  }
  return value.createDoc;
}

export function WorkspaceShell({
  documents,
  userName,
  userImage,
  children,
}: {
  documents: SidebarDoc[];
  userName?: string | null;
  userImage?: string | null;
  children: ReactNode;
}) {
  const router = useRouter();
  const [docs, setDocs] = useState(documents);
  const [commandOpen, setCommandOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const creatingRef = useRef(false);
  const overrides = useRef({
    added: new Map<string, SidebarDoc>(),
    removed: new Set<string>(),
  });
  const patches = useRef(new Map<string, Partial<SidebarDoc>>());

  function applyPatches(list: SidebarDoc[]) {
    return list.map((doc) => {
      const patch = patches.current.get(doc.id);
      if (!patch) return doc;
      const keys = Object.keys(patch) as (keyof SidebarDoc)[];
      const caughtUp = keys.every((key) => doc[key] === patch[key]);
      if (caughtUp) {
        patches.current.delete(doc.id);
        return doc;
      }
      return { ...doc, ...patch };
    });
  }

  function mergeDocs(serverDocs: SidebarDoc[]) {
    const serverIds = new Set(serverDocs.map((doc) => doc.id));
    for (const id of overrides.current.removed) {
      if (!serverIds.has(id)) overrides.current.removed.delete(id);
    }
    for (const id of [...overrides.current.added.keys()]) {
      if (serverIds.has(id)) overrides.current.added.delete(id);
    }
    const extras = [...overrides.current.added.values()].filter(
      (doc) => !overrides.current.removed.has(doc.id),
    );
    return applyPatches([
      ...extras,
      ...serverDocs.filter(
        (doc) => !overrides.current.removed.has(doc.id) && !overrides.current.added.has(doc.id),
      ),
    ]);
  }

  useEffect(() => {
    setDocs(mergeDocs(documents));
  }, [documents]);

  async function createDoc() {
    if (creatingRef.current) return;
    creatingRef.current = true;
    setCreating(true);
    const id = crypto.randomUUID();
    const optimistic: SidebarDoc = {
      id,
      title: "New page",
      icon: null,
      isFavorite: false,
      isPinned: false,
    };
    overrides.current.removed.delete(id);
    overrides.current.added.set(id, optimistic);
    setDocs((current) => [optimistic, ...current.filter((item) => item.id !== id)]);
    setCommandOpen(false);
    router.push(`/doc/${id}`);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        overrides.current.added.delete(id);
        overrides.current.removed.add(id);
        setDocs((current) => current.filter((item) => item.id !== id));
        router.push("/dashboard");
      }
    } finally {
      creatingRef.current = false;
      setCreating(false);
    }
  }

  function rememberDoc(doc: SidebarDoc) {
    overrides.current.removed.delete(doc.id);
    overrides.current.added.set(doc.id, doc);
    setDocs((current) => [doc, ...current.filter((item) => item.id !== doc.id)]);
  }

  function forgetDoc(id: string) {
    overrides.current.added.delete(id);
    overrides.current.removed.add(id);
    setDocs((current) => current.filter((item) => item.id !== id));
  }

  function patchDoc(id: string, partial: Partial<SidebarDoc>) {
    const added = overrides.current.added.get(id);
    if (added) overrides.current.added.set(id, { ...added, ...partial });
    patches.current.set(id, { ...patches.current.get(id), ...partial });
    setDocs((current) =>
      current.map((item) => (item.id === id ? { ...item, ...partial } : item)),
    );
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <WorkspaceContext.Provider value={{ docs, createDoc, rememberDoc, forgetDoc, patchDoc }}>
      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        documents={docs}
      />
      <div className="fixed inset-0 flex overflow-hidden overscroll-none">
        <AppSidebar
          documents={docs}
          userName={userName}
          userImage={userImage}
          creating={creating}
          onSearch={() => setCommandOpen(true)}
        />
        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white">
          {children}
        </div>
      </div>
    </WorkspaceContext.Provider>
  );
}