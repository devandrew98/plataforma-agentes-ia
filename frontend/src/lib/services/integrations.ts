"use client";

import { getToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export type Integration = {
  id: number;
  channel: string;
  status: string;
  agent_id?: number | null;
};

export type IntegrationRequest = {
  id: number;
  user_email: string;
  channel: string;
  message: string;
  status: string;
  created_at?: string;
};

function headers(json = true): Record<string, string> {
  const h: Record<string, string> = {};
  if (json) h["Content-Type"] = "application/json";
  const token = getToken();
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

export async function listIntegrations(): Promise<Integration[]> {
  const res = await fetch(`${API_URL}/integrations/`, { headers: headers(false), cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

export async function connectWhatsapp(input: {
  agent_id: number;
  phone_number_id: string;
  access_token: string;
  verify_token: string;
}): Promise<Integration> {
  const res = await fetch(`${API_URL}/integrations/whatsapp`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || "Erro ao conectar WhatsApp.");
  }
  return res.json();
}

export async function deleteIntegration(id: number): Promise<void> {
  await fetch(`${API_URL}/integrations/${id}`, { method: "DELETE", headers: headers(false) });
}

export async function createIntegrationRequest(channel: string, message: string): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}/integrations/requests`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ channel, message }),
  });
  if (!res.ok) throw new Error("Erro ao enviar solicitação.");
  return res.json();
}

export async function listIntegrationRequests(): Promise<{ is_admin: boolean; requests: IntegrationRequest[] }> {
  const res = await fetch(`${API_URL}/integrations/requests`, { headers: headers(false), cache: "no-store" });
  if (!res.ok) return { is_admin: false, requests: [] };
  return res.json();
}
