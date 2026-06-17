"use client";

import { useEffect, useState } from "react";
import {
  countKbDocsByStatus,
  indexKnowledgeBase,
  listKbDocs,
  deleteKbDoc,
  addKbDoc,
  KbDoc,
} from "@/src/lib/services/kb";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function KbDocumentsPanel({ kbId }: { kbId: string }) {
  const [docs, setDocs] = useState<KbDoc[]>([]);
  const [counts, setCounts] = useState({ uploaded: 0, indexed: 0, failed: 0 });
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [fetchingDocs, setFetchingDocs] = useState(true);

  async function refresh() {
    setFetchingDocs(true);
    try {
      const [docsData, countsData] = await Promise.all([
        listKbDocs(kbId),
        countKbDocsByStatus(kbId),
      ]);
      setDocs(docsData);
      setCounts(countsData);
    } finally {
      setFetchingDocs(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kbId]);

  async function onUpload() {
    if (!files.length) return;
    setLoading(true);
    try {
      for (const file of files) {
        const content = await file.text();
        await addKbDoc({ kbId, title: file.name, content });
      }
      setFiles([]);
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  async function onIndex() {
    const total = counts.uploaded + counts.indexed + counts.failed;
    if (total === 0) {
      alert("Você precisa enviar pelo menos 1 documento antes de indexar.");
      return;
    }

    setIndexing(true);
    try {
      await indexKnowledgeBase(kbId);
      await refresh();
      alert("Indexação iniciada com sucesso!");
    } catch {
      alert("Erro ao indexar. Verifique se o backend está em execução.");
    } finally {
      setIndexing(false);
    }
  }

  async function onDelete(docId: string) {
    if (!confirm("Excluir este documento?")) return;
    await deleteKbDoc(kbId, docId);
    await refresh();
  }

  const total = counts.uploaded + counts.indexed + counts.failed;

  return (
    <div className="space-y-4">
      <div>
        <div className="text-base font-medium">Documentos</div>
        <div className="text-sm text-muted-foreground">
          Envie arquivos e depois indexe. O RAG só funciona com docs <b>indexed</b>.
        </div>
      </div>

      <div className="rounded-xl border p-4 space-y-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="text-sm font-medium">Resumo</div>
          <Button onClick={onIndex} disabled={indexing || total === 0}>
            {indexing ? "Indexando..." : "Indexar KB"}
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          Total: <b className="text-foreground">{total}</b> • Uploaded:{" "}
          <b className="text-foreground">{counts.uploaded}</b> • Indexed:{" "}
          <b className="text-foreground">{counts.indexed}</b> • Failed:{" "}
          <b className="text-foreground">{counts.failed}</b>
        </div>

        <Separator />

        <div className="text-sm font-medium">Upload</div>

        <input
          type="file"
          multiple
          accept=".txt,.pdf,.md,.csv,.json"
          onChange={(e) => setFiles(Array.from(e.target.files || []))}
        />

        <div className="flex gap-2">
          <Button onClick={onUpload} disabled={!files.length || loading}>
            {loading ? "Enviando..." : "Enviar"}
          </Button>
          <Button
            variant="outline"
            onClick={() => setFiles([])}
            disabled={!files.length || loading}
          >
            Limpar
          </Button>
        </div>
      </div>

      <Separator />

      <div className="rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Arquivo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {fetchingDocs ? (
              <TableRow>
                <TableCell colSpan={3} className="text-sm text-muted-foreground text-center py-6">
                  Carregando documentos...
                </TableCell>
              </TableRow>
            ) : docs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-sm text-muted-foreground text-center py-6">
                  Nenhum documento ainda.
                </TableCell>
              </TableRow>
            ) : (
              docs.map((d: KbDoc) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <div className="font-medium">{d.title}</div>
                  </TableCell>

                  <TableCell>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        d.status === "indexed"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : d.status === "failed"
                          ? "bg-red-500/10 text-red-400"
                          : "bg-yellow-500/10 text-yellow-400"
                      }`}
                    >
                      {d.status}
                    </span>
                  </TableCell>

                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onDelete(d.id)}
                    >
                      Excluir
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}