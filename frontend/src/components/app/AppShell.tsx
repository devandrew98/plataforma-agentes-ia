"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import TourOverlay from "./TourOverlay";
import EmailVerifyBanner from "./EmailVerifyBanner";
import { getMe } from "@/src/lib/services/profile";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);
  const [tourActive, setTourActive] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Carrega a preferência salva e colapsa automaticamente no Studio do agente
  // (onde o usuário precisa de mais espaço para montar o fluxo).
  useEffect(() => {
    const saved = localStorage.getItem("sidebar:collapsed");
    const isStudio = /^\/agentes\/[^/]+$/.test(pathname);
    setCollapsed(saved === "1" || isStudio);
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem("sidebar:collapsed", next ? "1" : "0");
      return next;
    });
  }

  // Tour interativo: disparado pelo botão "Começar agora" do Tutorial.
  useEffect(() => {
    const start = () => setTourActive(true);
    window.addEventListener("start-tour", start);
    return () => window.removeEventListener("start-tour", start);
  }, []);

  // Descobre se o usuário é admin (mostra o menu Admin).
  useEffect(() => {
    getMe().then((me) => setIsAdmin(!!me.is_admin)).catch(() => setIsAdmin(false));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Topbar />
      <div
        className={`mx-auto grid max-w-[1400px] grid-cols-1 gap-4 px-4 py-4 transition-[grid-template-columns] duration-200 ${
          collapsed ? "md:grid-cols-[76px_1fr]" : "md:grid-cols-[260px_1fr]"
        }`}
      >
        <aside className="hidden md:block">
          {ready && <Sidebar collapsed={collapsed} onToggle={toggle} isAdmin={isAdmin} />}
        </aside>
        <main className="min-w-0">
          <EmailVerifyBanner />
          {children}
        </main>
      </div>
      {tourActive && <TourOverlay onClose={() => setTourActive(false)} />}
    </div>
  );
}
