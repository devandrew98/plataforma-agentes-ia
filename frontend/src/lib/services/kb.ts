"use client";

import { getSession } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

function getHeaders(isMultipart = false): Record<string, string> {
  const session = getSession();
  const headers: Record<string, string> = {};
  if (!isMultipart) {
    headers["Content-Type"] = "application/json";
  }
  if (session?.token) {
    headers["Authorization"] = `Bearer ${session.token}`;
  }
  if (session?.user?.email) {
    headers["X-User-Email"] = session.user.email;
  }
  return headers;
}

export type KbDocStatus = "uploaded" | "indexed" | "failed";

export type KbDoc = {
  id: string;
  kbId: string;
  title: string;
  content: string;
  status: KbDocStatus;
  createdAt: string;
  updatedAt: string;
};

export type KB = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeBase = KB;

/* =========================
   NORMALIZERS
========================= */

function normalizeKb(item: any): KB {
  return {
    id: String(item.id),
    name: item.name ?? "",
    description: item.description ?? "",
    createdAt: item.created_at ?? item.createdAt ?? "",
    updatedAt: item.updated_at ?? item.updatedAt ?? "",
  };
}

function normalizeKbDoc(item: any): KbDoc {
  return {
    id: String(item.id),
    kbId: String(item.kb_id),
    title: item.filename ?? "",
    content: item.content ?? "",
    status: (item.status ?? "uploaded") as KbDocStatus,
    createdAt: item.created_at ?? "",
    updatedAt: item.updated_at ?? "",
  };
}

/* =========================
   KB -> BACKEND API
========================= */

export async function listKbs(): Promise<KB[]> {
  const res = await fetch(`${API_URL}/kb/`, {
    method: "GET",
    headers: getHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Erro ao listar KBs.");
  }

  const data = await res.json();
  return Array.isArray(data) ? data.map(normalizeKb) : [];
}

export async function listKnowledgeBases(): Promise<KB[]> {
  return listKbs();
}

export async function getKb(id: string): Promise<KB | null> {
  const all = await listKbs();
  return all.find((k) => String(k.id) === String(id)) ?? null;
}

export async function getKnowledgeBase(id: string): Promise<KB | null> {
  return getKb(id);
}

export async function createKB(input: {
  name: string;
  description?: string;
}): Promise<KB> {
  const res = await fetch(`${API_URL}/kb/`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      name: input.name.trim(),
      description: input.description?.trim() || "",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "Erro ao criar KB.");
  }

  const data = await res.json();
  return normalizeKb(data);
}

export async function createKnowledgeBase(input: {
  name: string;
  description?: string;
}): Promise<KB> {
  return createKB(input);
}

export async function deleteKB(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/kb/${id}`, {
    method: "DELETE",
    headers: getHeaders(),
  });

  if (!res.ok) {
    throw new Error("Erro ao excluir KB.");
  }
}

export async function deleteKnowledgeBase(id: string): Promise<void> {
  return deleteKB(id);
}

/* =========================
   DOCS -> BACKEND API
========================= */

export async function listKbDocs(kbId: string): Promise<KbDoc[]> {
  const res = await fetch(`${API_URL}/kb/${kbId}/documents`, {
    method: "GET",
    headers: getHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Erro ao listar documentos da KB.");
  }

  const data = await res.json();
  return Array.isArray(data) ? data.map(normalizeKbDoc) : [];
}

/**
 * Envia um arquivo do disco (txt, pdf, md, csv...) direto para o backend,
 * que extrai o texto. Mais confiável que ler no navegador (funciona com PDF).
 */
export async function uploadKbFile(kbId: string, file: File): Promise<KbDoc> {
  const formData = new FormData();
  formData.append("file", file, file.name);

  const res = await fetch(`${API_URL}/kb/${kbId}/upload`, {
    method: "POST",
    headers: getHeaders(true),
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "Erro ao enviar arquivo.");
  }

  const data = await res.json();
  return normalizeKbDoc(data);
}

export async function addKbDoc(input: {
  kbId: string;
  title: string;
  content: string;
}): Promise<KbDoc> {
  const formData = new FormData();
  const blob = new Blob([input.content], { type: "text/plain" });
  const fileName = input.title.toLowerCase().endsWith(".txt")
    ? input.title
    : `${input.title}.txt`;

  formData.append("file", blob, fileName);

  const res = await fetch(`${API_URL}/kb/${input.kbId}/upload`, {
    method: "POST",
    headers: getHeaders(true),
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "Erro ao adicionar documento.");
  }

  const data = await res.json();
  return normalizeKbDoc(data);
}

export async function deleteKbDoc(kbId: string, docId: string): Promise<void> {
  const res = await fetch(`${API_URL}/kb/${kbId}/documents/${docId}`, {
    method: "DELETE",
    headers: getHeaders(),
  });

  if (!res.ok) {
    throw new Error("Erro ao excluir documento.");
  }
}

export async function indexKB(kbId: string): Promise<void> {
  const res = await fetch(`${API_URL}/kb/${kbId}/index`, {
    method: "POST",
    headers: getHeaders(),
  });

  if (!res.ok) {
    throw new Error("Erro ao indexar KB.");
  }
}

export async function indexKnowledgeBase(kbId: string): Promise<void> {
  return indexKB(kbId);
}

/* =========================
   FLOW BUILDER / RAG
========================= */

export async function listKnowledgeBaseOptions(): Promise<
  { id: string; name: string }[]
> {
  const kbs = await listKbs();
  return kbs.map((k) => ({
    id: String(k.id),
    name: k.name,
  }));
}

/* =========================
   HELPERS
========================= */

export async function countKbDocsByStatus(kbId: string): Promise<{
  uploaded: number;
  indexed: number;
  failed: number;
}> {
  const docs = await listKbDocs(kbId);

  return docs.reduce(
    (acc, d) => {
      acc[d.status] += 1;
      return acc;
    },
    {
      uploaded: 0,
      indexed: 0,
      failed: 0,
    }
  );
}