"use client";

import { useMemo, useState } from "react";
import { Edge, Node } from "reactflow";

import { countKbDocsByStatus } from "@/src/lib/services/kb";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

type NodeType = "trigger" | "llm" | "tool" | "action" | "rag";

type FlowNodeData = {
  title: string;
  subtitle?: string;
  kind: NodeType;
  config?: Record<string, any>;
};

type RunLogItem = {
  at: string;
  nodeId: string;
  nodeType: string;
  title: string;
  message: string;
  level: "info" | "warn" | "error" | "success";
};

function nowTime() {
  return new Date().toLocaleTimeString("pt-BR");
}

function buildAdj(edges: Edge[]) {
  const out = new Map<string, string[]>();
  for (const e of edges) {
    if (!out.has(e.source)) out.set(e.source, []);
    out.get(e.source)!.push(e.target);
  }
  return out;
}

function safeStr(v: any) {
  try {
    if (typeof v === "string") return v;
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

async function simulateRun(
  nodes: Node<FlowNodeData>[],
  edges: Edge[],
  userMessage: string
): Promise<{ logs: RunLogItem[]; finalOutput: string }> {
  const logs: RunLogItem[] = [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const out = buildAdj(edges);

  const triggers = nodes.filter((n) => n.type === "trigger");
  if (triggers.length === 0) {
    logs.push({
      at: nowTime(),
      nodeId: "-",
      nodeType: "system",
      title: "Validação",
      message: "Nenhum Trigger encontrado. Adicione pelo menos 1 Trigger.",
      level: "error",
    });
    return { logs, finalOutput: "" };
  }

  let ragContext = "";
  let llmOutput = "";

  const stack = new Set<string>();

  async function walk(nodeId: string): Promise<void> {
    if (stack.has(nodeId)) {
      logs.push({
        at: nowTime(),
        nodeId,
        nodeType: "system",
        title: "Ciclo detectado",
        message: "O fluxo tem um loop. Execução interrompida.",
        level: "error",
      });
      return;
    }

    const node = byId.get(nodeId);
    if (!node) return;

    stack.add(nodeId);

    const title = node.data?.title || nodeId;
    const cfg = node.data?.config || {};

    if (node.type === "trigger") {
      logs.push({
        at: nowTime(),
        nodeId,
        nodeType: "trigger",
        title,
        message: `Recebido input: "${userMessage}"`,
        level: "info",
      });
    }

    if (node.type === "rag") {
      const kbId = String(cfg.kbId || "");

      if (!kbId) {
        logs.push({
          at: nowTime(),
          nodeId,
          nodeType: "rag",
          title,
          message: "Nenhuma KB selecionada. RAG executou sem contexto.",
          level: "warn",
        });
        ragContext = "";
      } else {
        const counts = await countKbDocsByStatus(kbId);

        if (counts.indexed === 0) {
          logs.push({
            at: nowTime(),
            nodeId,
            nodeType: "rag",
            title,
            message: `KB "${kbId}" sem docs indexed. RAG executou sem contexto.`,
            level: "warn",
          });
          ragContext = "";
        } else {
          const topK = Number(cfg.topK ?? 5);
          const qt = String(cfg.queryTemplate || "{user_message}");
          const query = qt.replaceAll("{user_message}", userMessage);

          ragContext =
            `KB=${kbId} | indexed=${counts.indexed} | topK=${topK}\n` +
            `query="${query}"\n` +
            `context(simulado): Trechos relevantes retornados do vector DB...`;

          logs.push({
            at: nowTime(),
            nodeId,
            nodeType: "rag",
            title,
            message: "Contexto encontrado (simulado).",
            level: "success",
          });
        }
      }
    }

    if (node.type === "tool") {
      const url = String(cfg.url || "");
      const method = String(cfg.method || "GET");

      logs.push({
        at: nowTime(),
        nodeId,
        nodeType: "tool",
        title,
        message: `Chamaria Tool: ${method} ${url || "(sem URL)"}`,
        level: url ? "info" : "warn",
      });
    }

    if (node.type === "llm") {
      const model = String(cfg.model || "gpt-4o-mini");
      const system = String(cfg.systemPrompt || "");

      llmOutput =
        `Model: ${model}\n` +
        (system ? `System: ${system}\n\n` : "") +
        `User: ${userMessage}\n\n` +
        (ragContext ? `Context:\n${ragContext}\n\n` : "") +
        `Resposta (simulada): Entendi! Vou te ajudar com isso. Aqui está uma resposta baseada no contexto disponível...`;

      logs.push({
        at: nowTime(),
        nodeId,
        nodeType: "llm",
        title,
        message: "LLM gerou resposta (simulada).",
        level: "success",
      });
    }

    if (node.type === "action") {
      const action = String(cfg.action || "send_message");

      logs.push({
        at: nowTime(),
        nodeId,
        nodeType: "action",
        title,
        message: `Executaria action "${action}" com a resposta final.`,
        level: "success",
      });
    }

    const next = out.get(nodeId) || [];
    for (const n of next) {
      await walk(n);
    }

    stack.delete(nodeId);
  }

  for (const t of triggers) {
    await walk(t.id);
  }

  const finalOutput = llmOutput || (ragContext ? ragContext : "");

  if (!finalOutput) {
    logs.push({
      at: nowTime(),
      nodeId: "-",
      nodeType: "system",
      title: "Saída",
      message: "Nenhuma saída final foi gerada (faltou LLM/Action no caminho).",
      level: "warn",
    });
  }

  return { logs, finalOutput };
}

export default function TestRunDialog({
  nodes,
  edges,
}: {
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
}) {
  const [open, setOpen] = useState(false);
  const [userMessage, setUserMessage] = useState("Olá! Quero um orçamento.");
  const [logs, setLogs] = useState<RunLogItem[]>([]);
  const [finalOutput, setFinalOutput] = useState("");
  const [running, setRunning] = useState(false);

  const canRun = useMemo(() => userMessage.trim().length > 0, [userMessage]);

  async function run() {
    if (!canRun) return;

    try {
      setRunning(true);
      const res = await simulateRun(nodes, edges, userMessage.trim());
      setLogs(res.logs);
      setFinalOutput(res.finalOutput);
    } finally {
      setRunning(false);
    }
  }

  function clear() {
    setLogs([]);
    setFinalOutput("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Testar</Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Run / Test do Fluxo</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <div className="text-sm font-medium">Mensagem de teste</div>
            <Textarea
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              placeholder="Digite a mensagem do usuário..."
            />
            <div className="flex gap-2">
              <Button onClick={run} disabled={!canRun || running}>
                {running ? "Rodando..." : "Rodar teste"}
              </Button>
              <Button variant="outline" onClick={clear} disabled={running}>
                Limpar
              </Button>
            </div>
          </div>

          <Separator />

          <div className="grid gap-3">
            <div className="text-sm font-medium">Log</div>

            <div className="max-h-64 overflow-auto rounded-lg border p-3 text-sm">
              {logs.length === 0 ? (
                <div className="text-muted-foreground">
                  Rode um teste para ver o log.
                </div>
              ) : (
                <div className="space-y-2">
                  {logs.map((l, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="w-[78px] shrink-0 text-muted-foreground">
                        {l.at}
                      </span>
                      <span className="w-[70px] shrink-0 font-medium">
                        {l.nodeType}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="font-medium">{l.title}:</span>{" "}
                        {l.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="text-sm font-medium">Saída final</div>
            <div className="max-h-64 overflow-auto rounded-lg border p-3 text-sm">
              {finalOutput ? (
                <pre className="whitespace-pre-wrap">{safeStr(finalOutput)}</pre>
              ) : (
                <div className="text-muted-foreground">
                  Nenhuma saída ainda.
                </div>
              )}
            </div>

            <div className="text-xs text-muted-foreground">
              *Isso é simulação no frontend. Depois trocamos para execução real via FastAPI.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}