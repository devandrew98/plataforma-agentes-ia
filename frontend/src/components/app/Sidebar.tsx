"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  BookOpen,
  Layers,
  Settings,
  GraduationCap,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldAlert,
} from "lucide-react";
import { motion } from "framer-motion";

const baseLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agentes", label: "Agentes", icon: Bot },
  { href: "/kb", label: "Knowledge Base", icon: BookOpen },
  { href: "/integracoes", label: "Integrações", icon: Layers },
  { href: "/tutorial", label: "Tutorial", icon: GraduationCap },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export default function Sidebar({
  collapsed = false,
  onToggle,
  isAdmin = false,
}: {
  collapsed?: boolean;
  onToggle?: () => void;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const links = isAdmin
    ? [...baseLinks, { href: "/admin", label: "Admin", icon: ShieldAlert }]
    : baseLinks;

  return (
    <nav className="flex flex-col h-[calc(100vh-6rem)] p-3 border bg-zinc-950/50 border-border/50 rounded-2xl backdrop-blur-xl sticky top-20">
      <div className={`mb-4 flex items-center ${collapsed ? "justify-center" : "justify-between px-2"}`}>
        {!collapsed && (
          <h2 className="text-xs font-semibold tracking-wider uppercase text-zinc-500">
            Plataforma
          </h2>
        )}
        <button
          onClick={onToggle}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      <div className="flex-1 space-y-1.5">
        {links.map((l) => {
          const active = pathname === l.href || pathname.startsWith(l.href + "/");
          const Icon = l.icon;

          return (
            <Link key={l.href} href={l.href} className="block relative" title={collapsed ? l.label : undefined}>
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl bg-indigo-500/10 border border-indigo-500/20"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <div
                className={`relative z-10 flex items-center rounded-xl text-sm transition-colors ${
                  collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"
                } ${
                  active
                    ? "text-indigo-400 font-medium"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!collapsed && l.label}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="pt-4 mt-auto border-t border-border/50">
        <div
          className={`flex items-center text-sm text-zinc-400 ${
            collapsed ? "justify-center" : "gap-3 px-3 py-2"
          }`}
          title={collapsed ? "API Online" : undefined}
        >
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          {!collapsed && "API Status: Online"}
        </div>
      </div>
    </nav>
  );
}
