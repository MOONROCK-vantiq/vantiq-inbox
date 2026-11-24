import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VANTIQ — Inbox",
  description: "L'espace de travail intelligent de votre entreprise."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body>{children}</body></html>;
}