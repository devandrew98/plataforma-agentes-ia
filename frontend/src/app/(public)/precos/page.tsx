"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { getSession } from "@/src/lib/services/auth";
import { startCheckout } from "@/src/lib/services/billing";

type Plan = {
  id: string;
  name: string;
  price: string;
  period: string;
  highlight?: boolean;
  description: string;
  features: string[];
  cta: string;
  paid: boolean;
};

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Gratuito",
    price: "R$ 0",
    period: "para sempre",
    description: "Perfeito para testar e criar seu primeiro agente.",
    features: ["1 agente ativo", "1 base de conhecimento", "100 mensagens/mês", "Chat de teste"],
    cta: "Começar grátis",
    paid: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "R$ 49",
    period: "/mês",
    highlight: true,
    description: "Para quem quer colocar um agente para trabalhar de verdade.",
    features: ["5 agentes ativos", "10 bases de conhecimento", "5.000 mensagens/mês", "Integração WhatsApp", "Suporte por e-mail"],
    cta: "Assinar Pro",
    paid: true,
  },
  {
    id: "business",
    name: "Business",
    price: "R$ 149",
    period: "/mês",
    description: "Para empresas com volume e múltiplos canais.",
    features: ["Agentes ilimitados", "Bases ilimitadas", "50.000 mensagens/mês", "Todas as integrações", "Suporte prioritário"],
    cta: "Assinar Business",
    paid: true,
  },
];

export default function PrecosPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleChoose(plan: Plan) {
    if (!plan.paid) {
      window.location.href = "/login";
      return;
    }
    const session = getSession();
    if (!session) {
      window.location.href = "/login";
      return;
    }
    setNotice(null);
    setLoadingPlan(plan.id);
    try {
      const result = await startCheckout(plan.id);
      if (result.configured && result.checkout_url) {
        window.location.href = result.checkout_url;
      } else {
        setNotice(
          result.message ||
            "Pagamento online em configuração. Fale com a gente em argente.ia@microsoft.com para ativar seu plano."
        );
      }
    } catch {
      setNotice("Não foi possível iniciar o pagamento agora. Tente novamente em instantes.");
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-zinc-50">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-indigo-900/20 blur-[140px]" />
        <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-purple-900/15 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Voltar para a home
        </Link>

        <div className="mx-auto mb-12 max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-400">
            <Sparkles className="h-3 w-3" /> Planos simples e transparentes
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Escolha seu plano</h1>
          <p className="mt-3 text-zinc-400">Comece grátis e faça upgrade quando precisar de mais. Sem fidelidade.</p>
        </div>

        {notice && (
          <div className="mx-auto mb-8 max-w-2xl rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-200">
            {notice}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-3xl border p-6 ${
                plan.highlight
                  ? "border-indigo-500/50 bg-gradient-to-b from-indigo-500/10 to-transparent shadow-2xl shadow-indigo-500/10"
                  : "border-zinc-800 bg-zinc-950/60"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">
                  Mais popular
                </div>
              )}
              <h3 className="text-lg font-semibold text-zinc-100">{plan.name}</h3>
              <div className="mt-3 flex items-end gap-1">
                <span className="text-4xl font-bold text-white">{plan.price}</span>
                <span className="mb-1 text-sm text-zinc-500">{plan.period}</span>
              </div>
              <p className="mt-2 text-sm text-zinc-400">{plan.description}</p>

              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-zinc-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleChoose(plan)}
                disabled={loadingPlan === plan.id}
                className={`mt-8 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all disabled:opacity-60 ${
                  plan.highlight
                    ? "bg-indigo-600 text-white hover:bg-indigo-500"
                    : "border border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
                }`}
              >
                {loadingPlan === plan.id && <Loader2 className="h-4 w-4 animate-spin" />}
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-zinc-600">
          Pagamento seguro · Cancele quando quiser · Dúvidas? argente.ia@microsoft.com
        </p>
      </div>
    </div>
  );
}
