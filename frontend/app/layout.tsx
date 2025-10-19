import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import Navigation from "@/components/Navigation";
import AgentDebugPanel from "@/components/AgentDebugPanel";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ReputeFlow - Decentralized Work Platform",
  description: "AI-powered decentralized work platform with autonomous agents",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <Navigation />
          {children}
          <AgentDebugPanel />
        </Providers>
      </body>
    </html>
  );
}
