"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentUserId,
  getDocument,
  updateDocument,
  canUserAccess,
  seedIfEmpty,
} from "@/lib/store";
import { getUserById, USERS } from "@/lib/users";
import { Document, Share } from "@/lib/types";
import { tiptapJsonToMarkdown, downloadFile } from "@/lib/export";
import {
  ArrowLeft,
  Save,
  Share2,
  Check,
  X,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Type,
  Download,
} from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import UnderlineExt from "@tiptap/extension-underline";

// --- Toast component ---

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-fade-in z-50">
      {message}
    </div>
  );
}

export default function DocPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [doc, setDoc] = useState<Document | null>(null);
  const [access, setAccess] = useState<false | "owner" | "edit" | "view">(
    false
  );
  const [title, setTitle] = useState("");
  const [toast, setToast] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasUnsavedChanges = useRef(false);

  const canEdit = access === "owner" || access === "edit";

  const editor = useEditor({
    extensions: [StarterKit, UnderlineExt],
    editable: canEdit,
    immediatelyRender: false,
    content: "",
    onUpdate: () => {
      hasUnsavedChanges.current = true;
    },
  });

  useEffect(() => {
    seedIfEmpty();
    const uid = getCurrentUserId();
    if (!uid) {
      router.replace("/");
      return;
    }
    setUserId(uid);

    const d = getDocument(id);
    if (!d) {
      router.replace("/dashboard");
      return;
    }

    const userAccess = canUserAccess(d, uid);
    if (!userAccess) {
      router.replace("/dashboard");
      return;
    }

    setDoc(d);
    setAccess(userAccess);
    setTitle(d.title);
  }, [id, router]);

  // Set editor content once both editor and doc are ready
  useEffect(() => {
    if (editor && doc) {
      if (doc.content) {
        if (doc.contentFormat === "html") {
          // HTML content from .docx import — let TipTap parse it
          editor.commands.setContent(doc.content);
        } else {
          try {
            editor.commands.setContent(JSON.parse(doc.content));
          } catch {
            editor.commands.setContent(doc.content);
          }
        }
      }
      editor.setEditable(canEdit);
    }
  }, [editor, doc, canEdit]);

  const doSave = useCallback(() => {
    if (!editor || !doc) return;
    const content = JSON.stringify(editor.getJSON());
    // Once saved from editor, always store as JSON format
    updateDocument(doc.id, { title, content, contentFormat: "json" });
    setDoc({ ...doc, title, content, contentFormat: "json", updatedAt: new Date().toISOString() });
    hasUnsavedChanges.current = false;
    setToast("Document saved");
  }, [editor, doc, title]);

  // Auto-save: debounce 2s after changes
  useEffect(() => {
    if (!canEdit) return;

    const interval = setInterval(() => {
      if (hasUnsavedChanges.current) {
        doSave();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [canEdit, doSave]);

  // Ctrl+S manual save
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        doSave();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [doSave]);

  // Save on title change (debounced)
  useEffect(() => {
    if (!doc || !canEdit) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      if (title !== doc.title) {
        hasUnsavedChanges.current = true;
      }
    }, 500);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [title, doc, canEdit]);

  function handleExportMarkdown() {
    if (!editor || !doc) return;
    const json = JSON.stringify(editor.getJSON());
    const md = tiptapJsonToMarkdown(json);
    downloadFile(md, `${title || "document"}.md`);
    setToast("Exported as Markdown");
  }

  if (!doc || !userId) return null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={() => {
                if (hasUnsavedChanges.current) doSave();
                router.push("/dashboard");
              }}
              className="p-2 rounded-lg hover:bg-gray-100 cursor-pointer shrink-0"
              title="Back to dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!canEdit}
              className="text-lg font-semibold bg-transparent border-none outline-none w-full min-w-0 disabled:opacity-70"
              placeholder="Untitled Document"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!canEdit && (
              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded-full">
                View only
              </span>
            )}
            {canEdit && (
              <button
                onClick={doSave}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm cursor-pointer"
                title="Save (Ctrl+S)"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            )}
            <button
              onClick={handleExportMarkdown}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm cursor-pointer"
              title="Export as Markdown"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            {access === "owner" && (
              <button
                onClick={() => setShareOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Toolbar */}
      {canEdit && editor && <Toolbar editor={editor} />}

      {/* Editor */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-4">
        <div className="bg-white rounded-lg border border-gray-200 min-h-[500px] shadow-sm">
          <EditorContent editor={editor} />
        </div>
      </main>

      {/* Share modal */}
      {shareOpen && (
        <ShareModal
          doc={doc}
          currentUserId={userId}
          onClose={() => setShareOpen(false)}
          onUpdate={(shares) => {
            updateDocument(doc.id, { shares });
            setDoc({ ...doc, shares });
          }}
        />
      )}

      {/* Toast notification */}
      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </div>
  );
}

// --- Toolbar ---

function Toolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;

  const btn = (active: boolean) =>
    `p-2 rounded cursor-pointer transition-colors ${
      active
        ? "bg-indigo-100 text-indigo-700"
        : "text-gray-600 hover:bg-gray-100"
    }`;

  return (
    <div className="bg-white border-b border-gray-200 sticky top-[53px] z-10">
      <div className="max-w-5xl mx-auto px-4 py-1.5 flex items-center gap-1 flex-wrap">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={btn(editor.isActive("bold"))}
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={btn(editor.isActive("italic"))}
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={btn(editor.isActive("underline"))}
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-200 mx-1" />

        <button
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          className={btn(editor.isActive("heading", { level: 1 }))}
          title="Heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </button>
        <button
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className={btn(editor.isActive("heading", { level: 2 }))}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().setParagraph().run()}
          className={btn(
            editor.isActive("paragraph") && !editor.isActive("heading")
          )}
          title="Normal text"
        >
          <Type className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-200 mx-1" />

        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={btn(editor.isActive("bulletList"))}
          title="Bullet list"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={btn(editor.isActive("orderedList"))}
          title="Numbered list"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// --- Share Modal ---

function ShareModal({
  doc,
  currentUserId,
  onClose,
  onUpdate,
}: {
  doc: Document;
  currentUserId: string;
  onClose: () => void;
  onUpdate: (shares: Share[]) => void;
}) {
  const [shares, setShares] = useState<Share[]>([...doc.shares]);
  const [addEmail, setAddEmail] = useState("");
  const [addPerm, setAddPerm] = useState<"view" | "edit">("view");
  const [error, setError] = useState("");

  const otherUsers = USERS.filter(
    (u) => u.id !== currentUserId && !shares.some((s) => s.userId === u.id)
  );

  function handleAdd() {
    setError("");
    if (!addEmail.trim()) return;
    const user = USERS.find(
      (u) => u.email.toLowerCase() === addEmail.trim().toLowerCase()
    );
    if (!user) {
      setError(
        "User not found. Available: " +
          otherUsers.map((u) => u.email).join(", ")
      );
      return;
    }
    if (user.id === currentUserId) {
      setError("You already own this document.");
      return;
    }
    if (shares.some((s) => s.userId === user.id)) {
      setError("Already shared with this user.");
      return;
    }
    const newShares = [...shares, { userId: user.id, permission: addPerm }];
    setShares(newShares);
    onUpdate(newShares);
    setAddEmail("");
  }

  function handleRemove(userId: string) {
    const newShares = shares.filter((s) => s.userId !== userId);
    setShares(newShares);
    onUpdate(newShares);
  }

  function handlePermChange(userId: string, perm: "view" | "edit") {
    const newShares = shares.map((s) =>
      s.userId === userId ? { ...s, permission: perm } : s
    );
    setShares(newShares);
    onUpdate(newShares);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Share document</h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Add user */}
        <div className="flex gap-2 mb-2">
          <input
            value={addEmail}
            onChange={(e) => setAddEmail(e.target.value)}
            placeholder="Enter email address"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-400"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <select
            value={addPerm}
            onChange={(e) => setAddPerm(e.target.value as "view" | "edit")}
            className="px-2 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="view">View</option>
            <option value="edit">Edit</option>
          </select>
          <button
            onClick={handleAdd}
            className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 cursor-pointer"
          >
            Add
          </button>
        </div>
        {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
        {otherUsers.length > 0 && (
          <p className="text-xs text-gray-400 mb-4">
            Available users: {otherUsers.map((u) => u.email).join(", ")}
          </p>
        )}

        {/* Current shares */}
        <div className="space-y-2 mt-4">
          {/* Owner */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-semibold">
                {getUserById(doc.ownerId)?.name[0]}
              </div>
              <div>
                <div className="text-sm font-medium">
                  {getUserById(doc.ownerId)?.name}
                </div>
                <div className="text-xs text-gray-400">
                  {getUserById(doc.ownerId)?.email}
                </div>
              </div>
            </div>
            <span className="text-xs text-gray-400">Owner</span>
          </div>

          {shares.map((share) => {
            const user = getUserById(share.userId);
            if (!user) return null;
            return (
              <div
                key={share.userId}
                className="flex items-center justify-between py-2"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center text-sm font-semibold">
                    {user.name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{user.name}</div>
                    <div className="text-xs text-gray-400">{user.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={share.permission}
                    onChange={(e) =>
                      handlePermChange(
                        share.userId,
                        e.target.value as "view" | "edit"
                      )
                    }
                    className="text-xs px-2 py-1 border border-gray-200 rounded"
                  >
                    <option value="view">View</option>
                    <option value="edit">Edit</option>
                  </select>
                  <button
                    onClick={() => handleRemove(share.userId)}
                    className="p-1 text-gray-400 hover:text-red-500 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
