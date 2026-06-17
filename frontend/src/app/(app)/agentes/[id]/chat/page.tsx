"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { getAgent } from "@/src/lib/services/agentes";
import {
  clearConversationMemory,
  getConversationMemory,
  listConversations,
  sendAgentMessage,
  type ChatMessage,
  type Conversation,
} from "@/src/lib/services/chat";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export default function AgentChatPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const agentId = params.id;

  const [agentName, setAgentName] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("Olá! Quero saber mais.");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  async function loadAgent() {
    const agent = await getAgent(agentId);
    if (!agent) {
      alert("Agente não encontrado.");
      router.push("/agentes");
      return;
    }
    setAgentName(agent.name);
  }

  async function loadConversationsData() {
    const data = await listConversations(agentId);
    setConversations(data);

    if (data.length > 0 && !conversationId) {
      const firstId = data[0].id;
      setConversationId(firstId);

      const memory = await getConversationMemory(firstId);
      setMessages(memory);
    }
  }

  async function loadAll() {
    try {
      setLoading(true);
      await loadAgent();
      await loadConversationsData();
    } catch (error) {
      console.error(error);
      alert("Erro ao carregar chat do agente.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  function handleNewConversation() {
    setConversationId(null);
    setMessages([]);
  }

  async function handleSelectConversation(id: number) {
    try {
      setConversationId(id);
      const memory = await getConversationMemory(id);
      setMessages(memory);
    } catch (error) {
      console.error(error);
      alert("Erro ao abrir conversa.");
    }
  }

  async function handleSend() {
    if (!input.trim()) return;

    try {
      setSending(true);

      const userMsg: ChatMessage = {
        role: "user",
        content: input.trim(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");

      const res = await sendAgentMessage({
        agentId,
        conversationId,
        message: userMsg.content,
        history: messages,
        useMemory: true,
        memoryLimit: 10,
      });

      setConversationId(res.conversation_id);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.answer,
        },
      ]);

      try {
        const updated = await listConversations(agentId);
        setConversations(updated);
      } catch {
        // se backend não tiver listagem de conversas, seguimos normal
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao enviar mensagem.");
    } finally {
      setSending(false);
    }
  }

  async function handleClearMemory() {
    if (!conversationId) return;

    try {
      await clearConversationMemory(conversationId);
      setMessages([]);
    } catch (error) {
      console.error(error);
      alert("Erro ao limpar memória.");
    }
  }

  const title = useMemo(() => {
    return agentName ? `Chat do agente: ${agentName}` : "Chat do agente";
  }, [agentName]);

  if (loading) {
    return <div className="space-y-4">Carregando chat...</div>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Conversas</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          <Button className="w-full" onClick={handleNewConversation}>
            Nova conversa
          </Button>

          <div className="space-y-2">
            {conversations.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Seu backend não retornou conversas listáveis ainda. Você pode conversar normalmente mesmo assim.
              </div>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSelectConversation(c.id)}
                  className={`w-full rounded-md border p-3 text-left text-sm ${
                    conversationId === c.id ? "bg-muted" : ""
                  }`}
                >
                  <div className="font-medium">
                    {c.title || `Conversa #${c.id}`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ID: {c.id}
                  </div>
                </button>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="max-h-[500px] space-y-3 overflow-auto rounded-md border p-4">
              {messages.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  Envie uma mensagem para começar.
                </div>
              ) : (
                messages.map((m, i) => (
                  <div
                    key={i}
                    className={`rounded-lg p-3 text-sm ${
                      m.role === "user"
                        ? "ml-auto max-w-[80%] border bg-muted"
                        : "mr-auto max-w-[80%] border"
                    }`}
                  >
                    <div className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                      {m.role}
                    </div>
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  </div>
                ))
              )}
            </div>

            <Textarea
              placeholder="Digite sua mensagem..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="min-h-[120px]"
            />

            <div className="flex gap-2">
              <Button onClick={handleSend} disabled={sending}>
                {sending ? "Enviando..." : "Enviar"}
              </Button>

              <Button
                variant="outline"
                onClick={handleClearMemory}
                disabled={!conversationId}
              >
                Limpar memória
              </Button>

              <Button
                variant="outline"
                onClick={() => router.push(`/agentes/${agentId}`)}
              >
                Voltar ao agente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}