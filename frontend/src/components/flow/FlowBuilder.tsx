"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "reactflow/dist/style.css";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  Panel,
  addEdge,
  Connection,
  Edge,
  Node,
  ReactFlowInstance,
  useEdgesState,
  useNodesState,
} from "reactflow";
import {
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  MousePointerClick,
  PanelLeftClose,
  PanelLeftOpen,
  Copy,
} from "lucide-react";

import { nodeTypes, KIND_STYLES, NodeKind } from "./nodeTypes";
import { countKbDocsByStatus, listKnowledgeBaseOptions } from "@/src/lib/services/kb";
import TestRunDialog from "@/src/components/flow/TestRunDialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FlowNodeData = {
  title: string;
  subtitle?: string;
  kind: NodeKind;
  config?: Record<string, any>;
};

type ValidationIssue = {
  code:
    | "NO_TRIGGER"
    | "DISCONNECTED_NODES"
    | "TRIGGER_WITHOUT_OUTPUT"
    | "LLM_WITHOUT_INPUT"
    | "ACTION_WITHOUT_INPUT";
  message: string;
  nodeIds?: string[];
};

const PRESETS: Record<NodeKind, FlowNodeData> = {
  trigger: {
    title: "Gatilho",
    subtitle: "Início do fluxo",
    kind: "trigger",
    config: { source: "whatsapp", keyword: "" },
  },
  rag: {
    title: "Base de Conhecimento",
    subtitle: "Busca contexto",
    kind: "rag",
    config: { kbId: "", topK: 5, queryTemplate: "{user_message}" },
  },
  llm: {
    title: "IA (LLM)",
    subtitle: "Gera a resposta",
    kind: "llm",
    config: { model: "gpt-4o-mini", systemPrompt: "" },
  },
  tool: {
    title: "Ferramenta",
    subtitle: "Chama API/serviço",
    kind: "tool",
    config: { url: "", method: "GET" },
  },
  action: {
    title: "Ação",
    subtitle: "Executa algo",
    kind: "action",
    config: { action: "send_message" },
  },
  condition: {
    title: "Condição",
    subtitle: "Desvia o fluxo",
    kind: "condition",
    config: { expression: "" },
  },
  delay: {
    title: "Espera",
    subtitle: "Aguarda um tempo",
    kind: "delay",
    config: { seconds: 5 },
  },
  human: {
    title: "Atendente humano",
    subtitle: "Transfere a conversa",
    kind: "human",
    config: { department: "" },
  },
};

const PALETTE: { type: NodeKind; hint: string }[] = [
  { type: "trigger", hint: "Quando o fluxo começa" },
  { type: "rag", hint: "Consulta documentos" },
  { type: "llm", hint: "Inteligência / resposta" },
  { type: "tool", hint: "Integração externa" },
  { type: "condition", hint: "Se/então (desvia o fluxo)" },
  { type: "delay", hint: "Aguardar X segundos" },
  { type: "human", hint: "Transferir p/ humano" },
  { type: "action", hint: "Resposta / saída final" },
];

const defaultNodes: Node<FlowNodeData>[] = [
  { id: "trigger-1", type: "trigger", position: { x: 60, y: 180 }, data: { ...PRESETS.trigger, title: "Mensagem recebida" } },
  { id: "rag-1", type: "rag", position: { x: 340, y: 180 }, data: { ...PRESETS.rag } },
  { id: "llm-1", type: "llm", position: { x: 620, y: 180 }, data: { ...PRESETS.llm } },
  { id: "action-1", type: "action", position: { x: 900, y: 180 }, data: { ...PRESETS.action, title: "Enviar resposta" } },
];

const EDGE_STYLE = {
  style: { strokeWidth: 2, stroke: "#818cf8" },
  markerEnd: { type: MarkerType.ArrowClosed, color: "#818cf8" },
};

const defaultEdges: Edge[] = [
  { id: "e1-2", source: "trigger-1", target: "rag-1", ...EDGE_STYLE },
  { id: "e2-3", source: "rag-1", target: "llm-1", ...EDGE_STYLE },
  { id: "e3-4", source: "llm-1", target: "action-1", ...EDGE_STYLE },
];

