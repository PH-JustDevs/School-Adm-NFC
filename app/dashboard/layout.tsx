import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAction } from "@/app/actions/auth";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="topbar">
        <strong>Riachuelo NFC</strong>
        <Link href="/dashboard">Cadastros</Link>
        <Link href="/dashboard/new">Novo cadastro</Link>
        <Link href="/dashboard/import">Importar</Link>
        <form action={logoutAction}>
          <button type="submit" className="secondary">Sair</button>
        </form>
      </header>
      <main>{children}</main>
    </>
  );
}
