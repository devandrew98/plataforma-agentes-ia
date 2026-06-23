"use client";

import { useState } from "react";
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { forgotPassword } from "@/src/lib/services/auth";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || !email.includes("@")) return;
    setLoading(true);
    setError(null);
    try {
      const msg = await forgotPassword(email);
      setMessage(msg);
      setSent(true);
    } catch (err: any) {
      setError(err?.message || "Não foi possível enviar o e-mail.");
    } finally {
      setLoading(false);
    }
  }

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

        <div className="bg-zinc-950/80 border border-zinc-800/60 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
          {sent ? (
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
                <CheckCircle2 className="h-10 w-10 text-emerald-400" />
              </div>
              <h1 className="mt-5 text-xl font-bold text-white">Verifique seu e-mail</h1>
              <p className="mt-2 text-sm text-zinc-400">{message}</p>
              <a
                href="/login"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
              >
                Voltar ao login
              </a>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-white">Esqueceu a senha?</h1>
                <p className="text-sm text-zinc-500 mt-1">
                  Informe seu e-mail e enviaremos um link para criar uma nova senha.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      autoComplete="email"
                      className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/60 transition-all"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                    <span className="mt-0.5">⚠</span>
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email.includes("@")}
                  className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20 transition-all"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Enviar link de redefinição
                </button>
              </form>

              <a
                href="/login"
                className="mt-6 flex items-center justify-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Voltar ao login
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
