"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createKnowledgeBase } from "@/src/lib/services/kb";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function CreateKbDialog() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreate = useMemo(() => name.trim().length >= 3, [name]);

  async function onCreate() {
    if (!canCreate) return;
    setLoading(true);
    setError(null);

    try {
      const kb = await createKnowledgeBase({ name: name.trim(), description: description.trim() });
      setOpen(false);
      setName("");
      setDescription("");
      router.push(`/kb/${kb.id}`);
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Erro ao criar base de conhecimento.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Criar KB</Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Base de Conhecimento</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Nome</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Clínica - Procedimentos e preços"
            />
            <div className="text-xs text-muted-foreground">
              Mínimo 3 caracteres.
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Descrição (opcional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="O que essa KB contém?"
            />
          </div>

          {error && (
            <div className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/10 p-3">
              {error}
            </div>
          )}

          <Button disabled={!canCreate || loading} onClick={onCreate}>
            {loading ? "Criando..." : "Criar e abrir"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}