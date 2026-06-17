"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  addKbDoc,
  countKbDocsByStatus,
  getKb,
  indexKB,
  listKbDocs,
  deleteKbDoc,
  uploadKbFile,
  type KB,
  type KbDoc,
} from "@/src/lib/services/kb";
import {
  ArrowLeft,
  UploadCloud,
  FileText,
  Trash2,
  Database,
  Sparkles,
  Loader2,
  CheckCircle2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function KBDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const kbId = params.id;
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [kb, setKb] = useState<KB | null>(null);
  const [docs, setDocs] = useState<KbDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ uploaded: 0, indexed: 0, failed: 0 });

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [mode, setMode] = useState<"file" | "text">("file");

  // modo texto
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  async function load() {
    try {
      setLoading(true);
      const [kbData, docsData, countsData] = await Promise.all([
        getKb(kbId),
        listKbDocs(kbId),
        countKbDocsByStatus(kbId),
      ]);
      setKb(kbData);
      setDocs(docsData);
      setCounts(countsData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kbId]);

  async function handleUploadFiles() {
    if (!pendingFiles.length) return;
    setUploading(true);
    try {
      for (const file of pendingFiles) {
        await uploadKbFile(kbId, file);
      }
      setPendingFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await load();
    } catch (error) {
      console.error(error);
      alert("Erro ao enviar arquivo(s).");
    } finally {
      setUploading(false);
    }
  }

  async function handleAddText() {
    if (!title.trim() || !content.trim()) return;
    setUploading(true);
    try {
      await addKbDoc({ kbId, title: title.trim(), content: content.trim() });
      setTitle("");
      setContent("");
      await load();
    } catch (error) {
      console.error(error);
      alert("Erro ao adicionar documento.");
    } finally {
      setUploading(false);
    }
  }

  async function handleIndex() {
    const total = counts.uploaded + counts.indexed + counts.failed;
    if (total === 0) {
      alert("Envie pelo menos 1 documento antes de indexar.");
      return;
    }
    setIndexing(true);
    try {
      await indexKB(kbId);
      await load();
      alert("Indexação concluída! Seus documentos já podem ser usados pelo agente (RAG).");
    } catch (error) {
      console.error(error);
      alert("Erro ao indexar. Verifique se o backend está rodando.");
    } finally {
      setIndexing(false);
    }
  }

  async function handleDeleteDoc(docId: string) {
    if (!confirm("Excluir este documento?")) return;
    try {
      await deleteKbDoc(kbId, docId);
      await load();
    } catch (error) {
      console.error(error);
      alert("Erro ao excluir documento.");
    }
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-3 text-zinc-500">
        <Loader2 className="h-6 w-6 animate-spin" />
        Carregando base...
      </div>
    );
  }

  if (!kb) {
    return (
      <div className="space-y-4">
        <p>Base não encontrada.</p>
        <Button variant="outline" onClick={() => router.push("/kb")}>Voltar</Button>
      </div>
    );
  }

  const total = counts.uploaded + counts.indexed + counts.failed;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/kb")} className="rounded-full bg-zinc-900">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-400" /> {kb.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {counts.indexed} de {total} documento(s) indexado(s)
            </p>
          </div>
        </div>
        <Button onClick={handleIndex} disabled={indexing || total === 0} className="gap-2 bg-blue-600 hover:bg-blue-500">
          {indexing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {indexing ? "Indexando..." : "Indexar base (ativar RAG)"}
        </Button>
      </div>

      {/* Status */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Enviados", value: counts.uploaded, tint: "text-amber-400" },
          { label: "Indexados", value: counts.indexed, tint: "text-emerald-400" },
          { label: "Falhas", value: counts.failed, tint: "text-red-400" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className={`text-2xl font-bold ${s.tint}`}>{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Adicionar documento */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Adicionar documento</CardTitle>
          <div className="flex gap-2 pt-2">
            <Button size="sm" variant={mode === "file" ? "default" : "outline"} onClick={() => setMode("file")} className="gap-1.5">
              <UploadCloud className="h-4 w-4" /> Enviar arquivo
            </Button>
            <Button size="sm" variant={mode === "text" ? "default" : "outline"} onClick={() => setMode("text")} className="gap-1.5">
              <FileText className="h-4 w-4" /> Colar texto
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {mode === "file" ? (
            <>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  setPendingFiles(Array.from(e.dataTransfer.files || []));
                }}
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900/40 p-8 text-center transition-colors hover:border-blue-500/50 hover:bg-blue-500/5"
              >
                <UploadCloud className="h-8 w-8 text-zinc-500" />
                <div className="text-sm text-zinc-300">
                  Clique para escolher um arquivo do seu computador
                </div>
                <div className="text-xs text-zinc-500">ou arraste e solte aqui · .txt, .pdf, .md, .csv</div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".txt,.pdf,.md,.csv,.json,.text"
                className="hidden"
                onChange={(e) => setPendingFiles(Array.from(e.target.files || []))}
              />

              {pendingFiles.length > 0 && (
                <div className="space-y-2">
                  {pendingFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm">
                      <FileText className="h-4 w-4 text-blue-400" />
                      <span className="flex-1 truncate">{f.name}</span>
                      <span className="text-xs text-zinc-500">{(f.size / 1024).toFixed(0)} KB</span>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Button onClick={handleUploadFiles} disabled={uploading} className="gap-2">
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                      {uploading ? "Enviando..." : `Enviar ${pendingFiles.length} arquivo(s)`}
                    </Button>
                    <Button variant="outline" onClick={() => setPendingFiles([])} disabled={uploading}>
                      Limpar
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <Input placeholder="Título do documento" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Textarea
                placeholder="Cole aqui o conteúdo do documento..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[160px]"
              />
              <Button onClick={handleAddText} disabled={uploading || !title.trim() || !content.trim()} className="gap-2">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Adicionar documento
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Lista de documentos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Documentos ({docs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {docs.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Nenhum documento ainda. Envie um arquivo acima.
            </div>
          ) : (
            <div className="space-y-2">
              {docs.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2.5">
                  <FileText className="h-4 w-4 shrink-0 text-zinc-400" />
                  <span className="flex-1 truncate text-sm">{doc.title}</span>
                  <span
                    className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      doc.status === "indexed"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : doc.status === "failed"
                        ? "bg-red-500/10 text-red-400"
                        : "bg-amber-500/10 text-amber-400"
                    }`}
                  >
                    {doc.status === "indexed" && <CheckCircle2 className="h-3 w-3" />}
                    {doc.status === "indexed" ? "indexado" : doc.status === "failed" ? "falhou" : "enviado"}
                  </span>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-red-400" onClick={() => handleDeleteDoc(doc.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
