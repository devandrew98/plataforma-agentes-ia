"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Edge, Node } from "reactflow";
import { ArrowLeft, Settings, Database, Activity, MessagesSquare, Save, Play, Bot, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import FlowBuilder from "@/src/components/flow/FlowBuilder";
import { getAgent, updateAgent } from "@/src/lib/services/agentes";

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
  const [activeTab, setActiveTab] = useState<"config" | "knowledge" | "flow" | "chat">("config");
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
  
  const [saving, setSaving] = useState(false);

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
        flow: { nodes: flowNodes, edges: flowEdges },
      });

      if (!updated) {
        alert("Agente não encontrado.");
        return;
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar alterações.");
    } finally {
      setSaving(false);
    }
  }

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
          </div>
        </div>
      </div>
    </div>
  );
}