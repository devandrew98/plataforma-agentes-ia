"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Bot, BookOpen, Layers, Inbox, ShieldAlert, Loader2, MessageSquare, MessagesSquare, Trash2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { getStats, getUsers, getRequests, updateRequestStatus, getAllAgents, deleteUser, type AdminStats, type AdminUser, type AdminRequest, type AdminAgent } from "@/src/lib/services/admin";

function fmt(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" });
  } catch {
    return iso;
  }
}

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [agents, setAgents] = useState<AdminAgent[]>([]);

  async function load() {
    try {
      const s = await getStats();
      setStats(s);
      const [u, r, ag] = await Promise.all([getUsers(), getRequests(), getAllAgents()]);
      setUsers(u);
      setRequests(r);
      setAgents(ag);
    } catch {
      setForbidden(true);
    } finally {
      setLoading(false);
    }
  }

  async function removeUser(u: AdminUser) {
    if (!confirm(`Excluir o usuário ${u.email}?\nIsso apaga os agentes e bases dele. Não dá para desfazer.`)) return;
    const ok = await deleteUser(u.id);
    if (ok) {
      setUsers((us) => us.filter((x) => x.id !== u.id));
    } else {
      alert("Não foi possível excluir (o administrador não pode ser excluído).");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function changeStatus(id: number, status: string) {
    await updateRequestStatus(id, status);
    setRequests((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
  }

  if (loading) {
    return <div className="flex h-[50vh] items-center justify-center text-zinc-500"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (forbidden) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <ShieldAlert className="h-12 w-12 text-amber-400" />
        <h1 className="text-xl font-semibold">Acesso restrito</h1>
        <p className="max-w-sm text-sm text-zinc-500">Esta área é exclusiva do administrador da plataforma.</p>
        <Button onClick={() => router.push("/dashboard")}>Voltar ao dashboard</Button>
      </div>
    );
  }

  const cards = [
    { label: "Usuários", value: stats?.users, icon: Users, tint: "text-indigo-400" },
    { label: "Agentes", value: stats?.agents, icon: Bot, tint: "text-emerald-400" },
    { label: "Agentes ativos", value: stats?.active_agents, icon: Bot, tint: "text-emerald-400" },
    { label: "Bases", value: stats?.knowledge_bases, icon: BookOpen, tint: "text-sky-400" },
    { label: "Integrações", value: stats?.integrations, icon: Layers, tint: "text-amber-400" },
    { label: "Conversas", value: stats?.total_conversations, icon: MessagesSquare, tint: "text-sky-400" },
    { label: "Mensagens", value: stats?.total_messages, icon: MessageSquare, tint: "text-violet-400" },
    { label: "Solicitações pendentes", value: stats?.pending_requests, icon: Inbox, tint: "text-rose-400" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <ShieldAlert className="h-7 w-7 text-indigo-400" /> Painel do Administrador
        </h1>
        <p className="text-muted-foreground">Visão geral da plataforma, usuários e solicitações.</p>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label}>
              <CardContent className="p-4">
                <Icon className={`h-4 w-4 ${c.tint}`} />
                <div className="mt-2 text-2xl font-bold">{c.value ?? 0}</div>
                <div className="text-xs text-muted-foreground">{c.label}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Solicitações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Inbox className="h-5 w-5 text-indigo-400" /> Solicitações de integração</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">Nenhuma solicitação.</p>
          ) : (
            <div className="space-y-2">
              {requests.map((r) => (
                <div key={r.id} className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-zinc-100">{r.channel} <span className="text-xs text-zinc-500">· {r.user_email}</span></div>
                    {r.message && <div className="text-sm text-zinc-400">{r.message}</div>}
                    <div className="text-[11px] text-zinc-600">{fmt(r.created_at)}</div>
                  </div>
                  <Select value={r.status} onValueChange={(v) => changeStatus(r.id, v)}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="em_analise">Em análise</SelectItem>
                      <SelectItem value="concluida">Concluída</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usuários */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-indigo-400" /> Usuários ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2.5">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-zinc-100 truncate">{u.name || u.email}</div>
                  <div className="text-xs text-zinc-500 truncate">{u.email}{u.company ? ` · ${u.company}` : ""}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {u.has_own_key && <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">chave própria</Badge>}
                  <Badge variant="outline" className="text-zinc-400 border-zinc-700">{u.agents} agente(s)</Badge>
                  <span className="hidden text-xs text-zinc-600 sm:block">{fmt(u.created_at)}</span>
                  <button
                    onClick={() => removeUser(u)}
                    title="Excluir usuário"
                    className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Todos os agentes da plataforma */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5 text-indigo-400" /> Todos os agentes ({agents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {agents.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">Nenhum agente ainda.</p>
          ) : (
            <div className="space-y-2">
              {agents.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-zinc-100">{a.name}</div>
                    <div className="truncate text-xs text-zinc-500">
                      {a.owner_email || "—"} · {a.provider}/{a.model}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {a.status === "active" ? (
                      <Badge className="bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25">Ativo</Badge>
                    ) : (
                      <Badge variant="outline" className="text-zinc-400 border-zinc-700">{a.status}</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">{a.messages} msgs</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
