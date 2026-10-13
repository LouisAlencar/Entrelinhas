import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Entrelinhas — transforme leitura em aprendizado", description: "Seu espaço de estudo. Organize materiais, pratique com questões e aprenda com cada resposta. Demonstração de portfólio." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="pt-BR"><body>{children}</body></html>; }
