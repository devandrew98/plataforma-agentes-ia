"use client";

import { useRouter } from "next/navigation";
import { getSession, logout } from "@/src/lib/services/auth";
import { Button } from "@/components/ui/button";

export default function Topbar() {
  const router = useRouter();
  const session = getSession();

  return (
    <div className="flex items-center justify-between border-b px-4 py-3">
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 text-xs text-white">A</span>
          ARgent<span className="font-medium text-indigo-400">.ai</span>
        </div>
        <div className="text-xs text-muted-foreground">
          {session ? (
            <>
              {session.user.name} • {session.user.email}
            </>
          ) : (
            "Sem sessão"
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={() => {
            logout();
            router.replace("/login");
            router.refresh();
          }}
        >
          Sair
        </Button>
      </div>
    </div>
  );
}