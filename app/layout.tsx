import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Riachuelo NFC — Cadastro",
  robots: { index: false, follow: false }, // dados pessoais: fora de buscadores
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
