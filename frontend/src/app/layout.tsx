import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth-context";
import { Navbar } from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "InterviewLens AI — Multimodal AI Mock Interview Coach",
  description:
    "Analyze recorded interview videos, evaluate technical answers against rubrics, compute speaking analytics, and generate adaptive follow-up questions.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased flex flex-col">
        <AuthProvider>
          <Navbar />
          <main className="flex-1 flex flex-col">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
