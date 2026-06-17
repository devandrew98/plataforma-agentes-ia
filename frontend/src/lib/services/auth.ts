"use client";

import { nowIso, readJson, writeJson } from "@/src/lib/storage";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export type SessionUser = {
  userId: string;
  workspaceId: string;
  name: string;
  email: string;
};

export type Session = {
  user: SessionUser;
  token: string;
  createdAt: string;
};

const SESSION_KEY = "saas:session:v2";

type BackendUser = {
  id: number;
  email: string;
  name?: string | null;
  provider?: string;
};

type AuthResponse = {
  access_token: string;
  token_type: string;
  user: BackendUser;
};

function toSession(data: AuthResponse): Session {
  const u = data.user;
  const session: Session = {
    user: {
      userId: `u_${u.id}`,
      workspaceId: `w_${u.id}`,
      name: u.name || u.email.split("@")[0],
      email: u.email,
    },
    token: data.access_token,
    createdAt: nowIso(),
  };
  writeJson(SESSION_KEY, session);
  return session;
}

export function getSession(): Session | null {
  return readJson<Session | null>(SESSION_KEY, null);
}

export function getToken(): string | null {
  return getSession()?.token ?? null;
}

export function requireSession(): Session {
  const s = getSession();
  if (!s) throw new Error("NO_SESSION");
  return s;
}

export function logout() {
  writeJson(SESSION_KEY, null);
}

/**
 * Traduz mensagens de erro do backend para textos amigáveis.
 */
function friendlyError(detail: string | undefined, status: number): string {
  if (detail) {
    if (/já cadastrado/i.test(detail)) return "Esse e-mail já foi cadastrado.";
    if (/inválid/i.test(detail)) return detail;
    if (/senha/i.test(detail)) return detail;
    return detail;
  }
  if (status === 401) return "E-mail ou senha inválidos.";
  return "Não foi possível conectar ao servidor. Verifique se o backend está rodando.";
}

/**
 * Acorda o backend (no plano grátis ele hiberna após ~15 min).
 * Fire-and-forget — chamada ao abrir a tela de login.
 */
export function wakeBackend(): void {
  try {
    fetch(`${API_URL}/health`, { cache: "no-store" }).catch(() => {});
  } catch {
    /* ignore */
  }
}

async function postAuth(path: string, body: unknown): Promise<Session> {
  // O servidor grátis pode levar ~50s para "acordar"; damos até 90s e, se
  // estourar, mostramos uma mensagem clara em vez de carregar para sempre.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90000);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e: any) {
    clearTimeout(timer);
    if (e?.name === "AbortError") {
      throw new Error(
        "O servidor demorou demais para responder (ele estava iniciando). Aguarde alguns segundos e tente novamente."
      );
    }
    throw new Error(
      "Não foi possível conectar ao servidor. Verifique se o backend está rodando em " +
        API_URL +
        "."
    );
  }
  clearTimeout(timer);

  if (!res.ok) {
    let detail: string | undefined;
    try {
      const data = await res.json();
      detail = typeof data?.detail === "string" ? data.detail : undefined;
    } catch {
      /* ignore */
    }
    throw new Error(friendlyError(detail, res.status));
  }

  const data = (await res.json()) as AuthResponse;
  return toSession(data);
}

export async function register(input: {
  name: string;
  email: string;
  password: string;
}): Promise<Session> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (name.length < 2) throw new Error("Nome muito curto (mínimo 2 caracteres).");
  if (!email.includes("@")) throw new Error("E-mail inválido.");
  if (password.length < 4)
    throw new Error("Senha muito curta (mínimo 4 caracteres).");

  return postAuth("/auth/register", { name, email, password });
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<Session> {
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  return postAuth("/auth/login", { email, password });
}

/* ──────────────────────────────────────────────
   Login social (OAuth2)
────────────────────────────────────────────── */

export type OAuthProvider = "google" | "facebook" | "github";

/** URL do backend que inicia o fluxo OAuth do provedor. */
export function oauthLoginUrl(provider: OAuthProvider): string {
  return `${API_URL}/auth/${provider}/login`;
}

/** Consulta quais provedores estão configurados no backend. */
export async function fetchOAuthProviders(): Promise<Record<string, boolean>> {
  try {
    const res = await fetch(`${API_URL}/auth/providers`);
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}

/**
 * Conclui o login social: recebe o token vindo do callback do backend,
 * busca os dados do usuário e grava a sessão.
 */
export async function completeOAuthLogin(token: string): Promise<Session> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new Error("Não foi possível conectar ao servidor.");
  }
  if (!res.ok) {
    throw new Error("Não foi possível concluir o login social.");
  }
  const u = (await res.json()) as BackendUser;
  return toSession({ access_token: token, token_type: "bearer", user: u });
}
