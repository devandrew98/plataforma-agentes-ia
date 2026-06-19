"use client";

import { Handle, Position } from "reactflow";
import { Zap, BookOpen, Sparkles, Wrench, Send, GitBranch, Clock, Headset } from "lucide-react";

export type NodeKind = "trigger" | "action" | "llm" | "tool" | "rag" | "condition" | "delay" | "human";

type NodeData = {
  title: string;
  subtitle?: string;
  kind: NodeKind;
  config?: Record<string, any>;
};

type KindStyle = {
  label: string;
  icon: React.ElementType;
  ring: string; // borda
  iconBg: string; // fundo do ícone
  badge: string; // cor do badge
  handle: string; // cor dos pontos de conexão
  hasTarget: boolean;
  hasSource: boolean;
};

export const KIND_STYLES: Record<NodeKind, KindStyle> = {
  trigger: {
    label: "Gatilho",
    icon: Zap,
    ring: "border-emerald-500/50 hover:border-emerald-400",
    iconBg: "bg-emerald-500/15 text-emerald-400",
    badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    handle: "!bg-emerald-400",
    hasTarget: false,
    hasSource: true,
  },
  rag: {
    label: "Base (RAG)",
    icon: BookOpen,
    ring: "border-sky-500/50 hover:border-sky-400",
    iconBg: "bg-sky-500/15 text-sky-400",
    badge: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    handle: "!bg-sky-400",
    hasTarget: true,
    hasSource: true,
  },
  llm: {
    label: "IA (LLM)",
    icon: Sparkles,
    ring: "border-violet-500/50 hover:border-violet-400",
    iconBg: "bg-violet-500/15 text-violet-400",
    badge: "bg-violet-500/15 text-violet-300 border-violet-500/30",
    handle: "!bg-violet-400",
    hasTarget: true,
    hasSource: true,
  },
  tool: {
    label: "Ferramenta",
    icon: Wrench,
    ring: "border-amber-500/50 hover:border-amber-400",
    iconBg: "bg-amber-500/15 text-amber-400",
    badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    handle: "!bg-amber-400",
    hasTarget: true,
    hasSource: true,
  },
  action: {
    label: "Ação",
    icon: Send,
    ring: "border-pink-500/50 hover:border-pink-400",
    iconBg: "bg-pink-500/15 text-pink-400",
    badge: "bg-pink-500/15 text-pink-300 border-pink-500/30",
    handle: "!bg-pink-400",
    hasTarget: true,
    hasSource: false,
  },
  condition: {
    label: "Condição",
    icon: GitBranch,
    ring: "border-fuchsia-500/50 hover:border-fuchsia-400",
    iconBg: "bg-fuchsia-500/15 text-fuchsia-400",
    badge: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
    handle: "!bg-fuchsia-400",
    hasTarget: true,
    hasSource: true,
  },
  delay: {
    label: "Espera",
    icon: Clock,
    ring: "border-teal-500/50 hover:border-teal-400",
    iconBg: "bg-teal-500/15 text-teal-400",
    badge: "bg-teal-500/15 text-teal-300 border-teal-500/30",
    handle: "!bg-teal-400",
    hasTarget: true,
    hasSource: true,
  },
  human: {
    label: "Atendente humano",
    icon: Headset,
    ring: "border-rose-500/50 hover:border-rose-400",
    iconBg: "bg-rose-500/15 text-rose-400",
    badge: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    handle: "!bg-rose-400",
    hasTarget: true,
    hasSource: false,
  },
};

function configSummary(data: NodeData): string {
  const c = data.config || {};
  switch (data.kind) {
    case "trigger":
      return c.source ? `Origem: ${c.source}` : "Configure a origem";
    case "rag":
      return c.kbId ? `Base #${c.kbId} · top ${c.topK ?? 5}` : "Selecione uma base";
    case "llm":
      return c.model ? `Modelo: ${c.model}` : "Defina o modelo";
    case "tool":
      return c.url ? `${c.method || "GET"} ${c.url}` : "Configure a chamada";
    case "action":
      return c.action ? `Ação: ${c.action}` : "Defina a ação";
    case "condition":
      return c.expression ? `Se: ${c.expression}` : "Defina a condição";
    case "delay":
      return `Aguardar ${c.seconds ?? 5}s`;
    case "human":
      return c.department ? `Setor: ${c.department}` : "Transferir p/ humano";
    default:
      return "";
  }
}

const handleClass =
  "!w-4 !h-4 !border-2 !border-zinc-950 !cursor-crosshair transition-transform hover:!scale-125";

function NodeShell({ data, selected }: { data: NodeData; selected?: boolean }) {
  const style = KIND_STYLES[data.kind] || KIND_STYLES.llm;
  const Icon = style.icon;

  return (
    <div
      className={`w-[210px] rounded-xl border-2 bg-zinc-900/95 shadow-lg backdrop-blur transition-colors ${
        style.ring
      } ${selected ? "ring-2 ring-white/40" : ""}`}
    >
      {style.hasTarget && (
        <Handle type="target" position={Position.Left} className={`${handleClass} ${style.handle}`} />
      )}

      <div className="flex items-center gap-2.5 px-3 pt-3">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${style.iconBg}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-zinc-100">{data.title}</div>
          <span
            className={`mt-0.5 inline-block rounded border px-1.5 py-px text-[10px] font-medium ${style.badge}`}
          >
            {style.label}
          </span>
        </div>
      </div>

      <div className="px-3 pb-3 pt-2">
        <div className="truncate rounded-md bg-zinc-950/60 px-2 py-1.5 text-[11px] text-zinc-400">
          {configSummary(data)}
        </div>
      </div>

      {style.hasSource && (
        <Handle type="source" position={Position.Right} className={`${handleClass} ${style.handle}`} />
      )}
    </div>
  );
}

export function TriggerNode(props: any) {
  return <NodeShell data={props.data} selected={props.selected} />;
}
export function LlmNode(props: any) {
  return <NodeShell data={props.data} selected={props.selected} />;
}
export function ActionNode(props: any) {
  return <NodeShell data={props.data} selected={props.selected} />;
}
export function ToolNode(props: any) {
  return <NodeShell data={props.data} selected={props.selected} />;
}
export function RagNode(props: any) {
  return <NodeShell data={props.data} selected={props.selected} />;
}
export function ConditionNode(props: any) {
  return <NodeShell data={props.data} selected={props.selected} />;
}
export function DelayNode(props: any) {
  return <NodeShell data={props.data} selected={props.selected} />;
}
export function HumanNode(props: any) {
  return <NodeShell data={props.data} selected={props.selected} />;
}

export const nodeTypes = {
  trigger: TriggerNode,
  llm: LlmNode,
  action: ActionNode,
  tool: ToolNode,
  rag: RagNode,
  condition: ConditionNode,
  delay: DelayNode,
  human: HumanNode,
};
