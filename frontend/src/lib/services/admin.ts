"use client";

import { getToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export type AdminStats = {
  users: number;
  agents: number;
  active_agents: number;
  knowledge_bases: number;
  integrations: number;
  pending_requests: number;
  total_conversations?: number;
  total_messages?: number;
};

export type AdminAgent = {
  id: number;
  name: string;
  status: string;
  provider: string;
  model: string;
  owner_email?: string | null;
  messages: number;
};

export type AdminUser = {
  id: number;
  email: string;
  name?: string | null;
  company?: string | null;
  provider: string;
  agents: number;
  has_own_key: boolean;
  created_at?: string;
};

export type AdminRequest = {
  id: number;
  user_email: string;
  channel: string;
  message: string;
  status: string;
  created_at?: string;
};

function headers(json = false): Record<string, string> {
  const h: Record<string, string> = {};
  if (json) h["Content-Type"] = "application/json";
  const token = getToken();
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

export async function getStats(): Promise<AdminStats> {
  const res = await fetch(`${API_URL}/admin/stats`, { headers: headers(), cache: "no-store" });
  if (!res.ok) throw new Error("forbidden");
  return res.json();
}

export async function getUsers(): Promise<AdminUser[]> {
  const res = await fetch(`${API_URL}/admin/users`, { headers: headers(), cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

export async function getRequests(): Promise<AdminRequest[]> {
  const res = await fetch(`${API_URL}/admin/requests`, { headers: headers(), cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

export async function updateRequestStatus(id: number, status: string): Promise<void> {
  await fetch(`${API_URL}/admin/requests/${id}`, {
    method: "PATCH",
    headers: headers(true),
    body: JSON.stringify({ status }),
  });
}

export async function getAllAgents(): Promise<AdminAgent[]> {
  const res = await fetch(`${API_URL}/admin/agents`, { headers: headers(), cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

export async function deleteUser(id: number): Promise<boolean> {
  const res = await fetch(`${API_URL}/admin/users/${id}`, {
    method: "DELETE",
    headers: headers(),
  });
  return res.ok;
}
