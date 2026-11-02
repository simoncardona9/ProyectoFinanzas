"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import type { Role, ViewMode } from "@/shared/auth/auth.types";
import { LogoutButton } from "./logout-button";

const basicSections = [
  ["/overview", "Resumen general", "◈"],
  ["/transactions", "Movimientos", "⇄"],
  ["/structure", "Cuentas y categorías", "▤"],
  ["/obligations", "Obligaciones", "◷"],
] as const;

const advancedSections = [
  ["/dashboard", "Panel mensual", "▦"],
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
] as const;

type ViewModeContextValue = {
  viewMode: ViewMode;
  changeViewMode: (mode: ViewMode) => Promise<void>;
  saving: boolean;
  error: string | null;
};
const ViewModeContext = createContext<ViewModeContextValue | null>(null);

export function useViewMode() {
  const context = useContext(ViewModeContext);
  if (!context) throw new Error("View mode is unavailable outside the app.");
  return context;
}

export function ViewModeSelect({ id }: { id: string }) {
  const { viewMode, changeViewMode, saving, error } = useViewMode();
  return (
    <div className="finance-view-mode">
      <label htmlFor={id}>Vista de la aplicación</label>
      <select
        id={id}
        value={viewMode}
        disabled={saving}
        onChange={(event) =>
          void changeViewMode(event.target.value as ViewMode)
        }
      >
        <option value="basic">Básica</option>
        <option value="advanced">Avanzada</option>
      </select>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}

export function FinanceShell({
  children,
  initialViewMode,
  role,
}: {
  children: ReactNode;
  initialViewMode: ViewMode;
  role?: Role;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [viewMode, setViewMode] = useState(initialViewMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function changeViewMode(mode: ViewMode) {
    if (mode === viewMode || saving) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/auth/view-mode", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ viewMode: mode }),
      });
      if (!response.ok) throw new Error("No se pudo guardar la vista.");
      setViewMode(mode);
      router.refresh();
    } catch {
      setError("No se pudo guardar la vista. Intenta nuevamente.");
    } finally {
      setSaving(false);
    }
  }

  if (pathname === "/" || pathname === "/login") return children;
  const sections = [...basicSections, ...advancedSections];
  const active = sections.find(
    ([href]) => pathname === href || pathname.startsWith(`${href}/`),
  );
  const renderSection = ([href, label, icon]: (typeof sections)[number]) => (
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
  );
  return (
    <ViewModeContext.Provider
      value={{ viewMode, changeViewMode, saving, error }}
    >
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
          <ViewModeSelect id="sidebar-view-mode" />
          <p className="finance-nav-label">TU ESPACIO FINANCIERO</p>
          <nav aria-label="Navegación principal">
            {basicSections.map(renderSection)}
            {viewMode === "advanced" &&
              advancedSections
                .filter(([href]) =>
                  href === "/reports/audit-export"
                    ? role === "owner" || role === "accountant"
                    : href === "/reports/export"
                      ? role === "owner" ||
                        role === "editor" ||
                        role === "accountant"
                      : true,
                )
                .map(renderSection)}
            <Link
              href="/settings"
              aria-current={pathname === "/settings" ? "page" : undefined}
            >
              <span aria-hidden="true" className="finance-nav-icon">
                ⚙
              </span>
              Configuración
            </Link>
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
    </ViewModeContext.Provider>
  );
}
