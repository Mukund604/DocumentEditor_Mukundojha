"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentUserId,
  getDocumentsForUser,
  createDocument,
  deleteDocument,
  clearCurrentUser,
  seedIfEmpty,
  updateDocument,
} from "@/lib/store";
import { getUserById, USERS } from "@/lib/users";
import { Document } from "@/lib/types";
import {
  FileText,
  Plus,
  Upload,
  LogOut,
  Trash2,
  Users,
  Clock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function DashboardPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [owned, setOwned] = useState<Document[]>([]);
  const [shared, setShared] = useState<Document[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    seedIfEmpty();
    const uid = getCurrentUserId();
    if (!uid) {
      router.replace("/");
      return;
    }
    setUserId(uid);
    refreshDocs(uid);
  }, [router]);

  function refreshDocs(uid: string) {
    const { owned, shared } = getDocumentsForUser(uid);
    setOwned(owned.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    setShared(shared.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  }

  function handleNewDoc() {
    if (!userId) return;
    const doc = createDocument(userId);
    router.push(`/doc/${doc.id}`);
  }

  function handleDelete(docId: string) {
    deleteDocument(docId);
    if (userId) refreshDocs(userId);
  }

  function handleLogout() {
    clearCurrentUser();
    router.replace("/");
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    const name = file.name;
    const ext = name.split(".").pop()?.toLowerCase();

    if (ext !== "txt" && ext !== "md" && ext !== "docx") {
      alert("Only .txt, .md, and .docx files are supported.");
      return;
    }

    if (ext === "docx") {
      const arrayBuffer = await file.arrayBuffer();
      const mammoth = (await import("mammoth")).default;
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const title = name.replace(/\.docx$/, "");
      const doc = createDocument(userId, title);
      // Store HTML — TipTap can parse it directly
      updateDocument(doc.id, { content: result.value, contentFormat: "html" });
      router.push(`/doc/${doc.id}`);
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const title = name.replace(/\.(txt|md)$/, "");
      const doc = createDocument(userId, title);

      // Convert plain text to TipTap JSON
      const paragraphs = text.split("\n").map((line) => {
        if (!line.trim()) {
          return { type: "paragraph", content: [] };
        }
        const h1Match = line.match(/^# (.+)/);
        const h2Match = line.match(/^## (.+)/);
        const h3Match = line.match(/^### (.+)/);
        if (h1Match) {
          return {
            type: "heading",
            attrs: { level: 1 },
            content: [{ type: "text", text: h1Match[1] }],
          };
        }
        if (h2Match) {
          return {
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text: h2Match[1] }],
          };
        }
        if (h3Match) {
          return {
            type: "heading",
            attrs: { level: 3 },
            content: [{ type: "text", text: h3Match[1] }],
          };
        }
        return {
          type: "paragraph",
          content: [{ type: "text", text: line }],
        };
      });

      const content = JSON.stringify({ type: "doc", content: paragraphs });
      updateDocument(doc.id, { content });
      router.push(`/doc/${doc.id}`);
    };
    reader.readAsText(file);

    e.target.value = "";
  }

  const user = userId ? getUserById(userId) : null;
  if (!user) return null;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600" />
            <span className="font-bold text-lg">CollabDocs</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{user.name}</span>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 cursor-pointer"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Actions */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={handleNewDoc}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Document
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            Import File
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.docx"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>

        {/* My Documents */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-4">My Documents</h2>
          {owned.length === 0 ? (
            <p className="text-gray-400 text-sm">
              No documents yet. Create one to get started!
            </p>
          ) : (
            <div className="grid gap-3">
              {owned.map((doc) => (
                <DocCard
                  key={doc.id}
                  doc={doc}
                  badge="owner"
                  onOpen={() => router.push(`/doc/${doc.id}`)}
                  onDelete={() => handleDelete(doc.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Shared With Me */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-400" />
            Shared With Me
          </h2>
          {shared.length === 0 ? (
            <p className="text-gray-400 text-sm">
              No shared documents yet.
            </p>
          ) : (
            <div className="grid gap-3">
              {shared.map((doc) => {
                const perm = doc.shares.find(
                  (s) => s.userId === userId
                )?.permission;
                return (
                  <DocCard
                    key={doc.id}
                    doc={doc}
                    badge={perm || "view"}
                    onOpen={() => router.push(`/doc/${doc.id}`)}
                  />
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function DocCard({
  doc,
  badge,
  onOpen,
  onDelete,
}: {
  doc: Document;
  badge: string;
  onOpen: () => void;
  onDelete?: () => void;
}) {
  const owner = getUserById(doc.ownerId);
  const badgeColors: Record<string, string> = {
    owner: "bg-indigo-100 text-indigo-700",
    edit: "bg-green-100 text-green-700",
    view: "bg-gray-100 text-gray-600",
  };

  return (
    <div
      onClick={onOpen}
      className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer"
    >
      <div className="flex items-center gap-3 min-w-0">
        <FileText className="w-5 h-5 text-gray-400 shrink-0" />
        <div className="min-w-0">
          <div className="font-medium truncate">{doc.title}</div>
          <div className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
            {badge !== "owner" && owner && (
              <span>by {owner.name}</span>
            )}
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(new Date(doc.updatedAt), {
              addSuffix: true,
            })}
            {doc.shares.length > 0 && (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {doc.shares.length}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-4">
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            badgeColors[badge] || badgeColors.view
          }`}
        >
          {badge}
        </span>
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm("Delete this document?")) onDelete();
            }}
            className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
