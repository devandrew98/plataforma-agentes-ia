"use client";

import { getToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export type CheckoutResult = {
  configured: boolean;
  checkout_url?: string;
  message?: string;
};

/**
 * Inicia o checkout de um plano. Se o gateway de pagamento ainda não estiver
 * configurado no backend, retorna configured=false com uma mensagem.
 */
export async function startCheckout(plan: string): Promise<CheckoutResult> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/billing/checkout`, {
    method: "POST",
    headers,
    body: JSON.stringify({ plan }),
  });

  if (!res.ok) {
    throw new Error("Não foi possível iniciar o checkout.");
  }
  return res.json();
}
