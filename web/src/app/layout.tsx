import type { Metadata } from "next";
import "./globals.css";
import { FinanceShell } from "@/shared/ui/finance-shell";
import { requireAuth } from "@/shared/auth/request-auth";

export const metadata: Metadata = {
  title: "Finanzas Familiares",
  description: "Control financiero para el hogar.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const context = await requireAuth().catch(() => null);
  const viewMode = context?.user.viewMode ?? "basic";
  return (
    <html lang="es-UY" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <FinanceShell
          key={viewMode}
          initialViewMode={viewMode}
          role={context?.membership.role}
        >
          {children}
        </FinanceShell>
      </body>
    </html>
  );
}
