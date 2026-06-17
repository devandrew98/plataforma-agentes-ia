"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { X, ArrowRight, ArrowLeft, GraduationCap } from "lucide-react";

type Step = {
  path: string;
  selector?: string;
  title: string;
  body: string;
};

const STEPS: Step[] = [
  {
    path: "/dashboard",
    title: "Bem-vindo! 👋",
    body: "Vou te ensinar, passo a passo, como deixar seu agente de IA respondendo no WhatsApp. É fácil — pode seguir clicando em 'Próximo'.",
  },
  {
    path: "/dashboard",
    selector: '[data-tour="novo-agente"]',
    title: "1. Criar um agente",
    body: "Tudo começa aqui. Este botão cria um novo agente. Vamos lá!",
  },
  {
    path: "/agentes/novo",
    selector: '[data-tour="templates"]',
    title: "2. Escolher um modelo",
    body: "Clique em um modelo pronto (ex.: Assistente de Vendas). Ele já vem com um texto testado — depois é só ajustar.",
  },
  {
    path: "/agentes/novo",
    title: "3. Nome e personalidade",
    body: "Dê um nome ao agente e ajuste o 'Prompt de Sistema' (é a personalidade dele — quem ele é e como fala). Depois clique em 'Criar Agente'.",
  },
  {
    path: "/kb",
    selector: '[data-tour="nova-kb"]',
    title: "4. Ensinar com seus documentos",
    body: "Aqui você cria uma 'Base de Conhecimento' e sobe PDFs/textos. Assim o agente responde com as informações da SUA empresa. Não esqueça de clicar em 'Indexar'!",
  },
  {
    path: "/integracoes",
    selector: '[data-tour="whatsapp"]',
    title: "5. Conectar no WhatsApp",
    body: "Por fim, conecte um número de WhatsApp aqui. A partir daí, o agente responde seus clientes sozinho, 24h por dia. 🎉",
  },
  {
    path: "/dashboard",
    title: "Tudo pronto! 🚀",
    body: "Esse é o caminho completo: Criar → Ensinar → Conectar. Agora é com você! Você pode rever este tour quando quiser, no menu Tutorial.",
  },
];

export default function TourOverlay({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const current = STEPS[step];
  const onRightPage = pathname === current.path;

  // Navega para a página do passo atual, se necessário.
  useEffect(() => {
    if (!onRightPage) {
      router.push(current.path);
    }
  }, [step, onRightPage, current.path, router]);

  // Localiza o elemento destacado.
  useLayoutEffect(() => {
    if (!onRightPage || !current.selector) {
      setRect(null);
      return;
    }
    let tries = 0;
    let raf = 0;
    const find = () => {
      const el = document.querySelector(current.selector!) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        setRect(el.getBoundingClientRect());
      } else if (tries++ < 40) {
        raf = requestAnimationFrame(find);
      }
    };
    find();
    const onMove = () => {
      const el = document.querySelector(current.selector!) as HTMLElement | null;
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [step, onRightPage, current.selector]);

  function next() {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else finish();
  }
  function prev() {
    if (step > 0) setStep((s) => s - 1);
  }
  function finish() {
    onClose();
  }

  const pad = 8;
  const hasSpot = onRightPage && rect;

  // Posição do balão: abaixo do alvo, ou centralizado.
  const calloutStyle: React.CSSProperties = hasSpot
    ? {
        position: "fixed",
        top: Math.min(rect!.bottom + 14, window.innerHeight - 240),
        left: Math.min(Math.max(rect!.left, 16), window.innerWidth - 380),
        width: 360,
        zIndex: 10001,
      }
    : {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: 380,
        zIndex: 10001,
      };

  return (
    <>
      {/* Escurecido com "buraco" no alvo */}
      {hasSpot ? (
        <div
          style={{
            position: "fixed",
            top: rect!.top - pad,
            left: rect!.left - pad,
            width: rect!.width + pad * 2,
            height: rect!.height + pad * 2,
            borderRadius: 12,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.72)",
            border: "2px solid rgb(129,140,248)",
            zIndex: 10000,
            pointerEvents: "none",
            transition: "all 0.2s ease",
          }}
        />
      ) : (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 10000 }} />
      )}

      {/* Balão */}
      <div
        style={calloutStyle}
        className="rounded-2xl border border-indigo-500/30 bg-zinc-950 p-5 shadow-2xl"
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-indigo-400">
            <GraduationCap className="h-3.5 w-3.5" /> Tutorial · {step + 1}/{STEPS.length}
          </span>
          <button onClick={finish} className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200">
            <X className="h-4 w-4" />
          </button>
        </div>
        <h3 className="text-lg font-bold text-zinc-100">{current.title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{current.body}</p>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button onClick={finish} className="text-xs text-zinc-500 hover:text-zinc-300">
            Pular tutorial
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={prev}
                className="flex items-center gap-1 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Voltar
              </button>
            )}
            <button
              onClick={next}
              className="flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
            >
              {step === STEPS.length - 1 ? "Concluir" : "Próximo"} <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