function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(16).slice(2, 8)}`;
}

function reachableFromTriggers(nodes: Node<FlowNodeData>[], edges: Edge[]) {
  const triggers = nodes.filter((n) => n.type === "trigger").map((n) => n.id);
  const out = new Map<string, string[]>();
  for (const e of edges) {
    if (!out.has(e.source)) out.set(e.source, []);
    out.get(e.source)!.push(e.target);
  }
  const visited = new Set<string>();
  const q: string[] = [];
  for (const t of triggers) {
    visited.add(t);
    q.push(t);
  }
  while (q.length) {
    const cur = q.shift()!;
    for (const v of out.get(cur) || []) {
      if (!visited.has(v)) {
        visited.add(v);
        q.push(v);
      }
    }
  }
  return { triggers, visited };
}

function validateFlow(nodes: Node<FlowNodeData>[], edges: Edge[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (nodes.length === 0) return issues;

  const triggers = nodes.filter((n) => n.type === "trigger");
  if (triggers.length === 0) {
    issues.push({ code: "NO_TRIGGER", message: "O fluxo precisa de pelo menos 1 Gatilho." });
  }

  const inDeg = new Map<string, number>();
  const outDeg = new Map<string, number>();
  for (const n of nodes) {
    inDeg.set(n.id, 0);
    outDeg.set(n.id, 0);
  }
  for (const e of edges) {
    inDeg.set(e.target, (inDeg.get(e.target) || 0) + 1);
    outDeg.set(e.source, (outDeg.get(e.source) || 0) + 1);
  }

  const triggerNoOut = triggers.filter((t) => (outDeg.get(t.id) || 0) === 0);
  if (triggerNoOut.length) {
    issues.push({
      code: "TRIGGER_WITHOUT_OUTPUT",
      message: "Há um Gatilho sem saída conectada.",
      nodeIds: triggerNoOut.map((n) => n.id),
    });
  }

  const llmNoIn = nodes.filter((n) => n.type === "llm").filter((n) => (inDeg.get(n.id) || 0) === 0);
  if (llmNoIn.length) {
    issues.push({
      code: "LLM_WITHOUT_INPUT",
      message: "Há um bloco de IA sem entrada conectada.",
      nodeIds: llmNoIn.map((n) => n.id),
    });
  }

  const actionNoIn = nodes.filter((n) => n.type === "action").filter((n) => (inDeg.get(n.id) || 0) === 0);
  if (actionNoIn.length) {
    issues.push({
      code: "ACTION_WITHOUT_INPUT",
      message: "Há uma Ação sem entrada conectada.",
      nodeIds: actionNoIn.map((n) => n.id),
    });
  }

  const { visited } = reachableFromTriggers(nodes, edges);
  const disconnected = nodes.filter((n) => !visited.has(n.id)).map((n) => n.id);
  if (disconnected.length) {
    issues.push({
      code: "DISCONNECTED_NODES",
      message: "Há blocos desconectados do Gatilho.",
      nodeIds: disconnected,
    });
  }

  return issues;
}

export default function FlowBuilder({
  initialFlow,
  onFlowChange,
}: {
  initialFlow?: { nodes: Node[]; edges: Edge[] } | null;
  onFlowChange?: (nodes: Node[], edges: Edge[]) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [rf, setRf] = useState<ReactFlowInstance | null>(null);

  const startNodes = (initialFlow?.nodes?.length ? initialFlow.nodes : defaultNodes) as Node<FlowNodeData>[];
  const startEdges = (initialFlow?.edges?.length ? initialFlow.edges : defaultEdges) as Edge[];

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNodeData>(startNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(startEdges);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [kbOptions, setKbOptions] = useState<{ id: string; name: string }[]>([]);
  const [kbRefreshKey, setKbRefreshKey] = useState(0);
  const [ragKbStatus, setRagKbStatus] = useState<{ uploaded: number; indexed: number; failed: number } | null>(null);

  // painéis flutuantes colapsáveis
  const [paletteOpen, setPaletteOpen] = useState(true);
  const [validationOpen, setValidationOpen] = useState(true);

  useEffect(() => {
    listKnowledgeBaseOptions()
      .then(setKbOptions)
      .catch(() => setKbOptions([]));
  }, [kbRefreshKey]);

  useEffect(() => {
    if (!initialFlow) return;
    if (initialFlow.nodes?.length) setNodes(initialFlow.nodes as any);
    if (initialFlow.edges?.length) setEdges(initialFlow.edges as any);
    setSelectedNodeId(null);
  }, [initialFlow?.nodes, initialFlow?.edges, setNodes, setEdges]);

  useEffect(() => {
    onFlowChange?.(nodes as any, edges as any);
  }, [nodes, edges, onFlowChange]);

  const selectedNode = useMemo(
    () => (nodes as any).find((n: Node) => n.id === selectedNodeId) || null,
    [nodes, selectedNodeId]
  );

  useEffect(() => {
    async function loadRagStatus() {
      if (!selectedNode || selectedNode.type !== "rag") return setRagKbStatus(null);
      const kbId = selectedNode.data?.config?.kbId as string | undefined;
      if (!kbId) return setRagKbStatus(null);
      try {
        setRagKbStatus(await countKbDocsByStatus(kbId));
      } catch {
        setRagKbStatus(null);
      }
    }
    loadRagStatus();
  }, [selectedNode, kbRefreshKey]);

  const issues = useMemo(() => validateFlow(nodes as any, edges), [nodes, edges]);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge({ ...connection, ...EDGE_STYLE }, eds)),
    [setEdges]
  );

  const makeNode = useCallback((type: NodeKind, position: { x: number; y: number }): Node<FlowNodeData> => {
    return {
      id: newId(type),
      type,
      position,
      data: { ...PRESETS[type], config: { ...(PRESETS[type].config || {}) } },
    };
  }, []);

  const addNodeAtCenter = useCallback(
    (type: NodeKind) => {
      let position = { x: 200 + Math.random() * 120, y: 120 + Math.random() * 120 };
      const wrapper = wrapperRef.current;
      if (rf && wrapper) {
        const rect = wrapper.getBoundingClientRect();
        const center = rf.screenToFlowPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        });
        position = { x: center.x + (Math.random() - 0.5) * 80, y: center.y + (Math.random() - 0.5) * 80 };
      }
      const node = makeNode(type, position);
      setNodes((nds) => nds.concat(node));
      setSelectedNodeId(node.id);
    },
    [rf, makeNode, setNodes]
  );

  const onDragStart = useCallback((event: React.DragEvent, nodeType: NodeKind) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow") as NodeKind;
      if (!type || !rf) return;
      const position = rf.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const node = makeNode(type, position);
      setNodes((nds) => nds.concat(node));
      setSelectedNodeId(node.id);
    },
    [rf, makeNode, setNodes]
  );

  const removeSelected = useCallback(() => {
    if (!selectedNodeId) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
  }, [selectedNodeId, setNodes, setEdges]);

  // Duplica o(s) bloco(s) selecionado(s) — via botão ou Ctrl/Cmd+D.
  const duplicateSelected = useCallback(() => {
    const sel = (nodes as Node<FlowNodeData>[]).filter(
      (n) => (n as any).selected || n.id === selectedNodeId
    );
    if (!sel.length) return;
    const copies = sel.map((orig) => ({
      ...orig,
      id: newId((orig.type as string) || "node"),
      position: { x: orig.position.x + 40, y: orig.position.y + 40 },
      data: { ...orig.data, config: { ...(orig.data.config || {}) } },
      selected: false,
    }));
    setNodes((nds) => nds.map((n) => ({ ...n, selected: false })).concat(copies as any));
    setSelectedNodeId(copies[copies.length - 1].id);
  }, [nodes, selectedNodeId, setNodes]);

  // Remove via tecla Del/Backspace o(s) bloco(s) selecionado(s).
  const deleteViaKey = useCallback(() => {
    const ids = new Set(
      (nodes as Node[])
        .filter((n) => (n as any).selected || n.id === selectedNodeId)
        .map((n) => n.id)
    );
    if (!ids.size) return;
    setNodes((nds) => nds.filter((n) => !ids.has(n.id)));
    setEdges((eds) => eds.filter((e) => !ids.has(e.source) && !ids.has(e.target)));
    setSelectedNodeId((cur) => (cur && ids.has(cur) ? null : cur));
  }, [nodes, selectedNodeId, setNodes, setEdges]);

  // Atalhos de teclado (ignora quando o foco está num campo de texto).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement as HTMLElement | null;
      const typing =
        !!el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT" ||
          el.isContentEditable);
      if (typing) return;
      if ((e.ctrlKey || e.metaKey) && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        duplicateSelected();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteViaKey();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [duplicateSelected, deleteViaKey]);

  const updateSelected = useCallback(
    (patch: Partial<FlowNodeData>) => {
      if (!selectedNodeId) return;
      setNodes((nds) => nds.map((n) => (n.id === selectedNodeId ? { ...n, data: { ...n.data, ...patch } } : n)));
    },
    [selectedNodeId, setNodes]
  );

  const updateSelectedConfig = useCallback(
    (key: string, value: any) => {
      if (!selectedNodeId) return;
      setNodes((nds) =>
        nds.map((n) =>
          n.id === selectedNodeId
            ? { ...n, data: { ...n.data, config: { ...(n.data.config || {}), [key]: value } } }
            : n
        )
      );
    },
    [selectedNodeId, setNodes]
  );

  const focusNodes = useCallback(
    (nodeIds: string[]) => {
      if (!rf) return;
      const targets = (nodes as any).filter((n: Node) => nodeIds.includes(n.id));
      if (!targets.length) return;
      rf.fitView({ nodes: targets, padding: 0.4, duration: 500 });
      setSelectedNodeId(targets[0].id);
    },
    [rf, nodes]
  );

  return (
    <div
      ref={wrapperRef}
      onDrop={onDrop}
      onDragOver={onDragOver}
      className="relative h-full w-full"
    >
      <ReactFlow
        nodes={nodes as any}
        edges={edges}
        nodeTypes={nodeTypes}
        onInit={setRf}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDoubleClick={(_, node) => setSelectedNodeId(node.id)}
        onPaneClick={() => setSelectedNodeId(null)}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.2}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={EDGE_STYLE}
        deleteKeyCode={null}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#3f3f46" />
        <Controls className="!bg-zinc-900 !border-zinc-700 [&>button]:!bg-zinc-800 [&>button]:!border-zinc-700 [&>button:hover]:!bg-zinc-700 [&_svg]:!fill-zinc-200" />
        <MiniMap
          pannable
          zoomable
          className="!bg-zinc-900 !border !border-zinc-700"
          nodeColor={(n) => {
            const map: Record<string, string> = {
              trigger: "#10b981",
              rag: "#0ea5e9",
              llm: "#8b5cf6",
              tool: "#f59e0b",
              action: "#ec4899",
              condition: "#d946ef",
              delay: "#14b8a6",
              human: "#f43f5e",
            };
            return map[(n as any).type] || "#71717a";
          }}
          maskColor="rgba(0,0,0,0.6)"
        />

        {/* Paleta de blocos (flutuante e colapsável) */}
        <Panel position="top-left">
          {paletteOpen ? (
            <div className="w-56 rounded-xl border border-zinc-800 bg-zinc-950/90 p-3 shadow-2xl backdrop-blur">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  <MousePointerClick className="h-3.5 w-3.5" /> Adicionar bloco
                </span>
                <button
                  onClick={() => setPaletteOpen(false)}
                  title="Recolher paleta"
                  className="flex h-6 w-6 items-center justify-center rounded text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
                >
                  <PanelLeftClose className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mb-3 text-[11px] leading-snug text-zinc-500">
                Clique para adicionar (ou arraste). Duplo clique abre as opções.
                <br />Atalhos: <b className="text-zinc-400">Ctrl+D</b> duplica · <b className="text-zinc-400">Del</b> remove.
              </p>
              <div className="max-h-[calc(100vh-16rem)] space-y-1.5 overflow-y-auto pr-1">
                {PALETTE.map(({ type, hint }) => {
                  const s = KIND_STYLES[type];
                  const Icon = s.icon;
                  return (
                    <button
                      key={type}
                      draggable
                      onDragStart={(e) => onDragStart(e, type)}
                      onClick={() => addNodeAtCenter(type)}
                      className="group flex w-full items-center gap-2.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-2 text-left transition-colors hover:border-zinc-600 hover:bg-zinc-800/80 cursor-pointer"
                    >
                      <div className={`flex h-7 w-7 items-center justify-center rounded-md ${s.iconBg}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-zinc-100">{s.label}</div>
                        <div className="truncate text-[10px] text-zinc-500">{hint}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <button
              onClick={() => setPaletteOpen(true)}
              title="Abrir paleta de blocos"
              className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950/90 px-3 py-2 text-xs font-medium text-zinc-200 shadow-2xl backdrop-blur hover:bg-zinc-900"
            >
              <PanelLeftOpen className="h-4 w-4 text-indigo-400" /> Blocos
            </button>
          )}
        </Panel>

        {/* Validação + teste (flutuante e colapsável) */}
        <Panel position="top-right">
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <TestRunDialog nodes={nodes as any} edges={edges} />
              <button
                onClick={() => setValidationOpen((v) => !v)}
                title={validationOpen ? "Recolher" : "Mostrar validação"}
                className="flex h-9 items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950/90 px-2.5 text-xs text-zinc-300 shadow-lg backdrop-blur hover:bg-zinc-900"
              >
                {issues.length === 0 ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                )}
                {issues.length === 0 ? "OK" : issues.length}
              </button>
            </div>
            {validationOpen && (
              <div className="w-60 rounded-xl border border-zinc-800 bg-zinc-950/90 p-3 shadow-2xl backdrop-blur">
                {issues.length === 0 ? (
                  <div className="flex items-center gap-2 text-xs text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" /> Fluxo válido
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-amber-400">
                      <AlertTriangle className="h-4 w-4" /> {issues.length} ponto(s) a ajustar
                    </div>
                    {issues.map((iss, i) => (
                      <button
                        key={i}
                        onClick={() => iss.nodeIds && focusNodes(iss.nodeIds)}
                        className="block w-full rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-1.5 text-left text-[11px] text-zinc-300 hover:border-amber-500/40"
                      >
                        {iss.message}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </Panel>
      </ReactFlow>

      {/* Estado vazio */}
      {nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950/60 px-6 py-4 text-center text-sm text-zinc-400">
            Comece adicionando um <b className="text-emerald-400">Gatilho</b> pela paleta à esquerda.
          </div>
        </div>
      )}

      {/* Painel de propriedades (drawer direito) */}
      {selectedNode && (
        <div className="absolute right-0 top-0 z-20 flex h-full w-80 flex-col border-l border-zinc-800 bg-zinc-950/95 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
            <div className="flex items-center gap-2">
              {(() => {
                const s = KIND_STYLES[selectedNode.data.kind as NodeKind];
                const Icon = s.icon;
                return (
                  <div className={`flex h-7 w-7 items-center justify-center rounded-md ${s.iconBg}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                );
              })()}
              <span className="text-sm font-semibold text-zinc-100">Propriedades</span>
            </div>
            <button
              onClick={() => setSelectedNodeId(null)}
              className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            <div className="space-y-1.5">
              <Label>Título do bloco</Label>
              <Input value={selectedNode.data.title} onChange={(e) => updateSelected({ title: e.target.value })} />
            </div>

            {selectedNode.type === "rag" && (
              <>
                <div className="space-y-1.5">
                  <Label>Base de Conhecimento</Label>
                  <Select
                    value={selectedNode.data.config?.kbId || ""}
                    onValueChange={(v) => updateSelectedConfig("kbId", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma base..." />
                    </SelectTrigger>
                    <SelectContent>
                      {kbOptions.length === 0 ? (
                        <SelectItem value="__none__" disabled>
                          Nenhuma base criada ainda
                        </SelectItem>
                      ) : (
                        kbOptions.map((k) => (
                          <SelectItem key={k.id} value={String(k.id)}>
                            {k.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {ragKbStatus ? (
                    ragKbStatus.indexed === 0 ? (
                      <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] text-amber-300">
                        ⚠ Esta base ainda não foi indexada. Vá em <b>Knowledge Base</b> e clique em indexar.
                      </p>
                    ) : (
                      <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2 text-[11px] text-emerald-300">
                        ✅ Base pronta: {ragKbStatus.indexed} documento(s) indexado(s).
                      </p>
                    )
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <Label>Quantos trechos buscar (Top K)</Label>
                  <Input
                    type="number"
                    value={String(selectedNode.data.config?.topK ?? 5)}
                    onChange={(e) => updateSelectedConfig("topK", Number(e.target.value || 0))}
                  />
                </div>
              </>
            )}

            {selectedNode.type === "llm" && (
              <>
                <div className="space-y-1.5">
                  <Label>Modelo</Label>
                  <Select
                    value={selectedNode.data.config?.model || "gpt-4o-mini"}
                    onValueChange={(v) => updateSelectedConfig("model", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4o-mini">GPT-4o Mini (rápido)</SelectItem>
                      <SelectItem value="gpt-4o">GPT-4o (avançado)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Instrução extra (opcional)</Label>
                  <Input
                    value={selectedNode.data.config?.systemPrompt || ""}
                    onChange={(e) => updateSelectedConfig("systemPrompt", e.target.value)}
                    placeholder="Ex: responda de forma breve"
                  />
                </div>
              </>
            )}

            {selectedNode.type === "trigger" && (
              <>
                <div className="space-y-1.5">
                  <Label>Origem</Label>
                  <Select
                    value={selectedNode.data.config?.source || "whatsapp"}
                    onValueChange={(v) => updateSelectedConfig("source", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="webchat">Chat do site</SelectItem>
                      <SelectItem value="api">API</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Palavra-chave (opcional)</Label>
                  <Input
                    value={selectedNode.data.config?.keyword || ""}
                    onChange={(e) => updateSelectedConfig("keyword", e.target.value)}
                    placeholder="Ex: comprar"
                  />
                </div>
              </>
            )}

            {selectedNode.type === "tool" && (
              <>
                <div className="space-y-1.5">
                  <Label>URL</Label>
                  <Input
                    value={selectedNode.data.config?.url || ""}
                    onChange={(e) => updateSelectedConfig("url", e.target.value)}
                    placeholder="https://api.exemplo.com/..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Método</Label>
                  <Select
                    value={selectedNode.data.config?.method || "GET"}
                    onValueChange={(v) => updateSelectedConfig("method", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                      <SelectItem value="DELETE">DELETE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {selectedNode.type === "action" && (
              <div className="space-y-1.5">
                <Label>Ação</Label>
                <Select
                  value={selectedNode.data.config?.action || "send_message"}
                  onValueChange={(v) => updateSelectedConfig("action", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="send_message">Enviar mensagem</SelectItem>
                    <SelectItem value="handoff_human">Transferir p/ humano</SelectItem>
                    <SelectItem value="create_ticket">Abrir ticket</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedNode.type === "condition" && (
              <div className="space-y-1.5">
                <Label>Condição (se verdadeiro, segue o fluxo)</Label>
                <Input
                  value={selectedNode.data.config?.expression || ""}
                  onChange={(e) => updateSelectedConfig("expression", e.target.value)}
                  placeholder='Ex: mensagem contém "comprar"'
                />
                <p className="text-[11px] text-zinc-500">Descreva em palavras quando este caminho deve ser seguido.</p>
              </div>
            )}

            {selectedNode.type === "delay" && (
              <div className="space-y-1.5">
                <Label>Aguardar (segundos)</Label>
                <Input
                  type="number"
                  value={String(selectedNode.data.config?.seconds ?? 5)}
                  onChange={(e) => updateSelectedConfig("seconds", Number(e.target.value || 0))}
                />
                <p className="text-[11px] text-zinc-500">Pausa antes de continuar (ex.: simular digitação).</p>
              </div>
            )}

            {selectedNode.type === "human" && (
              <div className="space-y-1.5">
                <Label>Setor / departamento</Label>
                <Input
                  value={selectedNode.data.config?.department || ""}
                  onChange={(e) => updateSelectedConfig("department", e.target.value)}
                  placeholder="Ex: Suporte, Financeiro..."
                />
                <p className="text-[11px] text-zinc-500">A conversa é transferida para um atendente humano deste setor.</p>
              </div>
            )}
          </div>

          <div className="flex gap-2 border-t border-zinc-800 p-4">
            <Button variant="outline" className="flex-1 gap-2" onClick={duplicateSelected}>
              <Copy className="h-4 w-4" /> Duplicar
            </Button>
            <Button variant="destructive" className="flex-1 gap-2" onClick={removeSelected}>
              <Trash2 className="h-4 w-4" /> Remover
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
