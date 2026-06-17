"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Bot,
  MessageSquareText,
  BookOpen,
  Workflow,
  PlayCircle,
  Rocket,
  Lightbulb,
  CheckCircle2,
  Plus,
  ArrowRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Step = {
  n: number;
  title: string;
  icon: React.ElementType;
  color: string;
  desc: string;
  bullets: string[];
};

const STEPS: Step[] = [
  {
    n: 1,
    title: "Crie o agente a partir de um template",
    icon: Bot,
    color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    desc: "Comece escolhendo um modelo pronto (Vendas, Suporte, Secretária...) ou um agente em branco.",
    bullets: [
      "Clique em \"Novo Agente\" no menu ou no dashboard.",
      "Escolha um template — ele já vem com um prompt testado.",
      "Dê um nome claro, ex: \"Atendente da Loja X\".",
    ],
  },
  {
    n: 2,
    title: "Defina a personalidade (prompt de sistema)",
    icon: MessageSquareText,
    color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    desc: "O prompt de sistema é o \"DNA\" do agente: quem ele é, como fala e o que pode ou não fazer.",
    bullets: [
      "Descreva o papel: \"Você é um atendente da loja X...\".",
      "Defina o tom: formal, descontraído, objetivo.",
      "Liste regras: o que responder, quando encaminhar a um humano.",
    ],
  },
  {
    n: 3,
    title: "Alimente com bases de conhecimento (RAG)",
    icon: BookOpen,
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    desc: "Suba PDFs, manuais ou textos. O agente consulta esse material para responder com precisão.",
    bullets: [
      "Vá em \"Knowledge Base\" e crie uma base.",
      "Faça upload dos documentos e clique em \"Indexar\".",
      "No fluxo do agente, conecte a base no nó RAG.",
    ],
  },
  {
    n: 4,
    title: "Monte o fluxo visual",
    icon: Workflow,
    color: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    desc: "No Studio do agente, arraste blocos (gatilho, IA, base de conhecimento, ação) e conecte-os.",
    bullets: [
      "Abra o agente e vá até o construtor de fluxo.",
      "Arraste os nós da barra lateral para a tela.",
      "Conecte os nós para definir a ordem das etapas.",
    ],
  },
  {
    n: 5,
    title: "Teste a conversa",
    icon: PlayCircle,
    color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    desc: "Converse com o agente para validar respostas, personalidade e uso da base de conhecimento.",
    bullets: [
      "Use o chat de teste dentro do agente.",
      "Ajuste o prompt conforme necessário.",
      "A memória mantém o contexto da conversa.",
    ],
  },
  {
    n: 6,
    title: "Ative e publique",
    icon: Rocket,
    color: "text-pink-400 bg-pink-500/10 border-pink-500/20",
    desc: "Quando estiver satisfeito, mude o status para \"Ativo\" e integre aos seus canais.",
    bullets: [
      "Altere o status do agente para \"Ativo\".",
      "Veja a aba \"Integrações\" para conectar canais.",
      "Acompanhe as conversas pelo histórico.",
    ],
  },
];

const TIPS = [
  "Seja específico no prompt: quanto mais claro o papel, melhor a resposta.",
  "Comece pequeno: um agente bem feito vale mais que vários incompletos.",
  "Sempre teste antes de ativar — peça perguntas difíceis ao agente.",
  "Use bases de conhecimento para evitar que o agente \"invente\" respostas.",
];

export default function TutorialPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-10">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="relative overflow-hidden border rounded-3xl border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent p-8">
          <div className="flex items-center gap-2 mb-3 text-indigo-400">
            <GraduationCap className="w-5 h-5" />
            <span className="text-sm font-semibold tracking-wider uppercase">
              Tutorial guiado
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-100">
            Como criar seu agente de IA
          </h1>
          <p className="max-w-2xl mt-2 text-zinc-400">
            Um passo a passo simples para quem nunca criou um agente. Em 6 etapas
            você terá um assistente inteligente atendendo no lugar — do zero ao ar.
          </p>
          <div className="flex flex-col gap-3 mt-6 sm:flex-row">
            <Button
              size="lg"
              className="gap-2 bg-indigo-600 hover:bg-indigo-500"
              onClick={() => window.dispatchEvent(new Event("start-tour"))}
            >
              <PlayCircle className="w-4 h-4" /> Começar tour guiado
            </Button>
            <Button asChild size="lg" variant="outline" className="gap-2">
              <Link href="/agentes/novo">
                <Plus className="w-4 h-4" /> Criar agora por conta própria
              </Link>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Passos */}
      <div className="space-y-4">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={step.n}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Card className="border-border hover:border-zinc-700 transition-colors">
                <CardContent className="flex flex-col gap-4 p-6 sm:flex-row">
                  <div className="flex items-start gap-4 shrink-0">
                    <div className="flex items-center justify-center text-sm font-bold rounded-full w-8 h-8 bg-zinc-900 border border-zinc-800 text-zinc-300">
                      {step.n}
                    </div>
                    <div className={`flex items-center justify-center w-12 h-12 border rounded-xl ${step.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-zinc-100">{step.title}</h3>
                    <p className="mt-1 text-sm text-zinc-400">{step.desc}</p>
                    <ul className="mt-3 space-y-1.5">
                      {step.bullets.map((b, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-zinc-300">
                          <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Dicas */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4 text-amber-400">
              <Lightbulb className="w-5 h-5" />
              <span className="font-semibold">Dicas de ouro</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {TIPS.map((t, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                  <span className="text-amber-400">•</span>
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* CTA final */}
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <p className="text-zinc-400">Pronto para colocar a mão na massa?</p>
        <Button asChild size="lg" className="gap-2 bg-indigo-600 hover:bg-indigo-500">
          <Link href="/agentes/novo">
            Criar meu agente <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
