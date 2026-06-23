"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Key, User, CreditCard, Building2, Phone, Mail, ShieldCheck, Loader2, CheckCircle2, MailWarning, Trash2, ExternalLink } from "lucide-react";
import { resendVerification } from "@/src/lib/services/auth";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { getMe, updateProfile, setApiKey, removeApiKey, type Profile } from "@/src/lib/services/profile";

function fmtDate(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return iso;
  }
}

const PROVIDER_LABEL: Record<string, string> = {
  local: "E-mail e senha",
  google: "Google",
  facebook: "Facebook",
  github: "GitHub",
};

export default function ConfiguracoesPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const [provider, setProvider] = useState("openai");
  const [apiKey, setApiKeyValue] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [keyMsg, setKeyMsg] = useState<string | null>(null);

  async function refresh() {
    try {
      const me = await getMe();
      setProfile(me);
      setName(me.name || "");
      setCompany(me.company || "");
      setPhone(me.phone || "");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleSaveProfile() {
    setSavingProfile(true);
    setProfileSaved(false);
    try {
      const updated = await updateProfile({ name, company, phone });
      setProfile(updated);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch (e: any) {
      alert(e?.message || "Erro ao salvar perfil.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSaveKey() {
    if (!apiKey.trim()) return;
    setSavingKey(true);
    setKeyMsg(null);
    try {
      const updated = await setApiKey(provider, apiKey.trim());
      setProfile(updated);
      setApiKeyValue("");
      setKeyMsg("Chave salva! Suas conversas agora usam seus próprios créditos.");
    } catch (e: any) {
      setKeyMsg(e?.message || "Erro ao salvar a chave.");
    } finally {
      setSavingKey(false);
    }
  }

  async function handleRemoveKey() {
    if (!confirm("Remover sua chave de API? Voltará a usar a chave padrão do sistema.")) return;
    try {
      const updated = await removeApiKey();
      setProfile(updated);
      setKeyMsg("Chave removida.");
    } catch (e: any) {
      alert(e?.message || "Erro ao remover.");
    }
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-zinc-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Gerencie seu perfil, chaves de API e plano.</p>
      </div>

      <div className="grid gap-6">
        {/* Perfil */}
        <Card className="border-border">
          <CardHeader>
            <div className="flex items-center gap-2 mb-1">
              <User className="w-5 h-5 text-indigo-400" />
              <CardTitle>Meu Perfil</CardTitle>
            </div>
            <CardDescription>Informações da sua conta.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                <div className="flex items-center gap-1.5 text-xs text-zinc-500"><Mail className="h-3.5 w-3.5" /> E-mail</div>
                <div className="mt-1 truncate text-sm text-zinc-200">{profile?.email}</div>
                {profile && (
                  (profile.email_verified || profile.is_admin) ? (
                    <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" /> E-mail confirmado
                    </div>
                  ) : (
                    <div className="mt-1.5 space-y-1">
                      <div className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400">
                        <MailWarning className="h-3 w-3" /> E-mail não confirmado
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const msg = await resendVerification();
                            alert(msg);
                          } catch (e: any) {
                            alert(e?.message || "Não foi possível reenviar.");
                          }
                        }}
                        className="block text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        Reenviar e-mail de confirmação
                      </button>
                    </div>
                  )
                )}
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                <div className="flex items-center gap-1.5 text-xs text-zinc-500"><ShieldCheck className="h-3.5 w-3.5" /> Login via</div>
                <div className="mt-1 text-sm text-zinc-200">{PROVIDER_LABEL[profile?.provider || "local"] || profile?.provider}</div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                <div className="text-xs text-zinc-500">Membro desde</div>
                <div className="mt-1 text-sm text-zinc-200">{fmtDate(profile?.created_at)}</div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="company" className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> Empresa</Label>
                <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Sua empresa" />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="phone" className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Telefone / WhatsApp</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-between border-t border-border pt-4">
            {profileSaved ? (
              <span className="flex items-center gap-1.5 text-sm text-emerald-400"><CheckCircle2 className="h-4 w-4" /> Salvo!</span>
            ) : <span />}
            <Button onClick={handleSaveProfile} disabled={savingProfile} className="gap-2">
              {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />} Salvar perfil
            </Button>
          </CardFooter>
        </Card>

        {/* Chaves de API */}
        <Card className="border-border">
          <CardHeader>
            <div className="flex items-center gap-2 mb-1">
              <Key className="w-5 h-5 text-amber-400" />
              <CardTitle>Chave de API (use seus próprios créditos)</CardTitle>
            </div>
            <CardDescription>
              Por padrão usamos a chave do sistema. Cadastre a sua para que as conversas
              consumam os créditos da <b>sua</b> conta no provedor.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile?.has_openai_key && (
              <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2.5">
                <span className="flex items-center gap-2 text-sm text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" /> Chave OpenAI configurada e ativa
                </span>
                <Button size="sm" variant="ghost" className="gap-1.5 text-red-400 hover:text-red-300" onClick={handleRemoveKey}>
                  <Trash2 className="h-3.5 w-3.5" /> Remover
                </Button>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
              <div className="grid gap-2">
                <Label>Provedor</Label>
                <Select value={provider} onValueChange={setProvider}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic" disabled>Anthropic (em breve)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Chave da API</Label>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKeyValue(e.target.value)}
                    placeholder="sk-..."
                  />
                  <Button onClick={handleSaveKey} disabled={savingKey || !apiKey.trim()}>
                    {savingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                  </Button>
                </div>
              </div>
            </div>
            {keyMsg && <p className="text-xs text-zinc-400">{keyMsg}</p>}
            <p className="text-xs text-zinc-600">
              Pegue sua chave em platform.openai.com → API keys. Ela fica salva apenas na sua conta.
            </p>
          </CardContent>
        </Card>

        {/* Plano */}
        <Card className="border-border">
          <CardHeader>
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="w-5 h-5 text-zinc-400" />
              <CardTitle>Plano e Faturamento</CardTitle>
            </div>
            <CardDescription>
              Você está no plano <Badge variant="outline" className="ml-1 text-zinc-300">Gratuito</Badge>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-start justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 sm:flex-row sm:items-center">
              <div>
                <p className="font-medium text-zinc-200">Quer mais agentes, mensagens e integrações?</p>
                <p className="text-sm text-zinc-400">Conheça os planos e faça upgrade quando quiser.</p>
              </div>
              <Button asChild className="gap-2 bg-indigo-600 hover:bg-indigo-500">
                <Link href="/precos">Ver planos <ExternalLink className="h-4 w-4" /></Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
