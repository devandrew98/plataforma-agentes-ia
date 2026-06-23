"use client";

import { useEffect, useState } from "react";
import { MailWarning, CheckCircle2, Loader2 } from "lucide-react";
import { getMe } from "@/src/lib/services/profile";
import { resendVerification, refreshSession } from "@/src/lib/services/auth";

/**
 * Faixa global de aviso: aparece quando a conta ainda não confirmou o e-mail.
 * Some quando o e-mail é confirmado (ou para admin). Tem botão para reenviar.
 */
export default function EmailVerifyBanner() {
  const [verified, setVerified] = useState<boolean | null>(null);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    getMe()
      .then((me) => {
        const ok = !!me.email_verified || !!me.is_admin;
        setVerified(ok);
        // mantém a sessão local em dia (para o botão de criar agente etc.)
        refreshSession().catch(() => {});
      })
      .catch(() => setVerified(true)); // em caso de erro, não atrapalha
  }, []);

  async function handleResend() {
    setSending(true);
    setFeedback(null);
    try {
      const msg = await resendVerification();
      setFeedback(msg);
    } catch (e: any) {
      setFeedback(e?.message || "Não foi possível reenviar agora.");
    } finally {
      setSending(false);
    }
  }

  // Enquanto carrega, ou quando já está verificado, não mostra nada.
  if (verified === null || verified) return null;

  return (
    <div className="mb-4 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <MailWarning className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
          <div className="text-sm">
            <p className="font-semibold">Confirme seu e-mail para liberar a criação de agentes.</p>
            <p className="text-amber-700/90 dark:text-amber-200/80">
              Enviamos um link de confirmação para o seu e-mail. Verifique também a caixa de spam.
            </p>
            {feedback && (
              <p className="mt-1 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="h-4 w-4" /> {feedback}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={handleResend}
          disabled={sending}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-amber-500 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-60"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Reenviar e-mail
        </button>
      </div>
    </div>
  );
}
