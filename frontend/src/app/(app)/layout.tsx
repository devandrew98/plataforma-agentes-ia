import RequireAuth from "@/src/components/auth/RequireAuth";
import AppShell from "@/src/components/app/AppShell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}
