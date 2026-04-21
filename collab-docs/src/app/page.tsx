"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { USERS } from "@/lib/users";
import { getCurrentUserId, setCurrentUserId, seedIfEmpty } from "@/lib/store";
import { FileText } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    seedIfEmpty();
    setMounted(true);
    const uid = getCurrentUserId();
    if (uid) {
      router.replace("/dashboard");
    }
  }, [router]);

  function handleLogin(userId: string) {
    setCurrentUserId(userId);
    router.push("/dashboard");
  }

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <div className="flex items-center gap-3 mb-6 justify-center">
          <FileText className="w-8 h-8 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">CollabDocs</h1>
        </div>
        <p className="text-gray-500 text-center mb-6">
          Choose a user to sign in
        </p>
        <div className="space-y-3">
          {USERS.map((user) => (
            <button
              key={user.id}
              onClick={() => handleLogin(user.id)}
              className="w-full flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition-colors cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold text-lg">
                {user.name[0]}
              </div>
              <div className="text-left">
                <div className="font-medium">{user.name}</div>
                <div className="text-sm text-gray-400">{user.email}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
