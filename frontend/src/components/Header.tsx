"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearToken } from "@/lib/api";

export function Header() {
  const router = useRouter();
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <Link href="/dashboard" className="text-lg font-semibold text-brand">
          QuizLive AI
        </Link>
        <button
          className="btn-ghost"
          onClick={() => {
            clearToken();
            router.push("/login");
          }}
        >
          Salir
        </button>
      </div>
    </header>
  );
}
