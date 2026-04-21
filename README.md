# CollabDocs

A lightweight collaborative document editor built with Next.js and TipTap.

### Test Accounts

The app uses simulated authentication with three seeded users:

| Name | Email |
|------|-------|
| Alice Johnson | alice@example.com |
| Bob Smith | bob@example.com |
| Charlie Davis | charlie@example.com |

Click any user on the login screen to sign in. To test sharing, sign in as Alice, share a document with Bob, then sign out and sign in as Bob — the document appears under "Shared With Me".

## Local Setup

### Prerequisites

- Node.js 18+
- npm

### Install & Run

```bash
cd collab-docs
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Run Tests

```bash
npm test
```

## Features

- **Document creation & editing** — Create, rename, edit, save, and reopen documents
- **Rich text** — Bold, italic, underline, H1/H2, bullet lists, numbered lists
- **Auto-save** — Documents auto-save 2 seconds after changes
- **File import** — Upload `.txt`, `.md`, or `.docx` files as new editable documents
- **Export** — Download any document as Markdown
- **Sharing** — Document owners can share with other users (view or edit permissions)
- **Persistence** — All data stored in localStorage; survives browser refresh
- **Keyboard shortcuts** — Ctrl/Cmd+S to save, Ctrl+B/I/U for formatting
- **Toast notifications** — Visual feedback on save and export actions

## Tech Stack

- **Next.js 16** (App Router, TypeScript)
- **TipTap** (ProseMirror-based rich text editor)
- **Tailwind CSS 4**
- **mammoth.js** for .docx parsing
- **localStorage** for persistence
- **Vitest** for testing (6 tests)
- **Lucide React** for icons

## Supported File Types

| Type | Import Behavior |
|------|----------------|
| `.txt` | Lines become paragraphs |
| `.md` | Headings (`#`, `##`, `###`) parsed; rest becomes paragraphs |
| `.docx` | Converted to HTML via mammoth.js, then loaded into editor |
