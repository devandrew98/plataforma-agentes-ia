"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Send, Bot, User, Loader2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type Msg = { role: "user" | "assistant"; content: string };

export default function PublicChatPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [embed, setEmbed] = useState(false);
  const [agent, setAgent] = useState<{ name: string; description: string } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setEmbed(new URLSearchParams(window.location.search).get("embed") === "1");
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/public/agents/${id}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((a) => {
        setAgent({ name: a.name, description: a.description });
        setMessages([
          { role: "assistant", content: `Olá! Sou o ${a.name}. Como posso te ajudar?` },
        ]);
      })
      .catch(() => setNotFound(true));
  }, [id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setSending(true);
    try {
      const res = await fetch(`${API_URL}/public/agents/${id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, conversation_id: conversationId }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setConversationId(data.conversation_id ?? conversationId);
      setMessages((m) => [...m, { role: "assistant", content: data.answer }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Desculpe, tive um problema para responder. Tente novamente." },
      ]);
    } finally {
      setSending(false);
    }
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-zinc-400">
        <div className="text-center">
          <Bot className="mx-auto mb-3 h-10 w-10 text-zinc-600" />
          <p>Este agente não está disponível.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${embed ? "h-screen" : "min-h-screen"} flex-col bg-black text-zinc-100`}>
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-950/80 px-4 py-3 backdrop-blur">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600">
          <Bot className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{agent?.name || "Carregando…"}</div>
          <div className="truncate text-xs text-zinc-500">{agent?.description || "Assistente de IA"}</div>
        </div>
      </header>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  m.role === "user" ? "bg-zinc-800" : "bg-indigo-600"
                }`}
              >
                {m.role === "user" ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4 text-white" />
                )}
              </div>
              <div
                className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === "user" ? "bg-indigo-600 text-white" : "bg-zinc-900 text-zinc-100"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="rounded-2xl bg-zinc-900 px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-zinc-800 bg-zinc-950/80 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="Escreva sua mensagem…"
            className="flex-1 resize-none rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
          <button
            onClick={send}
            disabled={sending || !input.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        {!embed && (
          <p className="mx-auto mt-2 max-w-2xl text-center text-[11px] text-zinc-600">
            Powered by <span className="text-zinc-400">ARgent.ai</span>
          </p>
        )}
      </div>
    </div>
  );
}
