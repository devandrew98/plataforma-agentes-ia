"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { TrendingUp, LifeBuoy, Calendar, Megaphone, Plus, ArrowLeft, Bot, GraduationCap } from "lucide-react";

import { createAgent } from "@/src/lib/services/agentes";
import { AGENT_TEMPLATES, AgentTemplate } from "@/src/lib/templates";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Mapeamento de ícones (string para componente Lucide)
const iconMap: Record<string, React.ElementType> = {
  TrendingUp,
  LifeBuoy,
  Calendar,
  Megaphone,
  Plus,
  Bot
};

export default function NovoAgentePage() {
  const router = useRouter();
  
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [saving, setSaving] = useState(false);

  // Quando o usuário seleciona um template
  const handleSelectTemplate = (template: AgentTemplate) => {
    setSelectedTemplate(template);
    setName(template.name === "Agente em Branco" ? "Novo Agente" : template.name);
    setDescription(template.description === "Comece do zero e configure seu próprio prompt e fluxo." ? "" : template.description);
    setSystemPrompt(template.system_prompt);
  };

  const onSave = async () => {
    if (!name.trim()) return;

    try {
      setSaving(true);

      const agent = await createAgent({
        name,
        description,
        system_prompt: systemPrompt,
        status: "draft",
        flow: { nodes: [], edges: [] }, // Começa sem fluxo, o usuário edita depois
      });

      router.push(`/agentes/${agent.id}`);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Erro ao criar agente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => {
          if (selectedTemplate) setSelectedTemplate(null);
          else router.push("/agentes");
        }}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Criar Novo Agente</h1>
          <p className="text-muted-foreground">
            {selectedTemplate ? "Configure as informações básicas do seu agente." : "Escolha um template para começar ou crie do zero."}
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!selectedTemplate ? (
          <motion.div
            key="templates"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between gap-3 p-4 border rounded-xl border-indigo-500/20 bg-indigo-500/5">
              <div className="flex items-center gap-3 text-sm text-zinc-300">
                <GraduationCap className="w-5 h-5 text-indigo-400 shrink-0" />
                <span>
                  Primeira vez criando um agente? Veja o passo a passo completo.
                </span>
              </div>
              <Button asChild variant="outline" size="sm" className="gap-1 shrink-0">
                <Link href="/tutorial">Ver tutorial</Link>
              </Button>
            </div>

            <div data-tour="templates" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {AGENT_TEMPLATES.map((template) => {
              const Icon = iconMap[template.icon] || Bot;
              
              return (
                <Card 
                  key={template.id} 
                  className="transition-all cursor-pointer hover:border-primary hover:shadow-md"
                  onClick={() => handleSelectTemplate(template)}
                >
                  <CardContent className="p-6">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 border ${template.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold">{template.name}</h3>
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                  </CardContent>
                </Card>
              );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${selectedTemplate.color}`}>
                    {(() => {
                      const Icon = iconMap[selectedTemplate.icon] || Bot;
                      return <Icon className="w-5 h-5" />;
                    })()}
                  </div>
                  <div>
                    <CardTitle>{selectedTemplate.name}</CardTitle>
                    <CardDescription>Template selecionado</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome do Agente</Label>
                  <Input 
                    id="name" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="Ex: Assistente de Vendas PRO"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="desc">Descrição (Opcional)</Label>
                  <Textarea 
                    id="desc" 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    placeholder="Descreva o propósito deste agente..."
                    rows={2}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="prompt">Prompt de Sistema</Label>
                  <Textarea 
                    id="prompt" 
                    value={systemPrompt} 
                    onChange={(e) => setSystemPrompt(e.target.value)} 
                    placeholder="Você é um assistente..."
                    rows={6}
                    className="font-mono text-sm leading-relaxed"
                  />
                  <p className="text-xs text-muted-foreground">
                    O prompt de sistema define a personalidade e as instruções primárias do agente.
                  </p>
                </div>

                <div className="flex justify-end pt-4">
                  <Button 
                    size="lg" 
                    onClick={onSave} 
                    disabled={!name.trim() || saving}
                    className="w-full sm:w-auto"
                  >
                    {saving ? "Criando..." : "Criar Agente e Configurar Fluxo"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}