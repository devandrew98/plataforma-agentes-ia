"use client";

import { nowIso, readJson, writeJson } from "@/src/lib/storage";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export type SessionUser = {
  userId: string;
  workspaceId: string;
  name: string;
  email: string;
  emailVerified: boolean;
  isAdmin: boolean;
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
  email_verified?: boolean;
  is_admin?: boolean;
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
      emailVerified: !!u.email_verified,
      isAdmin: !!u.is_admin,
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

/* ──────────────────────────────────────────────
   Verificação de e-mail + redefinição de senha
────────────────────────────────────────────── */

async function readDetail(res: Response, fallback: string): Promise<string> {
  try {
    const j = await res.json();
    if (typeof j?.detail === "string") return j.detail;
    if (typeof j?.message === "string") return j.message;
  } catch {
    /* ignore */
  }
  return fallback;
}

/** Confirma o e-mail a partir do token do link. Atualiza a sessão local. */
export async function verifyEmail(token: string): Promise<void> {
  const res = await fetch(`${API_URL}/auth/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) {
    throw new Error(await readDetail(res, "Não foi possível confirmar o e-mail."));
  }
  // Se houver sessão ativa, marca como verificada na hora.
  const s = getSession();
  if (s) {
    s.user.emailVerified = true;
    writeJson(SESSION_KEY, s);
  }
}

/** Reenvia o e-mail de confirmação para o usuário logado. */
export async function resendVerification(): Promise<string> {
  const token = getToken();
  const res = await fetch(`${API_URL}/auth/resend-verification`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    throw new Error(await readDetail(res, "Não foi possível reenviar o e-mail."));
  }
  return readDetail(res, "E-mail de confirmação reenviado.");
}

/** Solicita o e-mail de redefinição de senha. Resposta sempre genérica. */
export async function forgotPassword(email: string): Promise<string> {
  const res = await fetch(`${API_URL}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
  if (!res.ok) {
    throw new Error(await readDetail(res, "Não foi possível enviar o e-mail."));
  }
  return readDetail(
    res,
    "Se houver uma conta com esse e-mail, enviamos um link de redefinição."
  );
}

/** Conclui a redefinição de senha e já autentica o usuário. */
export async function resetPassword(token: string, password: string): Promise<Session> {
  const res = await fetch(`${API_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });
  if (!res.ok) {
    throw new Error(await readDetail(res, "Não foi possível redefinir a senha."));
  }
  const data = (await res.json()) as AuthResponse;
  return toSession(data);
}

/** Revalida a sessão contra o backend (atualiza emailVerified/nome). */
export async function refreshSession(): Promise<Session | null> {
  const s = getSession();
  if (!s) return null;
  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${s.token}` },
      cache: "no-store",
    });
    if (!res.ok) return s;
    const u = (await res.json()) as BackendUser;
    s.user.emailVerified = !!u.email_verified;
    s.user.isAdmin = !!u.is_admin;
    if (u.name) s.user.name = u.name;
    writeJson(SESSION_KEY, s);
    return s;
  } catch {
    return s;
  }
}
