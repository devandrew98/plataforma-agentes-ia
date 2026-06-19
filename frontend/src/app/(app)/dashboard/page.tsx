"use client";

import { Bot, BookOpen, Activity, Plus, GraduationCap, ArrowRight, Sparkles, Layers, MessageSquare, MessageCircle, BarChart3, Trophy, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { Agente, listAgents } from "@/src/lib/services/agentes";
import { listKbs } from "@/src/lib/services/kb";
import { getSession } from "@/src/lib/services/auth";
import { getMetricsOverview, getMessagesDaily, MetricsOverview, DailyPoint } from "@/src/lib/services/metrics";

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
  const [metrics, setMetrics] = useState<MetricsOverview | null>(null);
  const [daily, setDaily] = useState<DailyPoint[]>([]);

  useEffect(() => {
    const s = getSession();
    if (s?.user?.name) setFirstName(s.user.name.split(" ")[0]);

    getMetricsOverview().then(setMetrics).catch(() => {});
    getMessagesDaily(7).then(setDaily).catch(() => {});

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
    {
      label: "Conversas",
      value: metrics?.conversations,
      icon: MessageSquare,
      tint: "text-sky-400",
      sub:
        metrics && metrics.conversations > 0
          ? "Iniciadas com seus agentes"
          : "Nenhuma conversa ainda",
    },
    {
      label: "Mensagens",
      value: metrics?.messages,
      icon: MessageCircle,
      tint: "text-amber-400",
      sub:
        metrics && metrics.messages > 0
          ? `${metrics.user_messages} enviadas por usuários`
          : "Comece a conversar",
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
                    {loading ? "—" : s.value ?? "—"}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{s.sub}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Gráfico: mensagens nos últimos 7 dias */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="w-4 h-4 text-indigo-400" /> Mensagens nos últimos 7 dias
          </CardTitle>
        </CardHeader>
        <CardContent>
          {daily.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sem dados ainda. Converse com um agente para o gráfico aparecer.
            </p>
          ) : (
            (() => {
              const max = Math.max(1, ...daily.map((d) => d.count));
              const total = daily.reduce((s, d) => s + d.count, 0);
              return (
                <>
                  <div className="flex items-end gap-2 h-36">
                    {daily.map((d) => {
                      const pct = Math.round((d.count / max) * 100);
                      const label = new Date(d.date + "T12:00:00")
                        .toLocaleDateString("pt-BR", { weekday: "short" })
                        .replace(".", "");
                      return (
                        <div
                          key={d.date}
                          className="flex flex-1 flex-col items-center gap-1.5"
                          title={`${d.count} mensagem(ns) · ${d.date}`}
                        >
                          <div className="flex w-full items-end h-28">
                            <div
                              className="w-full rounded-t-md bg-gradient-to-t from-indigo-600 to-indigo-400 transition-all hover:from-indigo-500 hover:to-indigo-300"
                              style={{ height: `${d.count > 0 ? Math.max(pct, 6) : 2}%` }}
                            />
                          </div>
                          <span className="text-[10px] capitalize text-zinc-500">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Total no período:{" "}
                    <span className="font-medium text-zinc-300">{total}</span> mensagens
                  </p>
                </>
              );
            })()
          )}
        </CardContent>
      </Card>

      {/* Agentes mais usados + Consumo de IA */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="w-4 h-4 text-amber-400" /> Agentes mais usados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!metrics?.top_agents || metrics.top_agents.filter((a) => a.messages > 0).length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem uso ainda. Converse com um agente para ver o ranking.</p>
            ) : (
              <div className="space-y-2.5">
                {metrics.top_agents
                  .filter((a) => a.messages > 0)
                  .map((a, i) => (
                    <div key={a.id} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-xs font-bold text-zinc-300">
                          {i + 1}
                        </span>
                        <span className="truncate text-sm text-zinc-200">{a.name}</span>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">{a.messages} msgs</span>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="w-4 h-4 text-indigo-400" /> Consumo de IA (estimado)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">
                {(metrics?.estimated_tokens ?? 0).toLocaleString("pt-BR")}
              </span>
              <span className="text-sm text-muted-foreground">tokens</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Custo estimado:{" "}
              <span className="font-medium text-emerald-400">
                US$ {(metrics?.estimated_cost_usd ?? 0).toFixed(4)}
              </span>
            </p>
            <p className="mt-2 text-[11px] text-zinc-600">
              Estimativa com base no volume de mensagens (modelo gpt-4o-mini).
            </p>
          </CardContent>
        </Card>
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
