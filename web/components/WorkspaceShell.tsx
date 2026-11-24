"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
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
  updatedAt?: string;
};

const WorkspaceContext = createContext<{
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

  useEffect(() => {
    setDocs(documents);
  }, [documents]);

  async function createDoc() {
    if (creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/documents", { method: "POST" });
      if (!res.ok) return;
      const doc = (await res.json()) as { id: string; title: string };
      setDocs((current) => [
        { id: doc.id, title: doc.title || "New page", icon: null, isFavorite: false },
        ...current.filter((item) => item.id !== doc.id),
      ]);
      setCommandOpen(false);
      router.push(`/doc/${doc.id}`);
    } finally {
      setCreating(false);
    }
  }

  function rememberDoc(doc: SidebarDoc) {
    setDocs((current) => [doc, ...current.filter((item) => item.id !== doc.id)]);
  }

  function forgetDoc(id: string) {
    setDocs((current) => current.filter((item) => item.id !== id));
  }

  function patchDoc(id: string, partial: Partial<SidebarDoc>) {
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
    <WorkspaceContext.Provider value={{ createDoc, rememberDoc, forgetDoc, patchDoc }}>
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
          onSearch={() => setCommandOpen(true)}
        />
        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white">
          {children}
        </div>
      </div>
    </WorkspaceContext.Provider>
  );
}