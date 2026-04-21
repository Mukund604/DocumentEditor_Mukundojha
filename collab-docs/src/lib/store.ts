import { Document } from "./types";

const STORAGE_KEY = "collabdocs_documents";
const USER_KEY = "collabdocs_current_user";

function isBrowser() {
  return typeof window !== "undefined";
}

// --- Document CRUD ---

export function getAllDocuments(): Document[] {
  if (!isBrowser()) return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveAllDocuments(docs: Document[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
}

export function getDocumentsForUser(userId: string): {
  owned: Document[];
  shared: Document[];
} {
  const all = getAllDocuments();
  const owned = all.filter((d) => d.ownerId === userId);
  const shared = all.filter(
    (d) => d.ownerId !== userId && d.shares.some((s) => s.userId === userId)
  );
  return { owned, shared };
}

export function getDocument(id: string): Document | undefined {
  return getAllDocuments().find((d) => d.id === id);
}

export function createDocument(ownerId: string, title?: string): Document {
  const doc: Document = {
    id: "doc-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
    title: title || "Untitled Document",
    content: "",
    ownerId,
    shares: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const docs = getAllDocuments();
  docs.push(doc);
  saveAllDocuments(docs);
  return doc;
}

export function updateDocument(
  id: string,
  updates: Partial<Pick<Document, "title" | "content" | "contentFormat" | "shares">>
): Document | null {
  const docs = getAllDocuments();
  const idx = docs.findIndex((d) => d.id === id);
  if (idx === -1) return null;
  docs[idx] = { ...docs[idx], ...updates, updatedAt: new Date().toISOString() };
  saveAllDocuments(docs);
  return docs[idx];
}

export function deleteDocument(id: string): boolean {
  const docs = getAllDocuments();
  const filtered = docs.filter((d) => d.id !== id);
  if (filtered.length === docs.length) return false;
  saveAllDocuments(filtered);
  return true;
}

export function canUserAccess(
  doc: Document,
  userId: string
): false | "owner" | "edit" | "view" {
  if (doc.ownerId === userId) return "owner";
  const share = doc.shares.find((s) => s.userId === userId);
  if (share) return share.permission;
  return false;
}

// --- Current user session ---

export function getCurrentUserId(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(USER_KEY);
}

export function setCurrentUserId(userId: string) {
  localStorage.setItem(USER_KEY, userId);
}

export function clearCurrentUser() {
  localStorage.removeItem(USER_KEY);
}

// --- Seed data ---

export function seedIfEmpty() {
  if (!isBrowser()) return;
  const docs = getAllDocuments();
  if (docs.length > 0) return;

  const welcomeDoc: Document = {
    id: "doc-welcome",
    title: "Welcome to CollabDocs",
    content: JSON.stringify({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Welcome to CollabDocs" }],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "This is a collaborative document editor. Try editing this document or create a new one!",
            },
          ],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Features" }],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    { type: "text", marks: [{ type: "bold" }], text: "Rich text editing" },
                    { type: "text", text: " \u2014 bold, italic, underline, headings, lists" },
                  ],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    { type: "text", marks: [{ type: "bold" }], text: "File import" },
                    { type: "text", text: " \u2014 upload .txt, .md, and .docx files as new documents" },
                  ],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    { type: "text", marks: [{ type: "bold" }], text: "Sharing" },
                    { type: "text", text: " \u2014 share documents with view or edit permissions" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }),
    ownerId: "user-alice",
    shares: [{ userId: "user-bob", permission: "view" }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  saveAllDocuments([welcomeDoc]);
}
