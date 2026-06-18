"use client";

import { getSession } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export interface MetricsOverview {
  agents: number;
  active_agents: number;
  conversations: number;
  messages: number;
  user_messages: number;
  integrations: number;
}

function getHeaders(): Record<string, string> {
  const session = getSession();
  const headers: Record<string, string> = {};
  if (session?.token) headers["Authorization"] = `Bearer ${session.token}`;
  if (session?.user?.email) headers["X-User-Email"] = session.user.email;
  return headers;
}

/** Resumo numérico para os cards do dashboard. Retorna null em caso de erro. */
export async function getMetricsOverview(): Promise<MetricsOverview | null> {
  try {
    const res = await fetch(`${API_URL}/metrics/overview`, {
      headers: getHeaders(),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as MetricsOverview;
  } catch {
    return null;
  }
}
