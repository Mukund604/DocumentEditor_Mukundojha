import { User } from "./types";

export const USERS: User[] = [
  { id: "user-alice", email: "alice@example.com", name: "Alice Johnson" },
  { id: "user-bob", email: "bob@example.com", name: "Bob Smith" },
  { id: "user-charlie", email: "charlie@example.com", name: "Charlie Davis" },
];

export function getUserById(id: string): User | undefined {
  return USERS.find((u) => u.id === id);
}

export function getUserByEmail(email: string): User | undefined {
  return USERS.find((u) => u.email === email);
}
