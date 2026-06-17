"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  MessageCircle, Mail, Phone, Slack, Plus, Zap, Loader2, CheckCircle2, X, Copy, Send, Inbox,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Agente, listAgents } from "@/src/lib/services/agentes";
import {
  Integration, IntegrationRequest,
  listIntegrations, connectWhatsapp, deleteIntegration,
  createIntegrationRequest, listIntegrationRequests,
} from "@/src/lib/services/integrations";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const WEBHOOK_URL = `${API_URL}/integrations/whatsapp/webhook`;

const channels = [
  { id: "whatsapp", name: "WhatsApp Business", description: "Conecte um número e deixe o agente responder sozinho.", icon: MessageCircle, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  { id: "slack", name: "Slack", description: "Agentes nos seus canais do Slack para suporte interno.", icon: Slack, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
  { id: "email", name: "E-mail (SMTP/IMAP)", description: "Responda e-mails de suporte automaticamente.", icon: Mail, color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20" },
  { id: "voice", name: "Voz (Telefonia)", description: "Atenda chamadas com agentes de voz.", icon: Phone, color: "text-indigo-400", bg: "bg-indigo-400/10", border: "border-indigo-400/20" },
];

export default function IntegracoesPage() {
  const [agents, setAgents] = useState<Agente[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [requests, setRequests] = useState<IntegrationRequest[]>([]);

  const [waOpen, setWaOpen] = useState(false);
  const [reqOpen, setReqOpen] = useState(false);

  async function load() {
    const [ag, integ, reqs] = await Promise.all([
      listAgents().catch(() => []),
      listIntegrations().catch(() => []),
      listIntegrationRequests().catch(() => ({ is_admin: false, requests: [] })),
    ]);
    setAgents(ag);
    setIntegrations(integ);
    setIsAdmin(reqs.is_admin);
    setRequests(reqs.requests);
  }

  useEffect(() => {
    load();
  }, []);

  const waIntegration = integrations.find((i) => i.channel === "whatsapp");

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integrações</h1>
          <p className="text-muted-foreground">Conecte seus agentes aos canais onde seus clientes já estão.</p>
        </div>
        <Button className="gap-2" onClick={() => setReqOpen(true)}>
          <Plus className="w-4 h-4" /> Solicitar nova
        </Button>
      </div>

      {/* Formulário de solicitação */}
      {reqOpen && <RequestForm onClose={() => setReqOpen(false)} onSent={load} />}

      {/* Configuração WhatsApp */}
      {waOpen && (
        <WhatsAppForm
          agents={agents}
          webhookUrl={WEBHOOK_URL}
          onClose={() => setWaOpen(false)}
          onSaved={async () => { setWaOpen(false); await load(); }}
        />
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {channels.map((c, index) => {
          const Icon = c.icon;
          const connected = c.id === "whatsapp" && !!waIntegration;
          return (
            <motion.div key={c.id} data-tour={c.id === "whatsapp" ? "whatsapp" : undefined} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
              <Card className={`relative h-full overflow-hidden transition-all hover:shadow-md ${connected ? "border-emerald-500/30 bg-emerald-500/5" : ""}`}>
                {connected && (
                  <div className="absolute top-0 right-0 p-3">
                    <Badge variant="outline" className="gap-1 text-emerald-500 border-emerald-500/30 bg-emerald-500/10">
                      <Zap className="w-3 h-3" /> Conectado
                    </Badge>
                  </div>
                )}
                <CardHeader>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 border ${c.border} ${c.bg} ${c.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <CardTitle>{c.name}</CardTitle>
                  <CardDescription className="min-h-[40px]">{c.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {c.id === "whatsapp" ? (
                    connected ? (
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={() => setWaOpen(true)}>Gerenciar</Button>
                        <Button variant="ghost" className="text-red-400 hover:text-red-300" onClick={async () => { if (confirm("Desconectar WhatsApp?")) { await deleteIntegration(waIntegration!.id); load(); } }}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button className="w-full gap-2 bg-emerald-600 hover:bg-emerald-500" onClick={() => setWaOpen(true)}>
                        <MessageCircle className="w-4 h-4" /> Conectar WhatsApp
                      </Button>
                    )
                  ) : (
                    <Button variant="outline" className="w-full gap-2" onClick={() => { setReqOpen(true); }}>
                      <Send className="w-4 h-4" /> Solicitar
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Painel admin: solicitações recebidas */}
      {isAdmin && (
        <Card className="border-indigo-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Inbox className="w-5 h-5 text-indigo-400" /> Solicitações recebidas (admin)
            </CardTitle>
            <CardDescription>Pedidos de integração enviados pelos usuários.</CardDescription>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">Nenhuma solicitação ainda.</p>
            ) : (
              <div className="space-y-2">
                {requests.map((r) => (
                  <div key={r.id} className="flex items-start justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-zinc-100">{r.channel}</div>
                      <div className="text-xs text-zinc-500">{r.user_email}</div>
                      {r.message && <div className="mt-1 text-sm text-zinc-300">{r.message}</div>}
                    </div>
                    <Badge variant="outline" className="shrink-0 text-amber-400 border-amber-500/30">{r.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RequestForm({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const [channel, setChannel] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  async function send() {
    if (!channel.trim()) return;
    setSending(true);
    try {
      const r = await createIntegrationRequest(channel.trim(), message.trim());
      setDone(r.message);
      onSent();
    } catch {
      setDone("Erro ao enviar. Tente novamente.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="border-indigo-500/30">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Solicitar nova integração</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {done ? (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            <CheckCircle2 className="w-4 h-4" /> {done}
          </div>
        ) : (
          <>
            <div className="grid gap-2">
              <Label>Qual integração você precisa?</Label>
              <Input value={channel} onChange={(e) => setChannel(e.target.value)} placeholder="Ex: Instagram, Telegram, CRM X..." />
            </div>
            <div className="grid gap-2">
              <Label>Detalhes (opcional)</Label>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Conte o que você precisa..." rows={3} />
            </div>
            <Button onClick={send} disabled={sending || !channel.trim()} className="gap-2">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Enviar solicitação
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function WhatsAppForm({ agents, webhookUrl, onClose, onSaved }: {
  agents: Agente[]; webhookUrl: string; onClose: () => void; onSaved: () => void;
}) {
  const [agentId, setAgentId] = useState(agents[0]?.id ? String(agents[0].id) : "");
  const [phoneId, setPhoneId] = useState("");
  const [token, setToken] = useState("");
  const [verify, setVerify] = useState("meu-token-secreto");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    if (!agentId || !phoneId.trim() || !token.trim()) { setErr("Preencha agente, phone_number_id e token."); return; }
    setSaving(true);
    setErr(null);
    try {
      await connectWhatsapp({
        agent_id: Number(agentId),
        phone_number_id: phoneId.trim(),
        access_token: token.trim(),
        verify_token: verify.trim(),
      });
      onSaved();
    } catch (e: any) {
      setErr(e?.message || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-emerald-500/30">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageCircle className="w-5 h-5 text-emerald-400" /> Conectar WhatsApp Business
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 text-xs text-zinc-400 space-y-2">
          <p>1. Crie um app no <b>Meta for Developers</b> → produto <b>WhatsApp</b>.</p>
          <p>2. No painel do WhatsApp, configure o <b>Webhook</b> com a URL abaixo e o <b>verify token</b> que você escolher aqui:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-zinc-950 px-2 py-1 text-zinc-300">{webhookUrl}</code>
            <Button size="sm" variant="outline" className="gap-1 h-7" onClick={() => navigator.clipboard.writeText(webhookUrl)}>
              <Copy className="w-3 h-3" /> Copiar
            </Button>
          </div>
          <p>3. Copie o <b>phone number ID</b> e o <b>access token</b> do painel e cole abaixo.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Agente que vai responder</Label>
            <Select value={agentId} onValueChange={setAgentId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {agents.length === 0 ? (
                  <SelectItem value="__none__" disabled>Crie um agente primeiro</SelectItem>
                ) : agents.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Verify token (você escolhe)</Label>
            <Input value={verify} onChange={(e) => setVerify(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Phone number ID</Label>
            <Input value={phoneId} onChange={(e) => setPhoneId(e.target.value)} placeholder="Ex: 123456789012345" />
          </div>
          <div className="grid gap-2">
            <Label>Access token</Label>
            <Input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="EAAG..." />
          </div>
        </div>

        {err && <p className="text-sm text-red-400">{err}</p>}

        <Button onClick={save} disabled={saving} className="gap-2 bg-emerald-600 hover:bg-emerald-500">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Salvar e ativar
        </Button>
      </CardContent>
    </Card>
  );
}
