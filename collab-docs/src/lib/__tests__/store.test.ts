import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock localStorage
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key];
  }),
  clear: vi.fn(() => {
    for (const key of Object.keys(store)) delete store[key];
  }),
  get length() {
    return Object.keys(store).length;
  },
  key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
};
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

import {
  createDocument,
  getDocument,
  getAllDocuments,
  updateDocument,
  deleteDocument,
  getDocumentsForUser,
  canUserAccess,
  seedIfEmpty,
} from "../store";

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
});

describe("store", () => {
  it("creates and retrieves a document", () => {
    const doc = createDocument("user-alice", "Test Doc");
    expect(doc.title).toBe("Test Doc");
    expect(doc.ownerId).toBe("user-alice");

    const fetched = getDocument(doc.id);
    expect(fetched).toBeDefined();
    expect(fetched!.id).toBe(doc.id);
  });

  it("updates a document", () => {
    const doc = createDocument("user-alice", "Original");
    updateDocument(doc.id, { title: "Updated" });

    const fetched = getDocument(doc.id);
    expect(fetched!.title).toBe("Updated");
  });

  it("deletes a document", () => {
    const doc = createDocument("user-alice");
    expect(getAllDocuments().length).toBe(1);

    deleteDocument(doc.id);
    expect(getAllDocuments().length).toBe(0);
  });

  it("separates owned and shared documents", () => {
    const doc1 = createDocument("user-alice", "Alice's doc");
    updateDocument(doc1.id, {
      shares: [{ userId: "user-bob", permission: "view" }],
    });
    createDocument("user-bob", "Bob's doc");

    const aliceDocs = getDocumentsForUser("user-alice");
    expect(aliceDocs.owned.length).toBe(1);
    expect(aliceDocs.shared.length).toBe(0);

    const bobDocs = getDocumentsForUser("user-bob");
    expect(bobDocs.owned.length).toBe(1);
    expect(bobDocs.shared.length).toBe(1);
  });

  it("checks access permissions correctly", () => {
    const doc = createDocument("user-alice");
    updateDocument(doc.id, {
      shares: [
        { userId: "user-bob", permission: "edit" },
        { userId: "user-charlie", permission: "view" },
      ],
    });

    const updated = getDocument(doc.id)!;
    expect(canUserAccess(updated, "user-alice")).toBe("owner");
    expect(canUserAccess(updated, "user-bob")).toBe("edit");
    expect(canUserAccess(updated, "user-charlie")).toBe("view");
    expect(canUserAccess(updated, "user-nobody")).toBe(false);
  });

  it("seeds data only when empty", () => {
    seedIfEmpty();
    const count = getAllDocuments().length;
    expect(count).toBe(1);

    seedIfEmpty();
    expect(getAllDocuments().length).toBe(1);
  });
});
