"use client";

import { getToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export type Profile = {
  id: number;
  email: string;
  name?: string | null;
  company?: string | null;
  phone?: string | null;
  provider: string;
  has_openai_key: boolean;
  is_admin?: boolean;
  created_at?: string;
};

function authHeaders(json = true): Record<string, string> {
  const headers: Record<string, string> = {};
  if (json) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function handle(res: Response): Promise<Profile> {
  if (!res.ok) {
    let detail = "Erro na requisição.";
    try {
      const d = await res.json();
      if (typeof d?.detail === "string") detail = d.detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return res.json();
}

export async function getMe(): Promise<Profile> {
  return handle(await fetch(`${API_URL}/auth/me`, { headers: authHeaders(false), cache: "no-store" }));
}

export async function updateProfile(input: {
  name?: string;
  company?: string;
  phone?: string;
}): Promise<Profile> {
  return handle(
    await fetch(`${API_URL}/auth/profile`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(input),
    })
  );
}

export async function setApiKey(provider: string, apiKey: string): Promise<Profile> {
  return handle(
    await fetch(`${API_URL}/auth/api-key`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ provider, api_key: apiKey }),
    })
  );
}

export async function removeApiKey(): Promise<Profile> {
  return handle(await fetch(`${API_URL}/auth/api-key`, { method: "DELETE", headers: authHeaders(false) }));
}
