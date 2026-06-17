"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Plus, MoreVertical, Play, Edit, Trash2, Cpu, CheckCircle2, Clock, GraduationCap } from "lucide-react";

import { Agente, deleteAgent, listAgents } from "@/src/lib/services/agentes";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

function fmtDate(iso?: string) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "short", year: "numeric"
    });
  } catch {
    return iso;
  }
}

export default function AgentesPage() {
  const [agents, setAgents] = useState<Agente[]>([]);
  const [loading, setLoading] = useState(true);

  async function carregar() {
    try {
      setLoading(true);
      const data = await listAgents();
      setAgents(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function onDelete(id: number) {
    if (!confirm("Tem certeza que deseja excluir este agente permanentemente?")) return;

    try {
      await deleteAgent(id);
      await carregar();
    } catch (error) {
      console.error(error);
      alert("Erro ao excluir agente.");
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meus Agentes</h1>
          <p className="text-muted-foreground">
            Gerencie, treine e teste seus agentes de inteligência artificial.
          </p>
        </div>

        <Button asChild className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-white">
          <Link href="/agentes/novo">
            <Plus className="w-4 h-4" /> Criar Agente
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse bg-zinc-900/50 border-zinc-800">
              <div className="h-48" />
            </Card>
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-2xl border-zinc-800 bg-zinc-950/50">
          <div className="flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-zinc-900">
            <Bot className="w-8 h-8 text-zinc-500" />
          </div>
          <h3 className="text-xl font-semibold text-zinc-200">Nenhum agente encontrado</h3>
          <p className="max-w-md mt-2 mb-6 text-sm text-zinc-500">
            Você ainda não possui agentes. Crie seu primeiro agente de vendas, suporte ou crie do zero com nossos templates avançados.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link href="/agentes/novo">
                <Plus className="w-4 h-4" /> Criar Primeiro Agente
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="gap-2">
              <Link href="/tutorial">
                <GraduationCap className="w-4 h-4" /> Não sei como — ver tutorial
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {agents.map((a, index) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="flex flex-col h-full overflow-hidden transition-all border-border hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/5 group">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 border rounded-xl bg-zinc-900 border-zinc-800 group-hover:border-indigo-500/30 group-hover:bg-indigo-500/10 transition-colors">
                          <Bot className="w-5 h-5 text-zinc-400 group-hover:text-indigo-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-zinc-100 line-clamp-1" title={a.name}>
                            {a.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            {a.status === "active" ? (
                              <div className="flex items-center gap-1.5 text-xs text-emerald-500">
                                <span className="relative flex w-2 h-2">
                                  <span className="absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping bg-emerald-400"></span>
                                  <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500"></span>
                                </span>
                                Online
                              </div>
                            ) : a.status === "paused" ? (
                              <div className="flex items-center gap-1.5 text-xs text-amber-500">
                                <Clock className="w-3 h-3" /> Pausado
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                                <Edit className="w-3 h-3" /> Rascunho
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="w-8 h-8 -mr-2 text-zinc-500 hover:text-zinc-100">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 border-zinc-800 bg-zinc-950">
                          <DropdownMenuItem asChild>
                            <Link href={`/agentes/${a.id}`} className="cursor-pointer gap-2">
                              <Edit className="w-4 h-4" /> Editar
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onDelete(a.id)} className="text-red-500 focus:text-red-500 focus:bg-red-500/10 cursor-pointer gap-2">
                            <Trash2 className="w-4 h-4" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="flex-1 pb-4">
                    <p className="text-sm text-zinc-400 line-clamp-2 min-h-[40px]">
                      {a.description || "Nenhuma descrição fornecida para este agente."}
                    </p>
                    
                    <div className="flex items-center gap-2 mt-4">
                      <Badge variant="outline" className="gap-1 font-normal text-xs bg-zinc-900 border-zinc-800 text-zinc-300">
                        <Cpu className="w-3 h-3" /> {a.model || "gpt-4o-mini"}
                      </Badge>
                      <Badge variant="outline" className="gap-1 font-normal text-xs bg-zinc-900 border-zinc-800 text-zinc-300">
                        {a.provider === "anthropic" ? "Anthropic" : "OpenAI"}
                      </Badge>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-4 border-t border-border/50 flex items-center justify-between bg-zinc-950/30">
                    <span className="text-xs text-zinc-500">
                      Atualizado em {fmtDate(a.updated_at)}
                    </span>
                    <Button asChild size="sm" variant="secondary" className="gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 h-8">
                      <Link href={`/agentes/${a.id}`}>
                        <Play className="w-3.5 h-3.5" /> Abrir Studio
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}