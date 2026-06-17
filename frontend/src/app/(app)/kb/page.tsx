"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Database, Plus, Search, Folder, Trash2, ArrowRight } from "lucide-react";

import { createKB, listKbs, type KB, deleteKB } from "@/src/lib/services/kb";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function KBPage() {
  const [kbs, setKbs] = useState<KB[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      const data = await listKbs();
      setKbs(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate() {
    if (!name.trim()) return;

    try {
      await createKB({
        name: name.trim(),
        description: "",
      });

      setName("");
      await load();
    } catch (error) {
      console.error(error);
      alert("Erro ao criar KB.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir esta Base de Conhecimento e todos os seus documentos?")) return;

    try {
      await deleteKB(id);
      await load();
    } catch (error) {
      console.error(error);
      alert("Erro ao excluir KB.");
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bases de Conhecimento</h1>
          <p className="text-muted-foreground">
            Armazene e processe documentos para usar com a funcionalidade RAG dos agentes.
          </p>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {/* CREATE NEW KB */}
        <div className="md:col-span-1">
          <Card data-tour="nova-kb" className="sticky top-24 bg-zinc-950 border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-500" />
                Nova Base (KB)
              </CardTitle>
              <CardDescription>Crie um novo repositório lógico para agrupar documentos sobre um mesmo assunto.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Input
                  placeholder="Ex: Manuais de Produto 2026"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-zinc-900/50"
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
              </div>
              <Button onClick={handleCreate} disabled={!name.trim()} className="w-full bg-blue-600 hover:bg-blue-500 text-white">
                Criar Repositório
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* LIST KBS */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-zinc-950/50 border-zinc-800">
            <Search className="w-4 h-4 text-zinc-500" />
            <Input 
              className="h-8 border-0 bg-transparent focus-visible:ring-0 px-0 shadow-none" 
              placeholder="Buscar bases..." 
            />
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2].map((i) => (
                <Card key={i} className="animate-pulse bg-zinc-900/50 border-zinc-800 h-32" />
              ))}
            </div>
          ) : kbs.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-2xl border-zinc-800 bg-zinc-950/50">
              <div className="flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-zinc-900">
                <Database className="w-8 h-8 text-zinc-500" />
              </div>
              <h3 className="text-xl font-semibold text-zinc-200">Nenhuma Base Encontrada</h3>
              <p className="max-w-sm mt-2 text-sm text-zinc-500">
                Use o painel lateral para criar sua primeira Base de Conhecimento e comece a fazer upload de arquivos.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <AnimatePresence>
                {kbs.map((kb, index) => (
                  <motion.div
                    key={kb.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="flex flex-col h-full transition-all group hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/5">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 border rounded-xl bg-zinc-900 border-zinc-800 group-hover:border-blue-500/30 group-hover:bg-blue-500/10 transition-colors text-zinc-400 group-hover:text-blue-400">
                              <Folder className="w-5 h-5" />
                            </div>
                            <div>
                              <CardTitle className="text-base">{kb.name}</CardTitle>
                              <div className="text-xs text-zinc-500 mt-0.5">ID: {kb.id}</div>
                            </div>
                          </div>
                          
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="w-8 h-8 text-zinc-500 hover:text-red-400 hover:bg-red-400/10"
                            onClick={() => handleDelete(kb.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 pb-4">
                        <p className="text-sm text-zinc-400 line-clamp-2">
                          {kb.description || "Nenhuma descrição informada."}
                        </p>
                      </CardContent>
                      <div className="px-6 pb-6 mt-auto">
                        <Button asChild variant="secondary" className="w-full gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100">
                          <Link href={`/kb/${kb.id}`}>
                            Gerenciar Arquivos <ArrowRight className="w-4 h-4" />
                          </Link>
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}