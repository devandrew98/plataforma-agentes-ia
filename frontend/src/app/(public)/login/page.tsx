"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSession, login, register, oauthLoginUrl, OAuthProvider, wakeBackend } from "@/src/lib/services/auth";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Zap } from "lucide-react";

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  google_nao_configurado: "Login com Google ainda não configurado pelo administrador.",
  facebook_nao_configurado: "Login com Facebook ainda não configurado pelo administrador.",
  github_nao_configurado: "Login com GitHub ainda não configurado pelo administrador.",
  provedor_invalido: "Provedor de login inválido.",
  state_invalido: "Sessão de login expirada. Tente novamente.",
  acesso_negado: "Você cancelou ou negou o acesso.",
  falha_ao_autenticar: "Não foi possível autenticar com o provedor.",
  sem_email: "Sua conta não retornou um e-mail. Use outro método.",
  oauth_falhou: "Não foi possível concluir o login social.",
};

/* ──────────────────────────────────────────────
   SVG icons para provedores sociais
────────────────────────────────────────────── */
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true" fill="#1877F2">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </svg>
);

/* ──────────────────────────────────────────────
   Componente principal
────────────────────────────────────────────── */
export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  useEffect(() => {
    const s = getSession();
    if (s) {
      router.replace("/dashboard");
      return;
    }
    // Acorda o backend (plano grátis hiberna) enquanto o usuário digita.
    wakeBackend();
    // Mensagem de erro vinda do fluxo OAuth (?error=...)
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err) {
      setError(OAUTH_ERROR_MESSAGES[err] || "Não foi possível concluir o login social.");
    }
  }, [router]);

  const canSubmit =
    mode === "login"
      ? email.trim().length > 3 && password.length >= 4
      : name.trim().length >= 2 && email.trim().length > 3 && password.length >= 4;

  function goApp() {
    // Navegação "dura" (recarrega a página) — mais robusta em produção que
    // router.replace, garantindo que o RequireAuth leia a sessão recém-gravada.
    window.location.assign("/dashboard");
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!canSubmit || loading) return;
    setError(null);
    setLoading(true);

    try {
      if (mode === "login") {
        await login({ email, password });
      } else {
        await register({ name, email, password });
      }
      goApp();
    } catch (err: any) {
      setError(err?.message || "Erro ao autenticar.");
      setLoading(false);
    }
  }

  function handleSocialLogin(provider: OAuthProvider, label: string) {
    setSocialLoading(label);
    // Redireciona para o backend, que inicia o fluxo OAuth do provedor.
    window.location.href = oauthLoginUrl(provider);
  }

  const socialProviders: {
    id: OAuthProvider;
    label: string;
    icon: React.ReactNode;
    className: string;
  }[] = [
    {
      id: "google",
      label: "Continuar com Google",
      icon: <GoogleIcon />,
      className:
        "bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 hover:border-gray-300",
    },
    {
      id: "facebook",
      label: "Continuar com Facebook",
      icon: <FacebookIcon />,
      className:
        "bg-[#1877F2] hover:bg-[#166FE5] text-white border border-transparent",
    },
    {
      id: "github",
      label: "Continuar com GitHub",
      icon: <GitHubIcon />,
      className:
        "bg-[#24292e] hover:bg-[#1a1f24] text-white border border-transparent",
    },
  ];

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black px-4">

      {/* Background gradients */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-indigo-900/25 blur-[140px]" />
        <div className="absolute top-1/2 -right-32 w-[400px] h-[400px] rounded-full bg-purple-900/20 blur-[120px]" />
        <div className="absolute -bottom-20 left-1/3 w-[350px] h-[350px] rounded-full bg-blue-900/15 blur-[100px]" />
      </div>

      {/* Grid texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <a href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
              A
            </div>
            <span className="font-bold text-xl text-white tracking-tight">
              ARgent<span className="text-indigo-400 font-medium">.ai</span>
            </span>
          </a>
        </div>

        {/* Card */}
        <div className="bg-zinc-950/80 border border-zinc-800/60 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">

          {/* Header */}
          <div className="text-center mb-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-4">
                  <Zap className="w-3 h-3" />
                  <span>{mode === "login" ? "Bem-vindo de volta" : "Crie sua conta grátis"}</span>
                </div>
                <h1 className="text-2xl font-bold text-white">
                  {mode === "login" ? "Entrar na plataforma" : "Criar nova conta"}
                </h1>
                <p className="text-sm text-zinc-500 mt-1">
                  {mode === "login"
                    ? "Acesse seus agentes e bases de conhecimento"
                    : "Comece a criar seus próprios agentes de IA"}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Social Buttons */}
          <div className="space-y-2.5 mb-6">
            {socialProviders.map((provider) => (
              <motion.button
                key={provider.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => handleSocialLogin(provider.id, provider.label)}
                disabled={!!socialLoading}
                className={`
                  w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl
                  text-sm font-medium transition-all duration-200 cursor-pointer
                  disabled:opacity-60 disabled:cursor-not-allowed
                  ${provider.className}
                `}
              >
                {socialLoading === provider.label ? (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  provider.icon
                )}
                <span>{provider.label}</span>
              </motion.button>
            ))}
          </div>

          {/* Divider */}
          <div className="relative flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-xs text-zinc-600 font-medium">ou com e-mail</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence>
              {mode === "register" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Nome completo
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none" />
                    <input
                      id="name-input"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Seu nome"
                      autoComplete="name"
                      className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/60 transition-all"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none" />
                <input
                  id="email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/60 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-zinc-400">
                  Senha
                </label>
                {mode === "login" && (
                  <button
                    type="button"
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                    onClick={() => setError("Recuperação de senha em breve.")}
                  >
                    Esqueceu a senha?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none" />
                <input
                  id="password-input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className="w-full pl-10 pr-10 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/60 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs"
                >
                  <span className="text-red-400 mt-0.5 flex-shrink-0">⚠</span>
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.button
              type="submit"
              id="submit-btn"
              whileHover={{ scale: canSubmit && !loading ? 1.01 : 1 }}
              whileTap={{ scale: canSubmit && !loading ? 0.99 : 1 }}
              disabled={!canSubmit || loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Autenticando...</span>
                </>
              ) : (
                <>
                  <span>{mode === "login" ? "Entrar" : "Criar conta"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>

          {/* Switch mode */}
          <p className="text-center text-sm text-zinc-600 mt-6">
            {mode === "login" ? "Não tem uma conta?" : "Já tem uma conta?"}{" "}
            <button
              type="button"
              id="toggle-mode-btn"
              onClick={() => {
                setError(null);
                setMode((m) => (m === "login" ? "register" : "login"));
              }}
              className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors cursor-pointer"
            >
              {mode === "login" ? "Criar conta grátis" : "Entrar"}
            </button>
          </p>

          {/* Terms */}
          {mode === "register" && (
            <p className="text-center text-[11px] text-zinc-700 mt-4 leading-relaxed">
              Ao criar uma conta, você concorda com nossos{" "}
              <span className="text-zinc-500 hover:text-zinc-400 cursor-pointer">
                Termos de Uso
              </span>{" "}
              e{" "}
              <span className="text-zinc-500 hover:text-zinc-400 cursor-pointer">
                Política de Privacidade
              </span>
              .
            </p>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-zinc-700 mt-6">
          © 2026 ARgent.ai · Todos os direitos reservados
        </p>
      </motion.div>
    </div>
  );
}