"use client";

import { Edge, Node } from "reactflow";
import { getSession } from "./auth";

export type AgenteStatus = "draft" | "active" | "paused";

export type KnowledgeMode = "none" | "rag" | "web";
// rag/web são flags independentes (pode usar os dois). `mode` fica só para
// compatibilidade com agentes salvos no formato antigo.
export type AgentKnowledge = {
  rag?: boolean;
  web?: boolean;
  kbId?: string | null;
  mode?: KnowledgeMode;
};

export interface Agente {
  id: number;
  name: string;
  description?: string;
  provider?: string;
  model?: string;
  system_prompt?: string;
  status: AgenteStatus;
  flow: { nodes: Node[]; edges: Edge[]; knowledge?: AgentKnowledge };
  created_at?: string;
  updated_at?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

function getHeaders(): Record<string, string> {
  const session = getSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (session?.token) {
    headers["Authorization"] = `Bearer ${session.token}`;
  }
  if (session?.user?.email) {
    headers["X-User-Email"] = session.user.email;
  }
  return headers;
}

function normalizeFlow(flow: any) {
  if (!flow || typeof flow !== "object") {
    return { nodes: [], edges: [] };
  }

  return {
    nodes: Array.isArray(flow.nodes) ? flow.nodes : [],
    edges: Array.isArray(flow.edges) ? flow.edges : [],
    knowledge:
      flow.knowledge && typeof flow.knowledge === "object" ? flow.knowledge : undefined,
  };
}

function normalizeAgent(agent: any): Agente {
  return {
    id: Number(agent.id),
    name: agent.name ?? "",
    description: agent.description ?? "",
    provider: agent.provider ?? "openai",
    model: agent.model ?? "gpt-4o-mini",
    system_prompt: agent.system_prompt ?? "Você é um assistente útil.",
    status: (agent.status ?? "draft") as AgenteStatus,
    flow: normalizeFlow(agent.flow),
    created_at: agent.created_at,
    updated_at: agent.updated_at,
  };
}

export async function listAgents(): Promise<Agente[]> {
  const res = await fetch(`${API_URL}/agents/`, {
    method: "GET",
    headers: getHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Erro ao listar agentes.");
  }

  const data = await res.json();
  return Array.isArray(data) ? data.map(normalizeAgent) : [];
}

export async function getAgent(id: string | number): Promise<Agente | null> {
  const res = await fetch(`${API_URL}/agents/${id}`, {
    method: "GET",
    headers: getHeaders(),
    cache: "no-store",
  });

  if (res.status === 404) return null;

  if (!res.ok) {
    throw new Error("Erro ao buscar agente.");
  }

  const data = await res.json();
  return normalizeAgent(data);
}

export async function createAgent(input: {
  name: string;
  description?: string;
  provider?: string;
  model?: string;
  system_prompt?: string;
  status?: AgenteStatus;
  flow?: { nodes: Node[]; edges: Edge[]; knowledge?: AgentKnowledge };
}): Promise<Agente> {
  const payload = {
    name: input.name.trim(),
    description: input.description?.trim() || "",
    provider: input.provider || "openai",
    model: input.model || "gpt-4o-mini",
    system_prompt: input.system_prompt || "Você é um assistente útil.",
    status: input.status || "draft",
    flow: {
      nodes: input.flow?.nodes || [],
      edges: input.flow?.edges || [],
      knowledge: input.flow?.knowledge,
    },
  };

  const res = await fetch(`${API_URL}/agents/`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    // Extrai a mensagem amigável do backend (ex.: bloqueio por e-mail não confirmado).
    let detail = "Erro ao criar agente.";
    try {
      const j = await res.json();
      if (typeof j?.detail === "string") detail = j.detail;
    } catch {
      /* resposta sem JSON */
    }
    throw new Error(detail);
  }

  const data = await res.json();
  return normalizeAgent(data);
}

export async function updateAgent(
  id: string | number,
  patch: Partial<Pick<Agente, "name" | "description" | "provider" | "model" | "system_prompt" | "status" | "flow">>
): Promise<Agente | null> {
  const payload = {
    name: patch.name,
    description: patch.description,
    provider: patch.provider,
    model: patch.model,
    system_prompt: patch.system_prompt,
    status: patch.status,
    flow: patch.flow
      ? {
          nodes: patch.flow.nodes || [],
          edges: patch.flow.edges || [],
          knowledge: patch.flow.knowledge,
        }
      : undefined,
  };

  const res = await fetch(`${API_URL}/agents/${id}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });

  if (res.status === 404) return null;

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "Erro ao atualizar agente.");
  }

  const data = await res.json();
  return normalizeAgent(data);
}

export async function deleteAgent(id: string | number): Promise<void> {
  const res = await fetch(`${API_URL}/agents/${id}`, {
    method: "DELETE",
    headers: getHeaders(),
  });

  if (!res.ok) {
    throw new Error("Erro ao excluir agente.");
  }
}