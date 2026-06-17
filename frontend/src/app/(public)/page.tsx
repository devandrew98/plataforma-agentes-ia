"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Zap, ArrowRight, Layers, Shield, Check, MessageSquare, Mail } from "lucide-react";

export default function Home() {
  const [cookieConsent, setCookieConsent] = useState(true);

  // Exibe o banner de cookies após a montagem do componente no client
  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      setCookieConsent(false);
    }
  }, []);

  const handleAcceptCookies = () => {
    localStorage.setItem("cookie-consent", "accepted");
    setCookieConsent(true);
  };

  // Simulação de mensagens do WhatsApp aparecendo gradativamente
  const [messages, setMessages] = useState<Array<{ role: string; content: string; time: string }>>([]);

  useEffect(() => {
    const chatSequence = [
      { role: "user", content: "Oi, tudo ótimo!", time: "14:28" },
      { role: "agent", content: "Boa tarde, Pedro, tudo certinho? Como posso ajudar sua empresa hoje?", time: "14:28" },
      { role: "user", content: "Queria criar um atendente IA para o WhatsApp da minha loja.", time: "14:29" },
      { role: "agent", content: "Perfeito! Você pode subir sua planilha de produtos e em minutos o agente responde dúvidas, checa estoque e fecha vendas. Quer ver um teste?", time: "14:29" }
    ];

    setMessages([]);
    let timer: NodeJS.Timeout;

    const showMessage = (index: number) => {
      if (index < chatSequence.length) {
        setMessages((prev) => [...prev, chatSequence[index]]);
        timer = setTimeout(() => showMessage(index + 1), 2200);
      } else {
        // Reinicia o loop após 6 segundos
        timer = setTimeout(() => {
          setMessages([]);
          showMessage(0);
        }, 6000);
      }
    };

    showMessage(0);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-black text-zinc-50 font-sans selection:bg-zinc-800 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-900/20 blur-[130px]" />
        <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/15 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] rounded-full bg-blue-900/10 blur-[100px]" />
      </div>

      {/* Header / Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-md border-b border-zinc-900/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-500/20">
              A
            </div>
            <span className="font-bold text-lg text-white tracking-tight">ARgent<span className="text-indigo-400 font-medium">.ai</span></span>
            
            <div className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ml-2">
              Meta Business Partner
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Recursos</a>
            <a href="#como-funciona" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Como funciona</a>
            <Link href="/precos" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Preços</Link>
            <a href="#faq" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Ajuda</a>
          </nav>
          
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-zinc-300 hover:text-white transition-colors">
              Entrar
            </Link>
            <Link href="/dashboard">
              <button className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-full transition-all shadow-md shadow-indigo-500/20 hover:scale-105 active:scale-95">
                Experimente grátis
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24 md:pt-40 md:pb-32 min-h-screen flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Text Content */}
          <div className="lg:col-span-7 flex flex-col items-start text-left space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold border rounded-full text-zinc-300 border-zinc-800 bg-zinc-900/40 backdrop-blur-sm">
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              <span>A Nova Geração de Agentes IA</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white leading-tight">
              Clone seu <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500 bg-clip-text text-transparent">melhor atendente</span> com IA
            </h1>

            <p className="text-lg text-zinc-400 max-w-xl">
              Tenha Agentes IA treinados para sua empresa, atendendo no WhatsApp, web e sistemas de maneira inteligente, personalizada e incansável 24 horas por dia.
            </p>

            {/* Salesforce-Style List of Benefits */}
            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1 w-5 h-5 rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center">
                  <Check className="w-3 h-3 text-sky-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-zinc-200">Definir o papel e as diretrizes do agente</h4>
                  <p className="text-xs text-zinc-500">Modele a persona do atendente de acordo com a voz e tom de sua marca.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1 w-5 h-5 rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center">
                  <Check className="w-3 h-3 text-sky-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-zinc-200">Ampliar capacidades com bases de conhecimento</h4>
                  <p className="text-xs text-zinc-500">Faça upload de PDFs, manuais e sites para o agente consultar as respostas (RAG).</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1 w-5 h-5 rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center">
                  <Check className="w-3 h-3 text-sky-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-zinc-200">Personalizar fluxos integrados e automatizados</h4>
                  <p className="text-xs text-zinc-500">Desenhe fluxos visuais conectando ferramentas, LLMs e ações finais de forma interativa.</p>
                </div>
              </div>
            </div>

            {/* Call to Actions & Phone */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4 w-full sm:w-auto">
              <Link href="/dashboard" className="sm:w-auto">
                <button className="flex items-center justify-center w-full gap-2 px-8 py-4 font-semibold text-white transition-all bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-full shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 cursor-pointer">
                  Experimente grátis <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
              
              <div className="flex items-center justify-center gap-2 text-zinc-400 text-sm">
                <Mail className="w-4 h-4 text-zinc-500" />
                <span>Dúvidas? Escreva para: <strong className="text-zinc-200">argente.ia@microsoft.com</strong></span>
              </div>
            </div>
          </div>

          {/* Interactive Visual Element (WhatsApp Simulator) */}
          <div className="lg:col-span-5 relative w-full max-w-md mx-auto">
            {/* Ambient glow behind widget */}
            <div className="absolute inset-0 bg-indigo-500/10 rounded-3xl blur-3xl pointer-events-none" />

            {/* Phone/WhatsApp Widget Frame */}
            <div className="relative border border-zinc-800 bg-zinc-950/80 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
              
              {/* WhatsApp-Style Header */}
              <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-600/30 flex items-center justify-center text-indigo-400 font-bold border border-indigo-500/20">
                    IA
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                      Agente IA <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    </h3>
                    <p className="text-[10px] text-zinc-400">Ativo no WhatsApp</p>
                  </div>
                </div>
                <div className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-zinc-800 border border-zinc-700 text-zinc-300">
                  ARgent.ai
                </div>
              </div>

              {/* Chat Body */}
              <div className="p-4 space-y-4 min-h-[300px] max-h-[340px] overflow-y-auto scrollbar-none flex flex-col justify-end bg-[radial-gradient(#1e1b4b_1px,transparent_1px)] [background-size:16px_16px]">
                <AnimatePresence>
                  {messages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 15, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.4 }}
                      className={`flex flex-col max-w-[85%] ${
                        msg.role === "user" ? "self-end items-end" : "self-start items-start"
                      }`}
                    >
                      {/* Badge / Sender */}
                      <span className="text-[9px] text-zinc-500 mb-1 px-1">
                        {msg.role === "user" ? "Cliente" : "Agente IA"}
                      </span>

                      {/* Bubble */}
                      <div
                        className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-md ${
                          msg.role === "user"
                            ? "bg-zinc-850 text-zinc-100 border border-zinc-750 rounded-tr-none"
                            : "bg-indigo-650 text-white rounded-tl-none font-medium"
                        }`}
                      >
                        {msg.content}
                      </div>

                      {/* Time */}
                      <span className="text-[9px] text-zinc-600 mt-1 px-1">
                        {msg.time}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Empty State / Typing simulator */}
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-600">
                    <MessageSquare className="w-8 h-8 mb-2 animate-bounce" />
                    <p className="text-xs">Iniciando demonstração do simulador...</p>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="bg-zinc-900 border-t border-zinc-800 p-3 flex gap-2">
                <input
                  type="text"
                  placeholder="Simulando conversa do cliente..."
                  disabled
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs flex-grow text-zinc-500 select-none outline-none"
                />
                <button disabled className="w-8 h-8 rounded-xl bg-zinc-850 flex items-center justify-center text-zinc-600 border border-zinc-800 select-none">
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Floating Visual Node Badges (Shows how the backend processes this) */}
            <div className="absolute -bottom-6 -left-6 bg-zinc-950/90 border border-zinc-800 p-2.5 rounded-xl shadow-lg flex items-center gap-2 text-[10px] text-zinc-300 backdrop-blur-sm">
              <div className="w-5 h-5 rounded bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Check className="w-3 h-3" />
              </div>
              <span>Disparador: WhatsApp</span>
            </div>

            <div className="absolute -top-4 -right-4 bg-zinc-950/90 border border-zinc-800 p-2.5 rounded-xl shadow-lg flex items-center gap-2 text-[10px] text-zinc-300 backdrop-blur-sm">
              <div className="w-5 h-5 rounded bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
                R
              </div>
              <span>RAG: Consulta da Base</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32" id="features">
        <div className="border-t border-zinc-900 pt-16">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl font-bold text-white">Equipado com tudo o que você precisa</h2>
            <p className="text-zinc-400">Nossa plataforma oferece recursos avançados para você modelar, alimentar e publicar seus agentes de IA de forma rápida.</p>
          </div>

          <div className="grid w-full grid-cols-1 gap-8 sm:grid-cols-3">
            {/* Feature 1 */}
            <div className="p-8 border rounded-3xl bg-zinc-950/40 border-zinc-900/60 backdrop-blur-sm hover:border-zinc-800 transition-all hover:scale-[1.02]">
              <div className="flex items-center justify-center w-12 h-12 mb-6 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="mb-3 text-xl font-semibold text-zinc-100">Templates Prontos</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Utilize agentes pré-configurados com prompts testados para cenários de vendas, atendimento e rotinas administrativas sem precisar começar do zero.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 border rounded-3xl bg-zinc-950/40 border-zinc-900/60 backdrop-blur-sm hover:border-zinc-800 transition-all hover:scale-[1.02]">
              <div className="flex items-center justify-center w-12 h-12 mb-6 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="mb-3 text-xl font-semibold text-zinc-100">Fluxos Visuais</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Crie a lógica do seu agente através de um editor visual intuitivo, conectando ferramentas de mensagens, bancos de dados RAG e habilidades de forma modular.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 border rounded-3xl bg-zinc-950/40 border-zinc-900/60 backdrop-blur-sm hover:border-zinc-800 transition-all hover:scale-[1.02]">
              <div className="flex items-center justify-center w-12 h-12 mb-6 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="mb-3 text-xl font-semibold text-zinc-100">Controle Total e Privacidade</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Acompanhe o histórico de mensagens das conversas em tempo real, modifique o comportamento do agente instantaneamente e tenha total segurança sobre seus dados.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
        <div className="border-t border-zinc-900 pt-16">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <h2 className="text-3xl font-bold text-white">Como funciona</h2>
            <p className="text-zinc-400">Do zero ao agente atendendo no WhatsApp em 4 passos simples.</p>
          </div>
          <div className="grid gap-8 md:grid-cols-4">
            {[
              { n: "1", t: "Crie o agente", d: "Escolha um template e ajuste a personalidade." },
              { n: "2", t: "Alimente com seus dados", d: "Suba PDFs e textos na base de conhecimento." },
              { n: "3", t: "Monte o fluxo", d: "Conecte gatilho, IA e ações no editor visual." },
              { n: "4", t: "Publique", d: "Conecte ao WhatsApp e comece a atender 24/7." },
            ].map((s) => (
              <div key={s.n} className="relative p-6 border rounded-2xl bg-zinc-950/40 border-zinc-900/60">
                <div className="flex items-center justify-center w-10 h-10 mb-4 text-lg font-bold rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {s.n}
                </div>
                <h3 className="mb-1.5 text-lg font-semibold text-zinc-100">{s.t}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/precos">
              <button className="px-8 py-3 font-semibold text-white transition-all bg-indigo-600 hover:bg-indigo-500 rounded-full shadow-lg shadow-indigo-500/20 hover:scale-105">
                Ver planos e preços
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
        <div className="border-t border-zinc-900 pt-16">
          <h2 className="mb-10 text-3xl font-bold text-center text-white">Perguntas frequentes</h2>
          <div className="space-y-4">
            {[
              { q: "Preciso saber programar?", a: "Não. Tudo é visual: você escolhe um template, escreve em português como o agente deve agir e pronto." },
              { q: "Como conecto ao WhatsApp?", a: "Na área de Integrações você conecta o número da sua empresa e o agente passa a responder automaticamente." },
              { q: "Posso usar minha própria chave da OpenAI?", a: "Sim. Em Configurações você cadastra sua chave e passa a consumir os seus próprios créditos." },
              { q: "Tem plano gratuito?", a: "Sim! Você cria agentes e bases de conhecimento de graça. Planos pagos liberam mais volume e integrações." },
            ].map((f, i) => (
              <details key={i} className="group rounded-xl border border-zinc-800 bg-zinc-950/50 p-5">
                <summary className="cursor-pointer list-none font-medium text-zinc-100 flex items-center justify-between">
                  {f.q}
                  <span className="text-zinc-500 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm text-zinc-400 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-zinc-500">
            Ainda com dúvidas? Fale com a gente: <a href="mailto:argente.ia@microsoft.com" className="text-indigo-400 hover:text-indigo-300">argente.ia@microsoft.com</a>
          </p>
        </div>
      </section>

      {/* Cookie Consent Banner */}
      {!cookieConsent && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-zinc-950 border-t border-zinc-900 text-zinc-300 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <p className="text-xs sm:text-sm text-center sm:text-left max-w-4xl text-zinc-400">
            A ARgent.ai utiliza cookies para melhorar a sua experiência, segurança e lhe entregar um conteúdo personalizado. Para saber mais acesse a nossa{" "}
            <a href="#" className="underline text-indigo-400 hover:text-indigo-300">política de privacidade</a>.
          </p>
          <button
            onClick={handleAcceptCookies}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-full text-xs sm:text-sm transition-all shadow-md shadow-indigo-500/10 hover:scale-105"
          >
            Entendi ✓
          </button>
        </div>
      )}
    </div>
  );
}
