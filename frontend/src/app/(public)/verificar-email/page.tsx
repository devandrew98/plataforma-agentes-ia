"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Loader2, ArrowRight } from "lucide-react";
import { verifyEmail } from "@/src/lib/services/auth";

type Status = "loading" | "success" | "error";

export default function VerificarEmailPage() {
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token") || "";
    if (!token) {
      setStatus("error");
      setMessage("Link inválido: token ausente.");
      return;
    }
    verifyEmail(token)
      .then(() => {
        setStatus("success");
        setMessage("Seu e-mail foi confirmado com sucesso!");
      })
      .catch((e: any) => {
        setStatus("error");
        setMessage(e?.message || "Não foi possível confirmar o e-mail.");
      });
  }, []);

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black px-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-indigo-900/25 blur-[140px]" />
        <div className="absolute top-1/2 -right-32 w-[400px] h-[400px] rounded-full bg-purple-900/20 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="flex justify-center mb-8">
          <a href="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/30">
              A
            </div>
            <span className="font-bold text-xl text-white tracking-tight">
              ARgent<span className="text-indigo-400 font-medium">.ai</span>
            </span>
          </a>
        </div>

        <div className="bg-zinc-950/80 border border-zinc-800/60 rounded-3xl p-8 shadow-2xl backdrop-blur-xl text-center">
          {status === "loading" && (
            <>
              <Loader2 className="mx-auto h-12 w-12 text-indigo-400 animate-spin" />
              <h1 className="mt-5 text-xl font-bold text-white">Confirmando seu e-mail…</h1>
              <p className="mt-1 text-sm text-zinc-500">Só um instante.</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
                <CheckCircle2 className="h-10 w-10 text-emerald-400" />
              </div>
              <h1 className="mt-5 text-xl font-bold text-white">E-mail confirmado! ✅</h1>
              <p className="mt-1 text-sm text-zinc-400">{message}</p>
              <p className="mt-1 text-sm text-zinc-500">
                Sua conta está liberada para criar agentes.
              </p>
              <a
                href="/dashboard"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:from-indigo-500 hover:to-purple-500"
              >
                Ir para o painel <ArrowRight className="h-4 w-4" />
              </a>
            </>
          )}

          {status === "error" && (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15">
                <XCircle className="h-10 w-10 text-red-400" />
              </div>
              <h1 className="mt-5 text-xl font-bold text-white">Não foi possível confirmar</h1>
              <p className="mt-1 text-sm text-zinc-400">{message}</p>
              <p className="mt-2 text-xs text-zinc-500">
                Faça login e clique em <span className="text-zinc-300">“Reenviar e-mail”</span> no aviso do
                painel para receber um novo link.
              </p>
              <a
                href="/login"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
              >
                Ir para o login
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
