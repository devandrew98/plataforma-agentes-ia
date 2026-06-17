"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { completeOAuthLogin } from "@/src/lib/services/auth";

export default function OAuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const errParam = params.get("error");

    if (errParam || !token) {
      router.replace(`/login?error=${encodeURIComponent(errParam || "oauth_falhou")}`);
      return;
    }

    completeOAuthLogin(token)
      .then(() => {
        window.location.assign("/dashboard");
      })
      .catch((e: any) => {
        setError(e?.message || "Erro ao concluir o login.");
        setTimeout(() => router.replace("/login?error=oauth_falhou"), 1800);
      });
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-black text-zinc-200">
      {!error ? (
        <>
          <div className="w-10 h-10 border-4 rounded-full border-indigo-500/30 border-t-indigo-500 animate-spin" />
          <p className="text-zinc-400 animate-pulse">Concluindo seu login...</p>
        </>
      ) : (
        <p className="text-red-400">{error}</p>
      )}
    </div>
  );
}
