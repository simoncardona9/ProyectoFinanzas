"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LogoutButton } from "./logout-button";

const sections = [
  ["/overview", "Resumen general", "◈"],
  ["/dashboard", "Panel mensual", "▦"],
  ["/transactions", "Movimientos", "⇄"],
  ["/structure", "Cuentas y categorías", "▤"],
  ["/obligations", "Obligaciones", "◷"],
  ["/invoices", "Facturas", "▧"],
  ["/debts", "Deudas", "◉"],
  ["/groceries", "Compras", "▣"],
  ["/exchange-rates", "Cotizaciones", "↗"],
  ["/financial-periods", "Períodos", "▦"],
  ["/imports", "Importaciones", "↓"],
  ["/reports/accounts-cash-flow", "Flujo de efectivo", "≋"],
  ["/reports/categories-tax", "Categorías e IVA", "▥"],
  ["/debt-report", "Reporte de deudas", "≡"],
  ["/reports/export", "Exportaciones", "↑"],
  ["/reports/audit-export", "Auditoría", "◎"],
  ["/settings", "Configuración", "⚙"],
] as const;

export function FinanceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/" || pathname === "/login") return children;
  const active = sections.find(
    ([href]) => pathname === href || pathname.startsWith(`${href}/`),
  );
  return (
    <div className="finance-shell">
      <a className="finance-skip" href="#finance-content">
        Saltar al contenido
      </a>
      <aside className="finance-sidebar">
        <Link href="/overview" className="finance-brand">
          <span className="finance-logo" aria-hidden="true">
            ▥
          </span>
          <span>
            Finanzas
            <span className="finance-brand-caption">ECONOMÍA DEL HOGAR</span>
          </span>
        </Link>
        <p className="finance-nav-label">TU ESPACIO FINANCIERO</p>
        <nav aria-label="Navegación principal">
          {sections.map(([href, label, icon]) => (
            <Link
              key={href}
              href={href}
              aria-current={active?.[0] === href ? "page" : undefined}
            >
              <span aria-hidden="true" className="finance-nav-icon">
                {icon}
              </span>
              {label}
            </Link>
          ))}
        </nav>
        <div className="finance-sidebar-note">
          <span className="finance-status-dot" />
          Una visión clara de tu hogar
          <p>Saldos y proyecciones, moneda por moneda.</p>
        </div>
      </aside>
      <div className="finance-workspace">
        <header className="finance-topbar">
          <span>
            Mi hogar <span aria-hidden="true">/</span>{" "}
            <strong>{active?.[1] ?? "Finanzas"}</strong>
          </span>
          <div className="finance-topbar-actions">
            <span className="finance-topbar-badge">UYU · USD</span>
            <LogoutButton />
          </div>
        </header>
        <div id="finance-content" tabIndex={-1}>
          {children}
        </div>
      </div>
    </div>
  );
}
