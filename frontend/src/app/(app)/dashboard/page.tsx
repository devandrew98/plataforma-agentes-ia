"use client";

import { Bot, BookOpen, Activity, Plus, GraduationCap, ArrowRight, Sparkles, Layers } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { Agente, listAgents } from "@/src/lib/services/agentes";
import { listKbs } from "@/src/lib/services/kb";
import { getSession } from "@/src/lib/services/auth";

function fmtDate(iso?: string) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function DashboardPage() {
  const [agents, setAgents] = useState<Agente[]>([]);
  const [kbCount, setKbCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("");

  useEffect(() => {
    const s = getSession();
    if (s?.user?.name) setFirstName(s.user.name.split(" ")[0]);

    (async () => {
      try {
        const [ags, kbs] = await Promise.all([
          listAgents().catch(() => []),
          listKbs().catch(() => []),
        ]);
        setAgents(ags);
        setKbCount(kbs.length);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const activeCount = agents.filter((a) => a.status === "active").length;
  const draftCount = agents.filter((a) => a.status !== "active").length;
  const recent = [...agents]
    .sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""))
    .slice(0, 5);

  const isEmpty = !loading && agents.length === 0;

  const stats = [
    {
      label: "Agentes Criados",
      value: agents.length,
      icon: Bot,
      tint: "text-zinc-400",
      sub: draftCount > 0 ? `${draftCount} em rascunho` : "Tudo publicado",
    },
    {
      label: "Agentes Ativos",
      value: activeCount,
      icon: Activity,
      tint: "text-indigo-400",
      sub: activeCount > 0 ? "Operando normalmente" : "Nenhum ativo ainda",
      highlight: true,
    },
    {
      label: "Bases de Conhecimento",
      value: kbCount,
      icon: BookOpen,
      tint: "text-emerald-400",
      sub: kbCount > 0 ? "Disponíveis para RAG" : "Crie uma base para o RAG",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {firstName ? `Olá, ${firstName} 👋` : "Dashboard"}
          </h1>
          <p className="text-muted-foreground">
            Visão geral da sua plataforma de agentes de IA.
          </p>
        </div>
        <Button asChild data-tour="novo-agente" className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-white">
          <Link href="/agentes/novo">
            <Plus className="w-4 h-4" /> Novo Agente
          </Link>
        </Button>
      </div>

      {/* Onboarding / primeira utilização */}
      {isEmpty && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 to-purple-500/5">
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-3 text-indigo-400">
                <Sparkles className="w-5 h-5" />
                <span className="text-sm font-semibold uppercase tracking-wider">
                  Bem-vindo!
                </span>
              </div>
              <h2 className="text-2xl font-bold text-zinc-100">
                Vamos criar seu primeiro agente de IA
              </h2>
              <p className="max-w-xl mt-2 text-sm text-zinc-400">
                Em poucos minutos você terá um agente treinado com a personalidade
                da sua empresa, conectado a bases de conhecimento e pronto para
                atender. Não sabe por onde começar? Siga o tutorial guiado.
              </p>
              <div className="flex flex-col gap-3 mt-6 sm:flex-row">
                <Button asChild size="lg" className="gap-2 bg-indigo-600 hover:bg-indigo-500">
                  <Link href="/agentes/novo">
                    <Plus className="w-4 h-4" /> Criar Primeiro Agente
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="gap-2">
                  <Link href="/tutorial">
                    <GraduationCap className="w-4 h-4" /> Ver Tutorial
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Cards de métricas */}
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
            >
              <Card
                className={`transition-colors hover:bg-zinc-900/50 ${
                  s.highlight ? "border-indigo-500/20" : ""
                }`}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {s.label}
                  </CardTitle>
                  <Icon className={`w-4 h-4 ${s.tint}`} />
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${s.highlight ? "text-indigo-400" : ""}`}>
                    {loading ? "—" : s.value}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{s.sub}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Ações rápidas */}
      <div>
        <h2 className="mb-3 text-sm font-semibold tracking-wide uppercase text-zinc-500">
          Ações rápidas
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/agentes/novo", label: "Criar Agente", desc: "Comece um novo agente", icon: Plus, tint: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
            { href: "/kb", label: "Base de Conhecimento", desc: "Suba documentos (RAG)", icon: BookOpen, tint: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
            { href: "/integracoes", label: "Integrações", desc: "Conecte seus canais", icon: Layers, tint: "text-sky-400 bg-sky-500/10 border-sky-500/20" },
            { href: "/tutorial", label: "Tutorial", desc: "Aprenda passo a passo", icon: GraduationCap, tint: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
          ].map((a) => {
            const Icon = a.icon;
            return (
              <Link key={a.href} href={a.href}>
                <Card className="h-full transition-all hover:border-zinc-600 hover:bg-zinc-900/50">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${a.tint}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-zinc-100">{a.label}</div>
                      <div className="truncate text-xs text-muted-foreground">{a.desc}</div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Atividade recente (agentes reais) */}
      {!isEmpty && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-indigo-500" />
                Seus Agentes
              </CardTitle>
              <Button asChild variant="ghost" size="sm" className="gap-1 text-xs text-zinc-400">
                <Link href="/agentes">
                  Ver todos <ArrowRight className="w-3 h-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 rounded-lg animate-pulse bg-zinc-900/60" />
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {recent.map((a) => (
                    <Link
                      key={a.id}
                      href={`/agentes/${a.id}`}
                      className="flex items-center justify-between px-2 py-3 transition-colors border-b rounded-lg last:border-0 border-zinc-800/60 hover:bg-zinc-900/50"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex items-center justify-center border rounded-lg w-9 h-9 bg-zinc-900 border-zinc-800">
                          <Bot className="w-4 h-4 text-zinc-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate text-zinc-100">{a.name}</div>
                          <div className="text-xs truncate text-muted-foreground">
                            {a.description || "Sem descrição"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {a.status === "active" ? (
                          <Badge className="bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25">
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-zinc-400 border-zinc-700">
                            Rascunho
                          </Badge>
                        )}
                        <span className="hidden text-xs text-muted-foreground sm:block">
                          {fmtDate(a.updated_at)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
