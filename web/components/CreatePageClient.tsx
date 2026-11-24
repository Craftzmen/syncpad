"use client";

import { Plus } from "lucide-react";

import { useCreateDoc } from "@/components/WorkspaceShell";
import { Button } from "@/components/ui/button";

export function CreatePageClient() {
  const createDoc = useCreateDoc();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-1.5"
      onClick={() => void createDoc()}
    >
      <Plus className="size-4" />
      New page
    </Button>
  );
}