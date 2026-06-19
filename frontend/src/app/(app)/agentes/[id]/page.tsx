"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Edge, Node } from "reactflow";
import { ArrowLeft, Settings, Database, Activity, MessagesSquare, Save, Play, Bot, PanelLeftClose, PanelLeftOpen, Check, Share2, Copy, ExternalLink, Sparkles, BookOpen, Globe } from "lucide-react";

import FlowBuilder from "@/src/components/flow/FlowBuilder";
import { getAgent, updateAgent, KnowledgeMode } from "@/src/lib/services/agentes";
import { listKnowledgeBaseOptions } from "@/src/lib/services/kb";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function AgentStudioPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const agentId = params.id;

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"config" | "knowledge" | "flow" | "chat" | "share">("config");
  const [navCollapsed, setNavCollapsed] = useState(false);

  // No Fluxo Lógico, recolhe a navegação interna para dar espaço total ao canvas.
  useEffect(() => {
    setNavCollapsed(activeTab === "flow");
  }, [activeTab]);
  
  // Agent State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [provider, setProvider] = useState("openai");
  const [model, setModel] = useState("gpt-4o-mini");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [status, setStatus] = useState<"draft" | "active" | "paused">("draft");

  const [flowNodes, setFlowNodes] = useState<Node[]>([]);
  const [flowEdges, setFlowEdges] = useState<Edge[]>([]);
  const [initialFlow, setInitialFlow] = useState<{ nodes: Node[]; edges: Edge[]; } | null>(null);

  const [knowledgeMode, setKnowledgeMode] = useState<KnowledgeMode>("none");
  const [knowledgeKbId, setKnowledgeKbId] = useState("");
  const [kbOptions, setKbOptions] = useState<{ id: string; name: string }[]>([]);

  const [saving, setSaving] = useState(false);
  const [autoSaveState, setAutoSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const savedSnapshotRef = useRef<string>("");
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [shareOrigin, setShareOrigin] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const canSave = useMemo(() => name.trim().length >= 3, [name]);

  useEffect(() => {
    async function carregar() {
      try {
        setLoading(true);
        const agent = await getAgent(agentId);

        if (!agent) {
          alert("Agente não encontrado.");
          router.push("/agentes");
          return;
        }

        setName(agent.name);
        setDescription(agent.description || "");
        setProvider(agent.provider || "openai");
        setModel(agent.model || "gpt-4o-mini");
        setSystemPrompt(agent.system_prompt || "");
        setStatus(agent.status);

        setInitialFlow(agent.flow);
        setFlowNodes(agent.flow.nodes || []);
        setFlowEdges(agent.flow.edges || []);

        const km = (agent.flow.knowledge?.mode as KnowledgeMode) || "none";
        const kkb = agent.flow.knowledge?.kbId ? String(agent.flow.knowledge.kbId) : "";
        setKnowledgeMode(km);
        setKnowledgeKbId(kkb);

        savedSnapshotRef.current = JSON.stringify({
          name: agent.name,
          description: agent.description || "",
          provider: agent.provider || "openai",
          model: agent.model || "gpt-4o-mini",
          systemPrompt: agent.system_prompt || "",
          status: agent.status,
          flowNodes: agent.flow.nodes || [],
          flowEdges: agent.flow.edges || [],
          knowledgeMode: km,
          knowledgeKbId: kkb,
        });
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    carregar();
  }, [agentId, router]);

  async function onSave() {
    if (!canSave) return;
    try {
      setSaving(true);
      const updated = await updateAgent(agentId, {
        name,
        description,
        provider,
        model,
        system_prompt: systemPrompt,
        status,
        flow: {
          nodes: flowNodes,
          edges: flowEdges,
          knowledge: { mode: knowledgeMode, kbId: knowledgeMode === "rag" ? knowledgeKbId || null : null },
        },
      });

      if (!updated) {
        alert("Agente não encontrado.");
        return;
      }
      savedSnapshotRef.current = JSON.stringify({
        name, description, provider, model, systemPrompt, status, flowNodes, flowEdges, knowledgeMode, knowledgeKbId,
      });
      setAutoSaveState("saved");
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar alterações.");
    } finally {
      setSaving(false);
    }
  }

  // Auto-save: persiste sozinho ~1,5s após a última alteração (sem botão).
  useEffect(() => {
    if (loading || !canSave) return;
    const snapshot = JSON.stringify({
      name, description, provider, model, systemPrompt, status, flowNodes, flowEdges, knowledgeMode, knowledgeKbId,
    });
    if (snapshot === savedSnapshotRef.current) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      setAutoSaveState("saving");
      try {
        await updateAgent(agentId, {
          name,
          description,
          provider,
          model,
          system_prompt: systemPrompt,
          status,
          flow: {
            nodes: flowNodes,
            edges: flowEdges,
            knowledge: { mode: knowledgeMode, kbId: knowledgeMode === "rag" ? knowledgeKbId || null : null },
          },
        });
        savedSnapshotRef.current = snapshot;
        setAutoSaveState("saved");
      } catch {
        setAutoSaveState("idle");
      }
    }, 1500);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [loading, canSave, name, description, provider, model, systemPrompt, status, flowNodes, flowEdges, knowledgeMode, knowledgeKbId, agentId]);

  useEffect(() => {
    setShareOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    listKnowledgeBaseOptions().then(setKbOptions).catch(() => setKbOptions([]));
  }, []);

  function copyText(text: string, key: string) {
    navigator.clipboard
      ?.writeText(text)
      .then(() => {
        setCopied(key);
        setTimeout(() => setCopied((c) => (c === key ? null : c)), 1800);
      })
      .catch(() => {});
  }

  const publicUrl = shareOrigin ? `${shareOrigin}/chat/${agentId}` : "";
  const iframeSnippet = `<iframe src="${publicUrl}?embed=1" style="width:380px;height:560px;border:0;border-radius:16px"></iframe>`;
  const bubbleSnippet = `<script>
(function(){
  var u="${publicUrl}?embed=1";
  var b=document.createElement('button');b.innerHTML='\\uD83D\\uDCAC';b.title='Fale conosco';
  b.style.cssText='position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:50%;border:0;background:#6366f1;color:#fff;font-size:24px;cursor:pointer;z-index:99999;box-shadow:0 4px 14px rgba(0,0,0,.3)';
  var f=document.createElement('iframe');f.src=u;
  f.style.cssText='position:fixed;bottom:88px;right:20px;width:380px;height:560px;max-width:92vw;border:0;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,.35);z-index:99999;display:none;background:#0a0a0a';
  b.onclick=function(){f.style.display=(f.style.display==='none')?'block':'none'};
  document.body.appendChild(f);document.body.appendChild(b);
})();
<\/script>`;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="w-10 h-10 border-4 rounded-full border-indigo-500/30 border-t-indigo-500 animate-spin" />
        <p className="text-zinc-500 animate-pulse">Carregando Agent Studio...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      {/* Studio Header */}
      <div className="flex items-center justify-between pb-6 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/agentes")} className="rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{name}</h1>
              <div className={`w-2 h-2 rounded-full ${status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-500'}`} />
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Bot className="w-3.5 h-3.5" /> ID: {agentId} • {provider === 'openai' ? 'OpenAI' : 'Anthropic'} ({model})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-zinc-500 sm:block min-w-[140px] text-right">
            {autoSaveState === "saving" ? (
              "Salvando…"
            ) : autoSaveState === "saved" ? (
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <Check className="h-3.5 w-3.5" /> Salvo automaticamente
              </span>
            ) : (
              ""
            )}
          </span>
          <Button variant="outline" onClick={() => setActiveTab("chat")} className="gap-2 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10">
            <Play className="w-4 h-4" /> Testar
          </Button>
          <Button onClick={onSave} disabled={!canSave || saving} className="gap-2 bg-white text-black hover:bg-zinc-200">
            <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar Agente"}
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden pt-6 gap-6">
        
        {/* Navigation Sidebar (colapsável) */}
        <div className={`shrink-0 space-y-2 transition-[width] duration-200 ${navCollapsed ? "w-12" : "w-64"}`}>
          <button
            onClick={() => setNavCollapsed((c) => !c)}
            title={navCollapsed ? "Expandir menu" : "Recolher menu"}
            className={`flex h-9 items-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-zinc-200 ${navCollapsed ? "w-full justify-center" : "w-full justify-end px-2"}`}
          >
            {navCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
          {[
            { id: "config", label: "Configurações", icon: Settings, desc: "Personalidade e modelo" },
            { id: "flow", label: "Fluxo Lógico", icon: Activity, desc: "Comportamento visual" },
            { id: "knowledge", label: "Base de Dados", icon: Database, desc: "Integração RAG" },
            { id: "chat", label: "Playground", icon: MessagesSquare, desc: "Testar respostas" },
            { id: "share", label: "Compartilhar", icon: Share2, desc: "Link público e widget" },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                title={navCollapsed ? tab.label : undefined}
                className={`w-full flex items-start rounded-xl transition-all ${
                  navCollapsed ? "justify-center p-2.5" : "gap-3 p-3 text-left"
                } ${
                  isActive
                    ? "bg-indigo-500/10 border border-indigo-500/20"
                    : "hover:bg-zinc-900 border border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${navCollapsed ? "" : "mt-0.5"} ${isActive ? "text-indigo-400" : ""}`} />
                {!navCollapsed && (
                  <div>
                    <div className={`text-sm font-medium ${isActive ? "text-indigo-400" : ""}`}>{tab.label}</div>
                    <div className="text-xs text-zinc-500">{tab.desc}</div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto bg-zinc-950/50 border border-border/50 rounded-2xl relative">
          <div className="h-full">
            {/* TAB: CONFIGURATIONS */}
            {activeTab === "config" && (
              <div className="p-8 max-w-3xl">
                <div className="mb-8">
                  <h2 className="text-xl font-semibold mb-1">Identidade do Agente</h2>
                  <p className="text-sm text-zinc-500">Defina como seu agente será chamado e qual será sua personalidade base.</p>
                </div>
                
                <div className="space-y-6">
                  <div className="grid gap-2">
                    <Label>Nome do Agente</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-zinc-900/50" />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label>Descrição</Label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="bg-zinc-900/50 resize-none" rows={2} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Status</Label>
                      <select 
                        value={status} 
                        onChange={(e) => setStatus(e.target.value as any)}
                        className="flex h-10 w-full rounded-md border border-input bg-zinc-900/50 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="draft">Rascunho</option>
                        <option value="active">Ativo (Online)</option>
                        <option value="paused">Pausado</option>
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Modelo de IA</Label>
                      <select 
                        value={`${provider}:${model}`} 
                        onChange={(e) => {
                          const [p, m] = e.target.value.split(":");
                          setProvider(p);
                          setModel(m);
                        }}
                        className="flex h-10 w-full rounded-md border border-input bg-zinc-900/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <optgroup label="OpenAI">
                          <option value="openai:gpt-4o-mini">GPT-4o Mini (Rápido)</option>
                          <option value="openai:gpt-4o">GPT-4o (Avançado)</option>
                        </optgroup>
                        <optgroup label="Anthropic">
                          <option value="anthropic:claude-3-haiku">Claude 3 Haiku</option>
                          <option value="anthropic:claude-3-sonnet">Claude 3 Sonnet</option>
                        </optgroup>
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-2 pt-4 border-t border-border/50">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-lg">Prompt de Sistema (System Prompt)</Label>
                    </div>
                    <p className="text-sm text-zinc-500 mb-2">
                      Instruções detalhadas sobre como o modelo deve se comportar, formatar respostas e lidar com os usuários.
                    </p>
                    <Textarea
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      className="font-mono text-sm leading-relaxed bg-zinc-950 border-zinc-800 p-4 min-h-[300px]"
                    />
                  </div>

                  {/* Estratégia de conhecimento */}
                  <div className="grid gap-2 pt-6 border-t border-border/50">
                    <Label className="text-lg">Conhecimento do agente</Label>
                    <p className="-mt-1 text-sm text-zinc-500 mb-1">
                      Onde o agente busca informação além do que o modelo já sabe.
                    </p>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {[
                        { id: "none", label: "Só a IA", desc: "Conhecimento do próprio modelo", icon: Sparkles },
                        { id: "rag", label: "Base de conhecimento", desc: "Busca semântica nos documentos", icon: BookOpen },
                        { id: "web", label: "Buscar na internet", desc: "Pesquisa na web em tempo real", icon: Globe },
                      ].map((opt) => {
                        const Icon = opt.icon;
                        const active = knowledgeMode === opt.id;
                        return (
                          <button
                            type="button"
                            key={opt.id}
                            onClick={() => setKnowledgeMode(opt.id as KnowledgeMode)}
                            className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors ${
                              active ? "border-indigo-500/60 bg-indigo-500/10" : "border-zinc-800 hover:border-zinc-600"
                            }`}
                          >
                            <Icon className={`h-4 w-4 ${active ? "text-indigo-400" : "text-zinc-400"}`} />
                            <span className="text-sm font-medium">{opt.label}</span>
                            <span className="text-[11px] leading-tight text-muted-foreground">{opt.desc}</span>
                          </button>
                        );
                      })}
                    </div>

                    {knowledgeMode === "rag" && (
                      <div className="mt-2 grid gap-2">
                        <Label>Qual base de conhecimento?</Label>
                        <select
                          value={knowledgeKbId}
                          onChange={(e) => setKnowledgeKbId(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-zinc-900/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <option value="">Selecione uma base...</option>
                          {kbOptions.map((k) => (
                            <option key={k.id} value={String(k.id)}>{k.name}</option>
                          ))}
                        </select>
                        {kbOptions.length === 0 ? (
                          <p className="text-[11px] text-amber-400">
                            Você ainda não tem bases. Crie uma em <strong>Base de Dados / Knowledge Base</strong>, suba um arquivo e indexe.
                          </p>
                        ) : (
                          <p className="text-[11px] text-zinc-500">
                            A base precisa estar <strong>indexada</strong> para o agente conseguir buscar nela.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: FLOW */}
            {activeTab === "flow" && (
              <div className="absolute inset-0 bg-zinc-950">
                <FlowBuilder
                  initialFlow={initialFlow}
                  onFlowChange={(nodes, edges) => {
                    setFlowNodes(nodes);
                    setFlowEdges(edges);
                  }}
                />
              </div>
            )}

            {/* TAB: KNOWLEDGE BASE */}
            {activeTab === "knowledge" && (
              <div className="p-8 flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mb-6 text-blue-400">
                  <Database className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-semibold mb-2">Bases de Conhecimento (RAG)</h2>
                <p className="text-zinc-400 max-w-md mb-4">
                  Conecte arquivos PDF ou textos para que seu agente responda com base em dados exclusivos da sua empresa.
                </p>
                <p className="text-zinc-500 max-w-md mb-8 text-sm">
                  Como vincular: crie e indexe uma base em <strong className="text-zinc-300">Knowledge Base</strong>, depois,
                  na aba <strong className="text-zinc-300">Fluxo Lógico</strong>, adicione um nó <strong className="text-zinc-300">RAG</strong> e selecione a base.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    onClick={() => router.push("/kb")}
                    variant="outline"
                    className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                  >
                    Gerenciar Bases de Conhecimento
                  </Button>
                  <Button
                    onClick={() => setActiveTab("flow")}
                    variant="outline"
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  >
                    Ir para o Fluxo Lógico
                  </Button>
                </div>
              </div>
            )}

            {/* TAB: CHAT (PLAYGROUND) */}
            {activeTab === "chat" && (
              <div className="p-8 flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mb-6 text-emerald-400">
                  <MessagesSquare className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-semibold mb-2">Playground de Testes</h2>
                <p className="text-zinc-400 max-w-md mb-8">
                  Interface para simular conversas com o agente e testar o funcionamento do Prompt de Sistema e Fluxos antes de publicar.
                </p>
                <Button onClick={() => router.push(`/agentes/${agentId}/chat`)} className="bg-emerald-600 hover:bg-emerald-500 text-white">
                  Abrir Chat Tela Cheia
                </Button>
              </div>
            )}

            {/* TAB: SHARE / PUBLICAR */}
            {activeTab === "share" && (
              <div className="p-8 max-w-3xl">
                <div className="mb-8">
                  <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-indigo-400" /> Compartilhar agente
                  </h2>
                  <p className="text-sm text-zinc-500">
                    Publique o agente e disponibilize por um link público ou incorporado no seu site.
                  </p>
                </div>

                {status !== "active" ? (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
                    <p className="text-sm text-amber-200 mb-3">
                      Para gerar o link público, o agente precisa estar <b>Ativo</b>. Só agentes
                      publicados respondem publicamente.
                    </p>
                    <Button onClick={() => setStatus("active")} className="bg-emerald-600 hover:bg-emerald-500 text-white">
                      Publicar agente (Ativar)
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-7">
                    {/* Link público */}
                    <div className="space-y-2">
                      <Label>Link público</Label>
                      <div className="flex gap-2">
                        <Input readOnly value={publicUrl} className="bg-zinc-900/50 font-mono text-xs" />
                        <Button variant="outline" onClick={() => copyText(publicUrl, "link")} className="gap-2 shrink-0">
                          {copied === "link" ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />} Copiar
                        </Button>
                        <Button variant="outline" asChild className="gap-2 shrink-0">
                          <a href={publicUrl} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-4 w-4" /> Abrir
                          </a>
                        </Button>
                      </div>
                      <p className="text-xs text-zinc-500">
                        Qualquer pessoa com esse link pode conversar com o agente, sem precisar de login.
                      </p>
                    </div>

                    {/* Embed iframe */}
                    <div className="space-y-2">
                      <Label>Incorporar no site (iframe)</Label>
                      <pre className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-[11px] text-zinc-300">
                        {iframeSnippet}
                      </pre>
                      <Button variant="outline" size="sm" onClick={() => copyText(iframeSnippet, "iframe")} className="gap-2">
                        {copied === "iframe" ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />} Copiar código
                      </Button>
                    </div>

                    {/* Floating bubble */}
                    <div className="space-y-2">
                      <Label>Botão flutuante de chat (cole antes de &lt;/body&gt;)</Label>
                      <pre className="max-h-48 overflow-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-[11px] text-zinc-300">
                        {bubbleSnippet}
                      </pre>
                      <Button variant="outline" size="sm" onClick={() => copyText(bubbleSnippet, "bubble")} className="gap-2">
                        {copied === "bubble" ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />} Copiar código
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}