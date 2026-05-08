import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Incubadora Platform - Arquitetura do Sistema",
  description: "Plataforma integrada de gestao e comunicacao para incubadoras de startups. Arquitetura agnostica com Kubernetes on VPS.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
