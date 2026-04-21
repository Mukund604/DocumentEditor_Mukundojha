export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Share {
  userId: string;
  permission: "view" | "edit";
}

export interface Document {
  id: string;
  title: string;
  content: string; // TipTap JSON stringified, or HTML for docx imports
  contentFormat?: "json" | "html"; // defaults to json
  ownerId: string;
  shares: Share[];
  createdAt: string;
  updatedAt: string;
}
