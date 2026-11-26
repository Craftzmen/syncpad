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
import {
  mergeServerDocs,
  rememberAdded,
  rememberPatch,
  rememberRemoved,
} from "@/lib/workspace-memory";

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
  const [docs, setDocs] = useState(() => mergeServerDocs(documents));
  const [commandOpen, setCommandOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const creatingRef = useRef(false);

  useEffect(() => {
    setDocs(mergeServerDocs(documents));
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
    rememberAdded(optimistic);
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
        rememberRemoved(id);
        setDocs((current) => current.filter((item) => item.id !== id));
        router.push("/dashboard");
      }
    } finally {
      creatingRef.current = false;
      setCreating(false);
    }
  }

  function rememberDoc(doc: SidebarDoc) {
    rememberAdded(doc);
    setDocs((current) => [doc, ...current.filter((item) => item.id !== doc.id)]);
  }

  function forgetDoc(id: string) {
    rememberRemoved(id);
    setDocs((current) => current.filter((item) => item.id !== id));
  }

  function patchDoc(id: string, partial: Partial<SidebarDoc>) {
    rememberPatch(id, partial);
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