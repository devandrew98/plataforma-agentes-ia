"use client";

import { getSession } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export type Conversation = {
  id: number;
  agent_id: number;
  title?: string | null;
  created_at?: string;
};

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type ChatResponse = {
  agent_id: number;
  conversation_id: number;
  answer: string;
  sources?: any[];
  memory_used?: boolean;
  memory_limit?: number;
};

function normalizeConversation(item: any): Conversation {
  return {
    id: Number(item.id),
    agent_id: Number(item.agent_id ?? item.agentId ?? 0),
    title: item.title ?? null,
    created_at: item.created_at ?? item.createdAt,
  };
}

async function tryFetch(urls: string[], init?: RequestInit): Promise<Response> {
  const session = getSession();
  const headers = {
    ...(init?.headers || {}),
  } as Record<string, string>;

  if (session?.token) {
    headers["Authorization"] = `Bearer ${session.token}`;
  }
  if (session?.user?.email) {
    headers["X-User-Email"] = session.user.email;
  }

  const newInit = {
    ...init,
    headers,
  };

  let lastResponse: Response | null = null;
  let lastError: unknown = null;

  for (const url of urls) {
    try {
      const res = await fetch(url, newInit);
      if (res.ok) return res;
      lastResponse = res;
    } catch (err) {
      lastError = err;
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError ?? new Error("Falha na requisição.");
}

export async function createConversation(
  agentId: string | number,
  title?: string
): Promise<Conversation | null> {
  const body = JSON.stringify({
    title: title || null,
  });

  const res = await tryFetch(
    [
      `${API_URL}/agents/${agentId}/conversations`,
      `${API_URL}/agents/${agentId}/conversations/`,
      `${API_URL}/conversations`,
      `${API_URL}/conversations/`,
    ],
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
    }
  );

  if (res.status === 404) return null;

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "Erro ao criar conversa.");
  }

  const data = await res.json();
  return normalizeConversation(data);
}

export async function listConversations(
  agentId: string | number
): Promise<Conversation[]> {
  const res = await tryFetch(
    [
      `${API_URL}/agents/${agentId}/conversations`,
      `${API_URL}/agents/${agentId}/conversations/`,
      `${API_URL}/conversations?agent_id=${agentId}`,
      `${API_URL}/conversations/?agent_id=${agentId}`,
    ],
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );

  if (res.status === 404) {
    return [];
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "Erro ao listar conversas.");
  }

  const data = await res.json();
  return Array.isArray(data) ? data.map(normalizeConversation) : [];
}

export async function sendAgentMessage(input: {
  agentId: string | number;
  conversationId?: string | number | null;
  message: string;
  history?: ChatMessage[];
  useMemory?: boolean;
  memoryLimit?: number;
}): Promise<ChatResponse> {
  const payload = {
    conversation_id: input.conversationId ?? null,
    message: input.message,
    history: input.history || [],
    use_memory: input.useMemory ?? true,
    memory_limit: input.memoryLimit ?? 10,
  };

  const res = await tryFetch(
    [
      `${API_URL}/agents/${input.agentId}/chat`,
      `${API_URL}/agents/${input.agentId}/chat/`,
    ],
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "Erro ao enviar mensagem.");
  }

  return res.json();
}

export async function getConversationMemory(
  conversationId: string | number
): Promise<ChatMessage[]> {
  const res = await tryFetch(
    [
      `${API_URL}/conversations/${conversationId}/memory`,
      `${API_URL}/conversations/${conversationId}/memory/`,
    ],
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );

  if (res.status === 404) {
    return [];
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "Erro ao carregar memória da conversa.");
  }

  const data = await res.json();

  return Array.isArray(data)
    ? data.map((m) => ({
        role: m.role,
        content: m.content,
      }))
    : [];
}

export async function clearConversationMemory(
  conversationId: string | number
) {
  const res = await tryFetch(
    [
      `${API_URL}/conversations/${conversationId}/memory`,
      `${API_URL}/conversations/${conversationId}/memory/`,
    ],
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (res.status === 404) {
    return { cleared: true };
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "Erro ao limpar memória.");
  }

  return res.json();
}